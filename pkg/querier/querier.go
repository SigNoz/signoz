package querier

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"golang.org/x/exp/maps"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type querier struct {
	logger            *slog.Logger
	telemetryStore    telemetrystore.TelemetryStore
	metadataStore     telemetrytypes.MetadataStore
	promEngine        prometheus.Prometheus
	traceStmtBuilder  qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	logStmtBuilder    qbtypes.StatementBuilder[qbtypes.LogAggregation]
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	bucketCache       BucketCache
}

var _ Querier = (*querier)(nil)

func New(
	settings factory.ProviderSettings,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine prometheus.Prometheus,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	logStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	bucketCache BucketCache,
) *querier {
	querierSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querier")
	return &querier{
		logger:            querierSettings.Logger(),
		telemetryStore:    telemetryStore,
		metadataStore:     metadataStore,
		promEngine:        promEngine,
		traceStmtBuilder:  traceStmtBuilder,
		logStmtBuilder:    logStmtBuilder,
		metricStmtBuilder: metricStmtBuilder,
		bucketCache:       bucketCache,
	}
}

func (q *querier) QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {

	queries := make(map[string]qbtypes.Query)
	steps := make(map[string]qbtypes.Step)

	for _, query := range req.CompositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypePromQL:
			promQuery, ok := query.Spec.(qbtypes.PromQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", query.Spec)
			}
			promqlQuery := newPromqlQuery(q.promEngine, promQuery, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
			queries[promQuery.Name] = promqlQuery
			steps[promQuery.Name] = promQuery.Step
		case qbtypes.QueryTypeClickHouseSQL:
			chQuery, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid clickhouse query spec %T", query.Spec)
			}
			chSQLQuery := newchSQLQuery(q.telemetryStore, chQuery, nil, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
			queries[chQuery.Name] = chSQLQuery
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.traceStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.logStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.metricStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			default:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported builder spec type %T", query.Spec)
			}
		}
	}
	return q.run(ctx, orgID, queries, req, steps)
}

func (q *querier) run(ctx context.Context, orgID valuer.UUID, qs map[string]qbtypes.Query, req *qbtypes.QueryRangeRequest, steps map[string]qbtypes.Step) (*qbtypes.QueryRangeResponse, error) {
	results := make(map[string]any)
	warnings := make([]string, 0)
	stats := qbtypes.ExecStats{}

	for name, query := range qs {
		// Skip cache if NoCache is set, or if cache is not available
		if req.NoCache || q.bucketCache == nil || query.Fingerprint() == "" {
			if req.NoCache {
				q.logger.DebugContext(ctx, "NoCache flag set, bypassing cache", "query", name)
			} else {
				q.logger.InfoContext(ctx, "no bucket cache or fingerprint, executing query", "fingerprint", query.Fingerprint())
			}
			result, err := query.Execute(ctx)
			if err != nil {
				return nil, err
			}
			results[name] = result.Value
			warnings = append(warnings, result.Warnings...)
			stats.RowsScanned += result.Stats.RowsScanned
			stats.BytesScanned += result.Stats.BytesScanned
			stats.DurationMS += result.Stats.DurationMS
		} else {
			result, err := q.executeWithCache(ctx, orgID, query, steps[name], req.NoCache)
			if err != nil {
				return nil, err
			}
			results[name] = result.Value
			warnings = append(warnings, result.Warnings...)
			stats.RowsScanned += result.Stats.RowsScanned
			stats.BytesScanned += result.Stats.BytesScanned
			stats.DurationMS += result.Stats.DurationMS
		}
	}

	return &qbtypes.QueryRangeResponse{
		Type: req.RequestType,
		Data: struct {
			Results  []any    `json:"results"`
			Warnings []string `json:"warnings"`
		}{
			Results:  maps.Values(results),
			Warnings: warnings,
		},
		Meta: struct {
			RowsScanned  uint64 `json:"rowsScanned"`
			BytesScanned uint64 `json:"bytesScanned"`
			DurationMS   uint64 `json:"durationMs"`
		}{
			RowsScanned:  stats.RowsScanned,
			BytesScanned: stats.BytesScanned,
			DurationMS:   stats.DurationMS,
		},
	}, nil
}

