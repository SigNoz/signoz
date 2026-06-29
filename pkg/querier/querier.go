package querier

import (
	"context"
	"fmt"
	"log/slog"
	gomaps "maps"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dustin/go-humanize"
	"golang.org/x/exp/maps"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	intervalWarn = "Query %s is requesting aggregation interval %v seconds, which is smaller than the minimum allowed interval of %v seconds for selected time range. Using the minimum instead"
)

type querier struct {
	logger                    *slog.Logger
	fl                        flagger.Flagger
	telemetryStore            telemetrystore.TelemetryStore
	metadataStore             telemetrytypes.MetadataStore
	promEngine                prometheus.Prometheus
	traceStmtBuilder          qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	logStmtBuilder            qbtypes.StatementBuilder[qbtypes.LogAggregation]
	auditStmtBuilder          qbtypes.StatementBuilder[qbtypes.LogAggregation]
	metricStmtBuilder         qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	meterStmtBuilder          qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	traceOperatorStmtBuilder  qbtypes.TraceOperatorStatementBuilder
	bucketCache               BucketCache
	liveDataRefresh           time.Duration
	builderConfig             builderConfig
}

var _ Querier = (*querier)(nil)

func New(
	settings factory.ProviderSettings,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine prometheus.Prometheus,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	logStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	auditStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	meterStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	traceOperatorStmtBuilder qbtypes.TraceOperatorStatementBuilder,
	bucketCache BucketCache,
	flagger flagger.Flagger,
	logTraceIDWindowPadding time.Duration,
) *querier {
	querierSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querier")
	return &querier{
		logger:                    querierSettings.Logger(),
		fl:                        flagger,
		telemetryStore:            telemetryStore,
		metadataStore:             metadataStore,
		promEngine:                promEngine,
		traceStmtBuilder:          traceStmtBuilder,
		logStmtBuilder:            logStmtBuilder,
		auditStmtBuilder:          auditStmtBuilder,
		metricStmtBuilder:         metricStmtBuilder,
		meterStmtBuilder:          meterStmtBuilder,
		traceOperatorStmtBuilder:  traceOperatorStmtBuilder,
		bucketCache:               bucketCache,
		liveDataRefresh:           5 * time.Second,
		builderConfig: builderConfig{
			logTraceIDWindowPaddingMS: uint64(logTraceIDWindowPadding.Milliseconds()),
		},
	}
}

func (q *querier) QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {

	// Coerce the window to epoch milliseconds up front so every downstream
	// consumer (TimeRange, narrowWindowByTraceID, step interval, etc.) can
	// safely assume ms regardless of the resolution the caller sent.
	req.Start = querybuilder.ToMilliSecs(req.Start)
	req.End = querybuilder.ToMilliSecs(req.End)

	event := &qbtypes.QBEvent{
		Version:         "v5",
		NumberOfQueries: len(req.CompositeQuery.Queries),
		PanelType:       req.RequestType.StringValue(),
	}
	q.populateQBEvent(event, req.CompositeQuery.Queries)

	// TraceOperatorQuery leverages other queries defined in the rangeRequest
	// Eg: C := A => B
	// Need to create dependency map { "A": true, "B": true }
	dependencyQueries, err := q.constructTraceOperatorDependencyMap(req.CompositeQuery.Queries)
	if err != nil {
		return nil, err
	}

	// Step interval is the aggregation parameter for timeseries requests.
	// We need to set if it is unspecified or adjust it if value is not within recommended range
	intervalWarnings := q.adjustStepInterval(req.CompositeQuery.Queries, req.Start, req.End)

	missingMetricQueries, metricWarnings, err := q.resolveMetricMetadata(ctx, orgID, req.CompositeQuery.Queries, req.Start, req.End)
	if err != nil {
		return nil, err
	}
	missingMetricQuerySet := make(map[string]bool, len(missingMetricQueries))
	for _, name := range missingMetricQueries {
		missingMetricQuerySet[name] = true
	}

	queries, steps, err := q.buildQueries(req, dependencyQueries, missingMetricQuerySet, event)
	if err != nil {
		return nil, err
	}

	preseededResults := make(map[string]any)
	for _, name := range missingMetricQueries {
		switch req.RequestType {
		case qbtypes.RequestTypeTimeSeries:
			preseededResults[name] = &qbtypes.TimeSeriesData{QueryName: name}
		case qbtypes.RequestTypeScalar:
			preseededResults[name] = &qbtypes.ScalarData{QueryName: name}
		case qbtypes.RequestTypeRaw:
			preseededResults[name] = &qbtypes.RawData{QueryName: name}
		}
	}
	qbResp, qbErr := q.run(ctx, orgID, queries, req, steps, event, preseededResults)
	if qbResp != nil {
		qbResp.QBEvent = event
		if len(intervalWarnings) != 0 && req.RequestType == qbtypes.RequestTypeTimeSeries {
			if qbResp.Warning == nil {
				qbResp.Warning = &qbtypes.QueryWarnData{
					Warnings: make([]qbtypes.QueryWarnDataAdditional, len(intervalWarnings)),
				}
				for idx := range intervalWarnings {
					qbResp.Warning.Warnings[idx] = qbtypes.QueryWarnDataAdditional{Message: intervalWarnings[idx]}
				}
			}
		}
		if len(metricWarnings) > 0 {
			if qbResp.Warning == nil {
				qbResp.Warning = &qbtypes.QueryWarnData{}
			}
			for _, w := range metricWarnings {
				qbResp.Warning.Warnings = append(qbResp.Warning.Warnings, qbtypes.QueryWarnDataAdditional{
					Message: w,
				})
			}
		}
	}
	return qbResp, qbErr
}

