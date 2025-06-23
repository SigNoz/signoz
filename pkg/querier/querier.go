package querier

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
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

// extractShiftFromBuilderQuery extracts the shift value from timeShift function if present
func extractShiftFromBuilderQuery[T any](spec qbtypes.QueryBuilderQuery[T]) int64 {
	for _, fn := range spec.Functions {
		if fn.Name == qbtypes.FunctionNameTimeShift && len(fn.Args) > 0 {
			switch v := fn.Args[0].Value.(type) {
			case float64:
				return int64(v)
			case int64:
				return v
			case int:
				return int64(v)
			case string:
				if shiftFloat, err := strconv.ParseFloat(v, 64); err == nil {
					return int64(shiftFloat)
				}
			}
		}
	}
	return 0
}

// adjustTimeRangeForShift adjusts the time range based on the shift value from timeShift function
func adjustTimeRangeForShift[T any](spec qbtypes.QueryBuilderQuery[T], tr qbtypes.TimeRange, kind qbtypes.RequestType) qbtypes.TimeRange {
	// Only apply time shift for time series and scalar queries
	// Raw/list queries don't support timeshift
	if kind != qbtypes.RequestTypeTimeSeries && kind != qbtypes.RequestTypeScalar {
		return tr
	}

	// Use the ShiftBy field if it's already populated, otherwise extract it
	shiftBy := spec.ShiftBy
	if shiftBy == 0 {
		shiftBy = extractShiftFromBuilderQuery(spec)
	}

	if shiftBy == 0 {
		return tr
	}

	// ShiftBy is in seconds, convert to milliseconds and shift backward in time
	shiftMS := shiftBy * 1000
	return qbtypes.TimeRange{
		From: tr.From - uint64(shiftMS),
		To:   tr.To - uint64(shiftMS),
	}
}

func (q *querier) QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {

	tmplVars := req.Variables
	if tmplVars == nil {
		tmplVars = make(map[string]qbtypes.VariableItem)
	}

	// First pass: collect all metric names that need temporality
	metricNames := make([]string, 0)
	for idx, query := range req.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeBuilder {
			if spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]); ok {
				for _, agg := range spec.Aggregations {
					if agg.MetricName != "" {
						metricNames = append(metricNames, agg.MetricName)
					}
				}
			}
			// if step interval is not set, we set it ourselves with recommended value
			// if step interval is set to value which could result in points more than
			// allowed, we override it.
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.RecommendedStepInterval(req.Start, req.End)),
					}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepInterval(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.MinAllowedStepInterval(req.Start, req.End)),
					}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.RecommendedStepInterval(req.Start, req.End)),
					}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepInterval(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.MinAllowedStepInterval(req.Start, req.End)),
					}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.RecommendedStepIntervalForMetric(req.Start, req.End)),
					}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepIntervalForMetric(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{
						Duration: time.Second * time.Duration(querybuilder.MinAllowedStepIntervalForMetric(req.Start, req.End)),
					}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			}
		}
	}

	// Fetch temporality for all metrics at once
	var metricTemporality map[string]metrictypes.Temporality
	if len(metricNames) > 0 {
		var err error
		metricTemporality, err = q.metadataStore.FetchTemporalityMulti(ctx, metricNames...)
		if err != nil {
			q.logger.WarnContext(ctx, "failed to fetch metric temporality", "error", err, "metrics", metricNames)
			// Continue without temporality - statement builder will handle unspecified
			metricTemporality = make(map[string]metrictypes.Temporality)
		}
		q.logger.DebugContext(ctx, "fetched metric temporalities", "metric_temporality", metricTemporality)
	}

	queries := make(map[string]qbtypes.Query)
	steps := make(map[string]qbtypes.Step)

	for _, query := range req.CompositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypePromQL:
			promQuery, ok := query.Spec.(qbtypes.PromQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", query.Spec)
			}
			promqlQuery := newPromqlQuery(q.logger, q.promEngine, promQuery, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			queries[promQuery.Name] = promqlQuery
			steps[promQuery.Name] = promQuery.Step
		case qbtypes.QueryTypeClickHouseSQL:
			chQuery, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid clickhouse query spec %T", query.Spec)
			}
			chSQLQuery := newchSQLQuery(q.logger, q.telemetryStore, chQuery, nil, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			queries[chQuery.Name] = chSQLQuery
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.telemetryStore, q.traceStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.telemetryStore, q.logStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				for i := range spec.Aggregations {
					if spec.Aggregations[i].MetricName != "" && spec.Aggregations[i].Temporality == metrictypes.Unknown {
						if temp, ok := metricTemporality[spec.Aggregations[i].MetricName]; ok && temp != metrictypes.Unknown {
							spec.Aggregations[i].Temporality = temp
						}
					}
				}
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.telemetryStore, q.metricStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
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

	processedResults, err := q.postProcessResults(ctx, results, req)
	if err != nil {
		return nil, err
	}

	return &qbtypes.QueryRangeResponse{
		Type: req.RequestType,
		Data: struct {
			Results  []any    `json:"results"`
			Warnings []string `json:"warnings"`
		}{
			Results:  maps.Values(processedResults),
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
			q.bucketCache.Put(ctx, orgID, query, step, result)
			return result, nil
		}
	}

	// Execute queries for missing ranges with bounded parallelism
	freshResults := make([]*qbtypes.Result, len(missingRanges))
	errors := make([]error, len(missingRanges))
	totalStats := qbtypes.ExecStats{}

	q.logger.DebugContext(ctx, "executing queries for missing ranges",
		"missing_ranges_count", len(missingRanges),
		"ranges", missingRanges)

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
			q.bucketCache.Put(ctx, orgID, query, step, result)
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
	q.bucketCache.Put(ctx, orgID, query, step, mergedResult)

	return mergedResult, nil
}