// executeWithCache executes a query using the bucket cache
func (q *querier) executeWithCache(ctx context.Context, orgID valuer.UUID, query qbtypes.Query, step qbtypes.Step, noCache bool) (*qbtypes.Result, error) {
	// Get cached data and missing ranges
	cachedResult, missingRanges := q.bucketCache.GetMissRanges(ctx, orgID, query, step)

	// If no missing ranges, return cached result
	if len(missingRanges) == 0 && cachedResult != nil {
		return cachedResult, nil
	}

	// If entire range is missing, execute normally
	if cachedResult == nil && len(missingRanges) == 1 {
		startMs, endMs := query.Window()
		if missingRanges[0].From == startMs && missingRanges[0].To == endMs {
			result, err := query.Execute(ctx)
			if err != nil {
				return nil, err
			}
			// Store in cache for future use
			q.bucketCache.Put(ctx, orgID, query, result)
			return result, nil
		}
	}

	// Execute queries for missing ranges with bounded parallelism
	freshResults := make([]*qbtypes.Result, len(missingRanges))
	errors := make([]error, len(missingRanges))
	totalStats := qbtypes.ExecStats{}

	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup

	for i, timeRange := range missingRanges {
		wg.Add(1)
		go func(idx int, tr *qbtypes.TimeRange) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			// Create a new query with the missing time range
			rangedQuery := q.createRangedQuery(query, *tr)
			if rangedQuery == nil {
				errors[idx] = fmt.Errorf("failed to create ranged query for range %d-%d", tr.From, tr.To)
				return
			}

			// Execute the ranged query
			result, err := rangedQuery.Execute(ctx)
			if err != nil {
				errors[idx] = err
				return
			}

			freshResults[idx] = result
		}(i, timeRange)
	}

	// Wait for all queries to complete
	wg.Wait()

	// Check for errors
	for _, err := range errors {
		if err != nil {
			// If any query failed, fall back to full execution
			q.logger.ErrorContext(ctx, "parallel query execution failed", "error", err)
			result, err := query.Execute(ctx)
			if err != nil {
				return nil, err
			}
			q.bucketCache.Put(ctx, orgID, query, result)
			return result, nil
		}
	}

	// Calculate total stats and filter out nil results
	validResults := make([]*qbtypes.Result, 0, len(freshResults))
	for _, result := range freshResults {
		if result != nil {
			validResults = append(validResults, result)
			totalStats.RowsScanned += result.Stats.RowsScanned
			totalStats.BytesScanned += result.Stats.BytesScanned
			totalStats.DurationMS += result.Stats.DurationMS
		}
	}
	freshResults = validResults

	// Merge cached and fresh results
	mergedResult := q.mergeResults(cachedResult, freshResults)
	mergedResult.Stats.RowsScanned += totalStats.RowsScanned
	mergedResult.Stats.BytesScanned += totalStats.BytesScanned
	mergedResult.Stats.DurationMS += totalStats.DurationMS

	// Store merged result in cache
	q.bucketCache.Put(ctx, orgID, query, mergedResult)

	return mergedResult, nil
}

// createRangedQuery creates a copy of the query with a different time range
func (q *querier) createRangedQuery(originalQuery qbtypes.Query, timeRange qbtypes.TimeRange) qbtypes.Query {
	switch qt := originalQuery.(type) {
	case *promqlQuery:
		return newPromqlQuery(q.promEngine, qt.query, timeRange, qt.requestType)
	case *chSQLQuery:
		return newchSQLQuery(q.telemetryStore, qt.query, qt.args, timeRange, qt.kind)
	case *builderQuery[qbtypes.TraceAggregation]:
		return newBuilderQuery(q.telemetryStore, q.traceStmtBuilder, qt.spec, timeRange, qt.kind)
	case *builderQuery[qbtypes.LogAggregation]:
		return newBuilderQuery(q.telemetryStore, q.logStmtBuilder, qt.spec, timeRange, qt.kind)
	case *builderQuery[qbtypes.MetricAggregation]:
		return newBuilderQuery(q.telemetryStore, q.metricStmtBuilder, qt.spec, timeRange, qt.kind)
	default:
		return nil
	}
}