func (q *querier) buildQueries(
	req *qbtypes.QueryRangeRequest,
	dependencyQueries map[string]bool,
	missingMetricQuerySet map[string]bool,
	event *qbtypes.QBEvent,
) (map[string]qbtypes.Query, map[string]qbtypes.Step, error) {

	tmplVars := req.Variables
	if tmplVars == nil {
		tmplVars = make(map[string]qbtypes.VariableItem)
	}

	queries := make(map[string]qbtypes.Query)
	steps := make(map[string]qbtypes.Step)

	for _, query := range req.CompositeQuery.Queries {
		queryName := query.GetQueryName()

		// skip if it is dependecy of traceOperatorQuery
		if query.GetType() != qbtypes.QueryTypeTraceOperator && dependencyQueries[queryName] {
			continue
		}

		switch query.Type {
		case qbtypes.QueryTypePromQL:
			promQuery, ok := query.Spec.(qbtypes.PromQuery)
			if !ok {
				return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", query.Spec)
			}
			promqlQuery := newPromqlQuery(q.logger, q.promEngine, promQuery, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			queries[promQuery.Name] = promqlQuery
			steps[promQuery.Name] = promQuery.Step
		case qbtypes.QueryTypeClickHouseSQL:
			chQuery, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid clickhouse query spec %T", query.Spec)
			}
			chSQLQuery := newchSQLQuery(q.logger, q.telemetryStore, chQuery, nil, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			queries[chQuery.Name] = chSQLQuery
		case qbtypes.QueryTypeTraceOperator:
			traceOpQuery, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator)
			if !ok {
				return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid trace operator query spec %T", query.Spec)
			}
			toq := &traceOperatorQuery{
				telemetryStore: q.telemetryStore,
				stmtBuilder:    q.traceOperatorStmtBuilder,
				spec:           traceOpQuery,
				compositeQuery: &req.CompositeQuery,
				fromMS:         uint64(req.Start),
				toMS:           uint64(req.End),
				kind:           req.RequestType,
			}
			queries[traceOpQuery.Name] = toq
			steps[traceOpQuery.Name] = traceOpQuery.StepInterval
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.logger, q.telemetryStore, q.traceStmtBuilder, spec, timeRange, req.RequestType, tmplVars, builderConfig{})
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				stmtBuilder := q.logStmtBuilder
				if spec.Source == telemetrytypes.SourceAudit {
					stmtBuilder = q.auditStmtBuilder
				}
				bq := newBuilderQuery(q.logger, q.telemetryStore, stmtBuilder, spec, timeRange, req.RequestType, tmplVars, q.builderConfig)
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				// Spec was already patched by resolveMetricMetadata. Queries
				// whose every aggregation was missing live in
				// missingMetricQuerySet and produce empty preseeded results
				// rather than running here.
				if missingMetricQuerySet[spec.Name] {
					continue
				}
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				var bq *builderQuery[qbtypes.MetricAggregation]

				if spec.Source == telemetrytypes.SourceMeter {
					event.Source = telemetrytypes.SourceMeter.StringValue()
					bq = newBuilderQuery(q.logger, q.telemetryStore, q.meterStmtBuilder, spec, timeRange, req.RequestType, tmplVars, builderConfig{})
				} else {
					bq = newBuilderQuery(q.logger, q.telemetryStore, q.metricStmtBuilder, spec, timeRange, req.RequestType, tmplVars, builderConfig{})
				}

				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			default:
				return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported builder spec type %T", query.Spec)
			}
		}
	}

	return queries, steps, nil
}