// createRangedQuery creates a copy of the query with a different time range
func (q *querier) createRangedQuery(originalQuery qbtypes.Query, timeRange qbtypes.TimeRange) qbtypes.Query {
	switch qt := originalQuery.(type) {
	case *promqlQuery:
		return newPromqlQuery(q.logger, q.promEngine, qt.query, timeRange, qt.requestType, qt.vars)
	case *chSQLQuery:
		return newchSQLQuery(q.logger, q.telemetryStore, qt.query, qt.args, timeRange, qt.kind, qt.vars)
	case *builderQuery[qbtypes.TraceAggregation]:
		qt.spec.ShiftBy = extractShiftFromBuilderQuery(qt.spec)
		adjustedTimeRange := adjustTimeRangeForShift(qt.spec, timeRange, qt.kind)
		return newBuilderQuery(q.telemetryStore, q.traceStmtBuilder, qt.spec, adjustedTimeRange, qt.kind, qt.variables)
	case *builderQuery[qbtypes.LogAggregation]:
		qt.spec.ShiftBy = extractShiftFromBuilderQuery(qt.spec)
		adjustedTimeRange := adjustTimeRangeForShift(qt.spec, timeRange, qt.kind)
		return newBuilderQuery(q.telemetryStore, q.logStmtBuilder, qt.spec, adjustedTimeRange, qt.kind, qt.variables)
	case *builderQuery[qbtypes.MetricAggregation]:
		qt.spec.ShiftBy = extractShiftFromBuilderQuery(qt.spec)
		adjustedTimeRange := adjustTimeRangeForShift(qt.spec, timeRange, qt.kind)
		return newBuilderQuery(q.telemetryStore, q.metricStmtBuilder, qt.spec, adjustedTimeRange, qt.kind, qt.variables)
	default:
		return nil
	}
}