// mergeResults merges cached result with fresh results
func (q *querier) mergeResults(cached *qbtypes.Result, fresh []*qbtypes.Result) *qbtypes.Result {
	if cached == nil && len(fresh) == 1 {
		return fresh[0]
	}

	// Start with cached result
	merged := &qbtypes.Result{
		Type:     cached.Type,
		Value:    cached.Value,
		Stats:    cached.Stats,
		Warnings: cached.Warnings,
	}

	// If no fresh results, return cached
	if len(fresh) == 0 {
		return merged
	}

	switch merged.Type {
	case qbtypes.RequestTypeTimeSeries:
		merged.Value = q.mergeTimeSeriesResults(cached.Value.(*qbtypes.TimeSeriesData), fresh)
	}

	if len(fresh) > 0 {
		totalWarnings := len(merged.Warnings)
		for _, result := range fresh {
			totalWarnings += len(result.Warnings)
		}

		allWarnings := make([]string, 0, totalWarnings)
		allWarnings = append(allWarnings, merged.Warnings...)
		for _, result := range fresh {
			allWarnings = append(allWarnings, result.Warnings...)
		}
		merged.Warnings = allWarnings
	}

	return merged
}

// mergeTimeSeriesResults merges time series data
func (q *querier) mergeTimeSeriesResults(cachedValue *qbtypes.TimeSeriesData, freshResults []*qbtypes.Result) *qbtypes.TimeSeriesData {

	// Map to store merged series by query name and series key
	seriesMap := make(map[int]map[string]*qbtypes.TimeSeries)

	for _, aggBucket := range cachedValue.Aggregations {
		if seriesMap[aggBucket.Index] == nil {
			seriesMap[aggBucket.Index] = make(map[string]*qbtypes.TimeSeries)
		}
		for _, series := range aggBucket.Series {
			key := qbtypes.GetUniqueSeriesKey(series.Labels)
			seriesMap[aggBucket.Index][key] = series
		}
	}

	// Add fresh series
	for _, result := range freshResults {
		freshTS, ok := result.Value.(*qbtypes.TimeSeriesData)
		if !ok {
			continue
		}

		for _, aggBucket := range freshTS.Aggregations {
			if seriesMap[aggBucket.Index] == nil {
				seriesMap[aggBucket.Index] = make(map[string]*qbtypes.TimeSeries)
			}
		}

		for _, aggBucket := range freshTS.Aggregations {
			for _, series := range aggBucket.Series {
				key := qbtypes.GetUniqueSeriesKey(series.Labels)

				if existingSeries, ok := seriesMap[aggBucket.Index][key]; ok {
					// Merge values
					existingSeries.Values = append(existingSeries.Values, series.Values...)
				} else {
					// New series
					seriesMap[aggBucket.Index][key] = series
				}
			}
		}
	}

	result := &qbtypes.TimeSeriesData{
		QueryName:    cachedValue.QueryName,
		Aggregations: []*qbtypes.AggregationBucket{},
	}

	for index, series := range seriesMap {
		var aggSeries []*qbtypes.TimeSeries
		for _, s := range series {
			// Sort values by timestamp
			slices.SortFunc(s.Values, func(a, b *qbtypes.TimeSeriesValue) int {
				if a.Timestamp < b.Timestamp {
					return -1
				}
				if a.Timestamp > b.Timestamp {
					return 1
				}
				return 0
			})
			aggSeries = append(aggSeries, s)
		}

		result.Aggregations = append(result.Aggregations, &qbtypes.AggregationBucket{
			Index:  index,
			Series: aggSeries,
		})
	}

	return result
}