func (q *querier) populateQBEvent(event *qbtypes.QBEvent, queries []qbtypes.QueryEnvelope) {
	for _, query := range queries {
		// BUG: QueryType doesn't make sense as range_request can have multiple query types.
		event.QueryType = query.Type.StringValue()

		switch query.Type {
		case qbtypes.QueryTypeBuilder:
			filter := query.GetFilter()
			event.FilterApplied = event.FilterApplied || (filter != nil && filter.Expression != "")
			event.GroupByApplied = event.GroupByApplied || len(query.GetGroupBy()) > 0
			switch query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				event.TracesUsed = true
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				event.LogsUsed = true
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				event.MetricsUsed = true
			}
		case qbtypes.QueryTypePromQL:
			event.MetricsUsed = true
		case qbtypes.QueryTypeTraceOperator:
			event.TracesUsed = true
		case qbtypes.QueryTypeClickHouseSQL:
			sql := query.GetQuery()
			if strings.TrimSpace(sql) != "" {
				event.MetricsUsed = strings.Contains(sql, "signoz_metrics")
				event.LogsUsed = strings.Contains(sql, "signoz_logs")
				event.TracesUsed = strings.Contains(sql, "signoz_traces")
			}
		}
	}
}

// resolveMetricMetadata fetches metadata for every metric referenced by builder
// metric-aggregation queries, patches each query's aggregations in place with
// the resolved values, and classifies any metric that could not be resolved.
//
// Side effects on queries:
//   - Aggregations with Unknown Temporality / UnspecifiedType are filled in from
//     the metadata store.
//   - Aggregations whose Type is still UnspecifiedType after the patch are
//     dropped from the spec.
//   - Queries whose entire aggregation list was dropped are NOT patched and are
//     surfaced via the returned missingMetricQueries; the caller should skip
//     them.
//
// Returns:
//   - missingMetricQueries: names of queries whose every aggregation was
//     missing. Used downstream to preseed empty result placeholders so the
//     response still has an entry per requested query name.
//   - metricWarnings: human-readable warnings for metrics that could not be
//     resolved: never-seen metrics and dormant metrics (seen but no data in
//     the query window).
//   - err: Internal when a metadata fetch fails.
func (q *querier) resolveMetricMetadata(ctx context.Context, orgID valuer.UUID, queries []qbtypes.QueryEnvelope, start, end uint64) (missingMetricQueries []string, metricWarnings []string, err error) {
	metricNames := make([]string, 0)
	for idx := range queries {
		if queries[idx].Type != qbtypes.QueryTypeBuilder {
			continue
		}
		spec, ok := queries[idx].Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation])
		if !ok {
			continue
		}
		for _, agg := range spec.Aggregations {
			if agg.MetricName != "" {
				metricNames = append(metricNames, agg.MetricName)
			}
		}
	}

	if len(metricNames) == 0 {
		return nil, nil, nil
	}

	metricTemporality, metricTypes, reducedMetricsSet, err := q.metadataStore.FetchTemporalityAndTypeMulti(ctx, orgID, start, end, metricNames...)
	if err != nil {
		q.logger.WarnContext(ctx, "failed to fetch metric temporality", errors.Attr(err), slog.Any("metrics", metricNames))
		return nil, nil, errors.NewInternalf(errors.CodeInternal, "failed to fetch metrics temporality")
	}
	q.logger.DebugContext(ctx, "fetched metric temporalities and types", slog.Any("metric_temporality", metricTemporality), slog.Any("metric_types", metricTypes))

	missingMetrics := []string{}
	for idx := range queries {
		if queries[idx].Type != qbtypes.QueryTypeBuilder {
			continue
		}
		spec, ok := queries[idx].Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation])
		if !ok {
			continue
		}

		presentAggregations := make([]qbtypes.MetricAggregation, 0, len(spec.Aggregations))
		for i := range spec.Aggregations {
			if spec.Aggregations[i].MetricName != "" && spec.Aggregations[i].Temporality == metrictypes.Unknown {
				if temp, ok := metricTemporality[spec.Aggregations[i].MetricName]; ok && temp != metrictypes.Unknown {
					spec.Aggregations[i].Temporality = temp
				}
			}
			if spec.Aggregations[i].MetricName != "" && spec.Aggregations[i].Type == metrictypes.UnspecifiedType {
				if foundMetricType, ok := metricTypes[spec.Aggregations[i].MetricName]; ok && foundMetricType != metrictypes.UnspecifiedType {
					spec.Aggregations[i].Type = foundMetricType
				}
			}
			if spec.Aggregations[i].Type == metrictypes.UnspecifiedType {
				missingMetrics = append(missingMetrics, spec.Aggregations[i].MetricName)
				continue
			}
			// Type is resolved now; validate aggregation compatibility against it.
			if err := spec.Aggregations[i].ValidateForType(); err != nil {
				return nil, nil, err
			}
			if reducedMetricsSet[spec.Aggregations[i].MetricName] {
				spec.Aggregations[i].Reduced = true
			}
			presentAggregations = append(presentAggregations, spec.Aggregations[i])
		}
		if len(presentAggregations) == 0 {
			missingMetricQueries = append(missingMetricQueries, spec.Name)
			continue
		}
		spec.Aggregations = presentAggregations
		queries[idx].Spec = spec
	}

	if len(missingMetrics) == 0 {
		return missingMetricQueries, nil, nil
	}

	isInternalMetric := func(n string) bool { return strings.HasPrefix(n, "signoz.") || strings.HasPrefix(n, "signoz_") }
	externalMissingMetrics := make([]string, 0, len(missingMetrics))
	for _, m := range missingMetrics {
		if !isInternalMetric(m) {
			externalMissingMetrics = append(externalMissingMetrics, m)
		}
	}
	if len(externalMissingMetrics) == 0 {
		return missingMetricQueries, nil, nil
	}

	// Classify each missing metric: never-seen -> warning with empty result;
	// seen-but-no-data-in-window -> dormant warning.
	lastSeenInfo, _ := q.metadataStore.FetchLastSeenInfoMulti(ctx, externalMissingMetrics...)
	var nonExistentMetrics []string
	var dormantMetrics []string
	for _, name := range externalMissingMetrics {
		if ts, ok := lastSeenInfo[name]; ok && ts > 0 {
			dormantMetrics = append(dormantMetrics, name)
			continue
		}
		nonExistentMetrics = append(nonExistentMetrics, name)
	}

	var warnings []string

	// Never-seen metrics: the query already gets a preseeded empty result
	// via the aggregation-dropping path above; we just attach a warning.
	if len(nonExistentMetrics) == 1 {
		warnings = append(warnings, fmt.Sprintf("metric %s has never been received. Check the metric name and instrumentation", nonExistentMetrics[0]))
	} else if len(nonExistentMetrics) > 1 {
		warnings = append(warnings, fmt.Sprintf("the following metrics have never been received. Check the metric names and instrumentation: %s", strings.Join(nonExistentMetrics, ", ")))
	}

	// Dormant metrics: seen before but no data in the query window.
	lastSeenStr := func(name string) string {
		if ts, ok := lastSeenInfo[name]; ok && ts > 0 {
			ago := humanize.RelTime(time.UnixMilli(ts), time.Now(), "ago", "from now")
			return fmt.Sprintf("%s (last seen %s)", name, ago)
		}
		return name
	}
	if len(dormantMetrics) == 1 {
		warnings = append(warnings, fmt.Sprintf("no data found for the metric %s in the query time range", lastSeenStr(dormantMetrics[0])))
	} else if len(dormantMetrics) > 1 {
		parts := make([]string, len(dormantMetrics))
		for i, m := range dormantMetrics {
			parts[i] = lastSeenStr(m)
		}
		warnings = append(warnings, fmt.Sprintf("no data found for the following metrics in the query time range: %s", strings.Join(parts, ", ")))
	}
	return missingMetricQueries, warnings, nil
}