// mergeResults merges cached result with fresh results
func (q *querier) mergeResults(cached *qbtypes.Result, fresh []*qbtypes.Result) *qbtypes.Result {
	if cached == nil {
		if len(fresh) == 1 {
			return fresh[0]
		}
		if len(fresh) == 0 {
			return nil
		}
		// If cached is nil but we have multiple fresh results, we need to merge them
		// We need to merge all fresh results properly to avoid duplicates
		merged := &qbtypes.Result{
			Type:     fresh[0].Type,
			Stats:    fresh[0].Stats,
			Warnings: fresh[0].Warnings,
		}

		// Merge all fresh results including the first one
		switch merged.Type {
		case qbtypes.RequestTypeTimeSeries:
			// Pass nil as cached value to ensure proper merging of all fresh results
			merged.Value = q.mergeTimeSeriesResults(nil, fresh)
		}

		return merged
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

	// Map to store merged series by aggregation index and series key
	seriesMap := make(map[int]map[string]*qbtypes.TimeSeries)
	// Map to store aggregation bucket metadata
	bucketMetadata := make(map[int]*qbtypes.AggregationBucket)

	// Process cached data if available
	if cachedValue != nil && cachedValue.Aggregations != nil {
		for _, aggBucket := range cachedValue.Aggregations {
			if seriesMap[aggBucket.Index] == nil {
				seriesMap[aggBucket.Index] = make(map[string]*qbtypes.TimeSeries)
			}
			if bucketMetadata[aggBucket.Index] == nil {
				bucketMetadata[aggBucket.Index] = aggBucket
			}
			for _, series := range aggBucket.Series {
				key := qbtypes.GetUniqueSeriesKey(series.Labels)
				if existingSeries, ok := seriesMap[aggBucket.Index][key]; ok {
					// Merge values from duplicate series in cached data, avoiding duplicate timestamps
					timestampMap := make(map[int64]bool)
					for _, v := range existingSeries.Values {
						timestampMap[v.Timestamp] = true
					}

					// Only add values with new timestamps
					for _, v := range series.Values {
						if !timestampMap[v.Timestamp] {
							existingSeries.Values = append(existingSeries.Values, v)
						}
					}
				} else {
					// Create a copy to avoid modifying the cached data
					seriesCopy := &qbtypes.TimeSeries{
						Labels: series.Labels,
						Values: make([]*qbtypes.TimeSeriesValue, len(series.Values)),
					}
					copy(seriesCopy.Values, series.Values)
					seriesMap[aggBucket.Index][key] = seriesCopy
				}
			}
		}
	}

	// Add fresh series
	for _, result := range freshResults {
		freshTS, ok := result.Value.(*qbtypes.TimeSeriesData)
		if !ok || freshTS == nil || freshTS.Aggregations == nil {
			continue
		}

		for _, aggBucket := range freshTS.Aggregations {
			if seriesMap[aggBucket.Index] == nil {
				seriesMap[aggBucket.Index] = make(map[string]*qbtypes.TimeSeries)
			}
			// Prefer fresh metadata over cached metadata
			if aggBucket.Alias != "" || aggBucket.Meta.Unit != "" {
				bucketMetadata[aggBucket.Index] = aggBucket
			} else if bucketMetadata[aggBucket.Index] == nil {
				bucketMetadata[aggBucket.Index] = aggBucket
			}
		}

		for _, aggBucket := range freshTS.Aggregations {
			for _, series := range aggBucket.Series {
				key := qbtypes.GetUniqueSeriesKey(series.Labels)

				if existingSeries, ok := seriesMap[aggBucket.Index][key]; ok {
					// Merge values, avoiding duplicate timestamps
					// Create a map to track existing timestamps
					timestampMap := make(map[int64]bool)
					for _, v := range existingSeries.Values {
						timestampMap[v.Timestamp] = true
					}

					// Only add values with new timestamps
					for _, v := range series.Values {
						if !timestampMap[v.Timestamp] {
							existingSeries.Values = append(existingSeries.Values, v)
						}
					}
				} else {
					// New series
					seriesMap[aggBucket.Index][key] = series
				}
			}
		}
	}

	result := &qbtypes.TimeSeriesData{
		Aggregations: []*qbtypes.AggregationBucket{},
	}

	// Set QueryName from cached or first fresh result
	if cachedValue != nil {
		result.QueryName = cachedValue.QueryName
	} else if len(freshResults) > 0 {
		if freshTS, ok := freshResults[0].Value.(*qbtypes.TimeSeriesData); ok && freshTS != nil {
			result.QueryName = freshTS.QueryName
		}
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

		// Preserve bucket metadata from either cached or fresh results
		bucket := &qbtypes.AggregationBucket{
			Index:  index,
			Series: aggSeries,
		}
		if metadata, ok := bucketMetadata[index]; ok {
			bucket.Alias = metadata.Alias
			bucket.Meta = metadata.Meta
		}

		result.Aggregations = append(result.Aggregations, bucket)
	}

	return result
}