func (q *querier) QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream) {

	// Coerce the window to epoch milliseconds up front (End may be 0 for the
	// open-ended stream, which ToMilliSecs leaves untouched).
	req.Start = querybuilder.ToMilliSecs(req.Start)
	req.End = querybuilder.ToMilliSecs(req.End)

	event := &qbtypes.QBEvent{
		Version:         "v5",
		NumberOfQueries: len(req.CompositeQuery.Queries),
		PanelType:       req.RequestType.StringValue(),
	}

	for _, query := range req.CompositeQuery.Queries {
		event.QueryType = query.Type.StringValue()
		if query.Type == qbtypes.QueryTypeBuilder {
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				event.FilterApplied = spec.Filter != nil && spec.Filter.Expression != ""
			default:
				// return if it's not log aggregation
				client.Error <- errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported builder spec type %T", query.Spec)
				return
			}
		} else {
			// return if it's not of type query builder
			client.Error <- errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %s", query.Type)
			return
		}
	}

	queries := make(map[string]qbtypes.Query)
	query := req.CompositeQuery.Queries[0]
	spec := query.Spec.(qbtypes.QueryBuilderQuery[qbtypes.LogAggregation])
	// add the new id to the id filter
	if spec.Filter == nil || spec.Filter.Expression == "" {
		spec.Filter = &qbtypes.Filter{Expression: "id > $id"}
	} else {
		spec.Filter.Expression = fmt.Sprintf("%s and id > $id", spec.Filter.Expression)
	}

	tsStart := req.Start
	if tsStart == 0 {
		tsStart = uint64(time.Now().UnixNano())
	} else {
		tsStart = uint64(utils.GetEpochNanoSecs(int64(tsStart)))
	}
	updatedLogID := ""

	ticker := time.NewTicker(q.liveDataRefresh)
	defer ticker.Stop()

	// we are creating a custom ticker wrapper to trigger it instantly
	tick := make(chan time.Time, 1)
	tick <- time.Now() // initial tick
	go func() {
		for t := range ticker.C {
			tick <- t
		}
	}()

	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			return
		case <-tick:
			// timestamp end is not specified here
			timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: tsStart}, req.RequestType)
			liveTailStmtBuilder := q.logStmtBuilder
			if spec.Source == telemetrytypes.SourceAudit {
				liveTailStmtBuilder = q.auditStmtBuilder
			}
			bq := newBuilderQuery(q.logger, q.telemetryStore, liveTailStmtBuilder, spec, timeRange, req.RequestType, map[string]qbtypes.VariableItem{
				"id": {
					Value: updatedLogID,
				},
			}, q.builderConfig)
			queries[spec.Name] = bq

			qbResp, qbErr := q.run(ctx, orgID, queries, req, nil, event, nil)
			if qbErr != nil {
				client.Error <- qbErr
				return
			}

			if qbResp == nil || len(qbResp.Data.Results) == 0 || qbResp.Data.Results[0] == nil {
				continue
			}
			data := qbResp.Data.Results[0].(*qbtypes.RawData)
			for i := len(data.Rows) - 1; i >= 0; i-- {
				client.Logs <- data.Rows[i]
				if i == 0 {
					tsStart = uint64(data.Rows[i].Timestamp.UnixNano())
					updatedLogID = data.Rows[i].Data["id"].(string)
				}
			}

		}
	}
}

func (q *querier) run(
	ctx context.Context,
	orgID valuer.UUID,
	qs map[string]qbtypes.Query,
	req *qbtypes.QueryRangeRequest,
	steps map[string]qbtypes.Step,
	qbEvent *qbtypes.QBEvent,
	preseededResults map[string]any,
) (*qbtypes.QueryRangeResponse, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.PanelType: qbEvent.PanelType,
		instrumentationtypes.QueryType: qbEvent.QueryType,
	})

	results := make(map[string]any)
	warnings := make([]string, 0)
	warningsDocURL := ""
	stats := qbtypes.ExecStats{}

	hasData := func(result *qbtypes.Result) bool {
		if result == nil || result.Value == nil {
			return false
		}
		switch result.Type {
		case qbtypes.RequestTypeScalar:
			if val, ok := result.Value.(*qbtypes.ScalarData); ok && val != nil {
				return len(val.Data) != 0
			}
		case qbtypes.RequestTypeRaw:
			if val, ok := result.Value.(*qbtypes.RawData); ok && val != nil {
				return len(val.Rows) != 0
			}
		case qbtypes.RequestTypeTimeSeries:
			if val, ok := result.Value.(*qbtypes.TimeSeriesData); ok && val != nil {
				if len(val.Aggregations) != 0 {
					anyNonEmpty := false
					for _, aggBucket := range val.Aggregations {
						if len(aggBucket.Series) != 0 {
							anyNonEmpty = true
							break
						}
					}
					return anyNonEmpty
				}
				return false
			}
		}
		return false
	}

	for name, query := range qs {
		// Skip cache if NoCache is set, or if cache is not available
		if req.NoCache || q.bucketCache == nil || query.Fingerprint() == "" {
			if req.NoCache {
				q.logger.DebugContext(ctx, "NoCache flag set, bypassing cache", slog.String("query", name))
			} else {
				q.logger.InfoContext(ctx, "no bucket cache or fingerprint, executing query", slog.String("fingerprint", query.Fingerprint()))
			}
			result, err := query.Execute(ctx)
			qbEvent.HasData = qbEvent.HasData || hasData(result)
			if err != nil {
				return nil, err
			}
			results[name] = result.Value
			warnings = append(warnings, result.Warnings...)
			warningsDocURL = result.WarningsDocURL
			stats.RowsScanned += result.Stats.RowsScanned
			stats.BytesScanned += result.Stats.BytesScanned
			stats.DurationMS += result.Stats.DurationMS
		} else {
			result, err := q.executeWithCache(ctx, orgID, query, steps[name], req.NoCache)
			qbEvent.HasData = qbEvent.HasData || hasData(result)
			if err != nil {
				return nil, err
			}
			switch v := result.Value.(type) {
			case *qbtypes.TimeSeriesData:
				v.QueryName = name
			case *qbtypes.ScalarData:
				v.QueryName = name
			case *qbtypes.RawData:
				v.QueryName = name
			}

			results[name] = result.Value
			warnings = append(warnings, result.Warnings...)
			warningsDocURL = result.WarningsDocURL
			stats.RowsScanned += result.Stats.RowsScanned
			stats.BytesScanned += result.Stats.BytesScanned
			stats.DurationMS += result.Stats.DurationMS
		}
	}

	gomaps.Copy(results, preseededResults)
	processedResults, err := q.postProcessResults(ctx, orgID, results, req)
	if err != nil {
		return nil, err
	}

	// attach step interval to metadata so client can make informed decisions, ex: width of the bar
	// or go to related logs/traces from a point in line/bar chart with correct time range
	stepIntervals := make(map[string]uint64, len(steps))
	for name, step := range steps {
		stepIntervals[name] = uint64(step.Seconds())
	}
	for _, query := range req.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeFormula {
			if formula, ok := query.Spec.(qbtypes.QueryBuilderFormula); ok {
				formulaStepMs := q.calculateFormulaStep(formula.Expression, req)
				stepIntervals[formula.Name] = uint64(formulaStepMs / 1000) // convert ms to seconds
			}
		}
	}

	resp := &qbtypes.QueryRangeResponse{
		Type: req.RequestType,
		Data: qbtypes.QueryData{
			Results: maps.Values(processedResults),
		},
		Meta: qbtypes.ExecStats{
			RowsScanned:   stats.RowsScanned,
			BytesScanned:  stats.BytesScanned,
			DurationMS:    stats.DurationMS,
			StepIntervals: stepIntervals,
		},
	}

	// Warnings can arrive duplicated: the bucket cache returns the cached
	// portion's warnings alongside an identical warning emitted by every
	// freshly-executed missing range (see mergeResults), and distinct queries
	// can surface the same warning. Collapse exact duplicates before building
	// the response.
	warnings = dedupeWarnings(warnings)
	if len(warnings) != 0 {
		warns := make([]qbtypes.QueryWarnDataAdditional, len(warnings))
		for i, warning := range warnings {
			warns[i] = qbtypes.QueryWarnDataAdditional{
				Message: warning,
			}
		}

		resp.Warning = &qbtypes.QueryWarnData{
			Message:  "Encountered warnings",
			Url:      warningsDocURL,
			Warnings: warns,
		}
	}
	return resp, nil
}

// executeWithCache executes a query using the bucket cache.
func (q *querier) executeWithCache(ctx context.Context, orgID valuer.UUID, query qbtypes.Query, step qbtypes.Step, _ bool) (*qbtypes.Result, error) {
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
	errs := make([]error, len(missingRanges))
	totalStats := qbtypes.ExecStats{}

	q.logger.DebugContext(ctx, "executing queries for missing ranges",
		slog.Int("missing_ranges_count", len(missingRanges)),
		slog.Any("ranges", missingRanges))

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
				errs[idx] = errors.NewInternalf(errors.CodeInternal, "failed to create ranged query for range %d-%d", tr.From, tr.To)
				return
			}

			// Execute the ranged query
			result, err := rangedQuery.Execute(ctx)
			if err != nil {
				errs[idx] = err
				return
			}

			freshResults[idx] = result
		}(i, timeRange)
	}

	// Wait for all queries to complete
	wg.Wait()

	// Check for errors
	for _, err := range errs {
		if err != nil {
			// If any query failed, fall back to full execution
			q.logger.ErrorContext(ctx, "parallel query execution failed", errors.Attr(err))
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

// createRangedQuery creates a copy of the query with a different time range.
func (q *querier) createRangedQuery(originalQuery qbtypes.Query, timeRange qbtypes.TimeRange) qbtypes.Query {
	// this is called in a goroutine, so we create a copy of the query to avoid race conditions
	switch qt := originalQuery.(type) {
	case *promqlQuery:
		queryCopy := qt.query.Copy()
		return newPromqlQuery(q.logger, q.promEngine, queryCopy, timeRange, qt.requestType, qt.vars)

	case *chSQLQuery:
		queryCopy := qt.query.Copy()
		argsCopy := make([]any, len(qt.args))
		copy(argsCopy, qt.args)
		return newchSQLQuery(q.logger, q.telemetryStore, queryCopy, argsCopy, timeRange, qt.kind, qt.vars)

	case *builderQuery[qbtypes.TraceAggregation]:
		specCopy := qt.spec.Copy()
		specCopy.ShiftBy = extractShiftFromBuilderQuery(specCopy)
		adjustedTimeRange := adjustTimeRangeForShift(specCopy, timeRange, qt.kind)
		return newBuilderQuery(q.logger, q.telemetryStore, q.traceStmtBuilder, specCopy, adjustedTimeRange, qt.kind, qt.variables, builderConfig{})

	case *builderQuery[qbtypes.LogAggregation]:
		specCopy := qt.spec.Copy()
		specCopy.ShiftBy = extractShiftFromBuilderQuery(specCopy)
		adjustedTimeRange := adjustTimeRangeForShift(specCopy, timeRange, qt.kind)
		shiftStmtBuilder := q.logStmtBuilder
		if qt.spec.Source == telemetrytypes.SourceAudit {
			shiftStmtBuilder = q.auditStmtBuilder
		}
		return newBuilderQuery(q.logger, q.telemetryStore, shiftStmtBuilder, specCopy, adjustedTimeRange, qt.kind, qt.variables, q.builderConfig)

	case *builderQuery[qbtypes.MetricAggregation]:
		specCopy := qt.spec.Copy()
		specCopy.ShiftBy = extractShiftFromBuilderQuery(specCopy)
		adjustedTimeRange := adjustTimeRangeForShift(specCopy, timeRange, qt.kind)
		if qt.spec.Source == telemetrytypes.SourceMeter {
			return newBuilderQuery(q.logger, q.telemetryStore, q.meterStmtBuilder, specCopy, adjustedTimeRange, qt.kind, qt.variables, builderConfig{})
		}
		return newBuilderQuery(q.logger, q.telemetryStore, q.metricStmtBuilder, specCopy, adjustedTimeRange, qt.kind, qt.variables, builderConfig{})
	case *traceOperatorQuery:
		specCopy := qt.spec.Copy()
		return &traceOperatorQuery{
			telemetryStore: q.telemetryStore,
			stmtBuilder:    q.traceOperatorStmtBuilder,
			spec:           specCopy,
			fromMS:         uint64(timeRange.From),
			toMS:           uint64(timeRange.To),
			compositeQuery: qt.compositeQuery,
			kind:           qt.kind,
		}
	default:
		return nil
	}
}

// mergeResults merges cached result with fresh results.
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
			Type:           fresh[0].Type,
			Stats:          fresh[0].Stats,
			Warnings:       fresh[0].Warnings,
			WarningsDocURL: fresh[0].WarningsDocURL,
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
		Type:           cached.Type,
		Value:          cached.Value,
		Stats:          cached.Stats,
		Warnings:       cached.Warnings,
		WarningsDocURL: cached.WarningsDocURL,
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

// mergeTimeSeriesResults merges time series data.
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

func secondsStep(s uint64) qbtypes.Step {
	return qbtypes.Step{Duration: time.Second * time.Duration(s)}
}

// clampStep sets the step to recommended when zero and clamps to min when below it.
// When clamped and warn is true, a warning is appended for the user.
func clampStep(qe *qbtypes.QueryEnvelope, recommended, min uint64, warnings *[]string) {
	step := qe.GetStepInterval()
	if step.Seconds() == 0 {
		step = secondsStep(recommended)
		qe.SetStepInterval(step)
	}
	if step.Seconds() < float64(min) {
		newStep := secondsStep(min)
		*warnings = append(*warnings, fmt.Sprintf(intervalWarn, qe.GetQueryName(), step.Seconds(), newStep.Seconds()))
		qe.SetStepInterval(newStep)
	}
}

// extractShiftFromBuilderQuery extracts the shift value from timeShift function if present.
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

// adjustTimeRangeForShift adjusts the time range based on the shift value from timeShift function.
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

func (q *querier) constructTraceOperatorDependencyMap(queries []qbtypes.QueryEnvelope) (map[string]bool, error) {
	dependencyQueries := make(map[string]bool)

	for _, query := range queries {
		if query.Type == qbtypes.QueryTypeTraceOperator {
			if spec, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
				// Parse expression to find dependencies
				if err := spec.ParseExpression(); err != nil {
					return nil, err
				}

				deps := spec.CollectReferencedQueries(spec.ParsedExpression)
				for _, dep := range deps {
					dependencyQueries[dep] = true
				}
			}
		}
	}

	return dependencyQueries, nil
}

// adjustStepInterval normalizes each query's step interval in place and returns
// any clamp warnings emitted along the way.
func (q *querier) adjustStepInterval(queries []qbtypes.QueryEnvelope, start, end uint64) []string {
	// Compute the per-signal bounds once per call — they only depend on start/end.
	traceLogRecommended := querybuilder.RecommendedStepInterval(start, end)
	traceLogMin := querybuilder.MinAllowedStepInterval(start, end)
	meterRecommended := querybuilder.RecommendedStepIntervalForMeter(start, end)
	meterMin := querybuilder.MinAllowedStepIntervalForMeter(start, end)
	metricRecommended := querybuilder.RecommendedStepIntervalForMetric(start, end)
	metricMin := querybuilder.MinAllowedStepIntervalForMetric(start, end)

	warnings := make([]string, 0)
	for idx := range queries {
		qe := &queries[idx]
		switch qe.Type {
		case qbtypes.QueryTypeBuilder:
			switch qe.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				clampStep(qe, traceLogRecommended, traceLogMin, &warnings)
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if qe.GetSource() == telemetrytypes.SourceMeter {
					clampStep(qe, meterRecommended, meterMin, &warnings)
					// we don't want to return warnings for meter metrics.
					warnings = nil
				} else {
					clampStep(qe, metricRecommended, metricMin, &warnings)
				}
			}
		case qbtypes.QueryTypePromQL:
			// PromQL only fills an unset step — no min clamp.
			if qe.GetStepInterval().Seconds() == 0 {
				qe.SetStepInterval(secondsStep(metricRecommended))
			}
		case qbtypes.QueryTypeTraceOperator:
			clampStep(qe, traceLogRecommended, traceLogMin, &warnings)
		}
	}
	return warnings
}

// dedupeWarnings removes exact-duplicate warning messages while preserving the
// order of first occurrence. Returns nil for an empty input. Warning counts are
// tiny (a handful per request), so a linear scan beats the allocation and
// hashing overhead of a map.
func dedupeWarnings(warnings []string) []string {
	if len(warnings) == 0 {
		return nil
	}
	unique := make([]string, 0, len(warnings))
	// N^2 is faster than map-based deduping for small warning counts, and it preserves order of first occurrence without extra bookkeeping.
	for _, warning := range warnings {
		if !slices.Contains(unique, warning) {
			unique = append(unique, warning)
		}
	}
	return unique
}
