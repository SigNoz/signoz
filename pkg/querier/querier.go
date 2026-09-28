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
	"golang.org/x/sync/errgroup"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
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

// Querier interface defines the contract for querying data.
type Querier interface {
	QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
	QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream)
	statsreporter.StatsCollector
	// QueryRangePreview validates and renders the queries without executing them.
	QueryRangePreview(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, opts qbtypes.QueryRangePreviewOptions) (*qbtypes.QueryRangePreviewResponse, error)
}

type querier struct {
	logger                   *slog.Logger
	fl                       flagger.Flagger
	telemetryStore           telemetrystore.TelemetryStore
	metadataStore            telemetrytypes.MetadataStore
	promEngine               prometheus.Prometheus
	traceStmtBuilder         qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	aiTraceStmtBuilder       qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	logStmtBuilder           qbtypes.StatementBuilder[qbtypes.LogAggregation]
	auditStmtBuilder         qbtypes.StatementBuilder[qbtypes.LogAggregation]
	metricStmtBuilder        qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	meterStmtBuilder         qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	traceOperatorStmtBuilder qbtypes.TraceOperatorStatementBuilder
	bucketCache              BucketCache
	liveDataRefresh          time.Duration
	builderConfig            builderConfig
	maxConcurrentQueries     int
}

var _ Querier = (*querier)(nil)

func New(
	settings factory.ProviderSettings,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine prometheus.Prometheus,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	aiTraceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	logStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	auditStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	meterStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	traceOperatorStmtBuilder qbtypes.TraceOperatorStatementBuilder,
	bucketCache BucketCache,
	flagger flagger.Flagger,
	logTraceIDWindowPadding time.Duration,
	maxConcurrentQueries int,
) *querier {
	querierSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querier")
	if maxConcurrentQueries <= 0 {
		maxConcurrentQueries = DefaultMaxConcurrentQueries
	}
	return &querier{
		logger:                   querierSettings.Logger(),
		fl:                       flagger,
		telemetryStore:           telemetryStore,
		metadataStore:            metadataStore,
		promEngine:               promEngine,
		traceStmtBuilder:         traceStmtBuilder,
		aiTraceStmtBuilder:       aiTraceStmtBuilder,
		logStmtBuilder:           logStmtBuilder,
		auditStmtBuilder:         auditStmtBuilder,
		metricStmtBuilder:        metricStmtBuilder,
		meterStmtBuilder:         meterStmtBuilder,
		traceOperatorStmtBuilder: traceOperatorStmtBuilder,
		bucketCache:              bucketCache,
		liveDataRefresh:          5 * time.Second,
		builderConfig: builderConfig{
			logTraceIDWindowPaddingMS: uint64(logTraceIDWindowPadding.Milliseconds()),
		},
		maxConcurrentQueries: maxConcurrentQueries,
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

	missingMetricQueries, metricWarnings, err := q.resolveMetricMetadata(ctx, orgID, req.CompositeQuery.Queries, req.Start, req.End, req.RequestType)
	if err != nil {
		return nil, err
	}
	missingMetricQuerySet := make(map[string]bool, len(missingMetricQueries))
	for _, name := range missingMetricQueries {
		missingMetricQuerySet[name] = true
	}

	queries, steps, err := q.buildQueries(orgID, req, dependencyQueries, missingMetricQuerySet, event)
	if err != nil {
		return nil, err
	}

	preseededResults := make(map[string]any)
	for _, name := range missingMetricQueries {
		switch req.RequestType {
		case qbtypes.RequestTypeTimeSeries, qbtypes.RequestTypeHeatmap:
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
	orgID valuer.UUID,
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
			timeRange := qbtypes.TimeRange{From: req.Start, To: req.End}
			if !req.NoStepAlignment {
				timeRange = alignWindowToStep(timeRange, promQuery.Step)
			}
			promqlQuery := newPromqlQuery(q.logger, q.promEngine, promQuery, timeRange, req.RequestType, tmplVars)
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
				orgID:          orgID,
				stmtBuilder:    q.traceOperatorStmtBuilder,
				spec:           traceOpQuery,
				compositeQuery: &req.CompositeQuery,
				fromMS:         uint64(req.Start),
				toMS:           uint64(req.End),
				kind:           req.RequestType,
			}
			queries[traceOpQuery.Name] = toq
			steps[traceOpQuery.Name] = traceOpQuery.StepInterval
		case qbtypes.QueryTypeBuilderAI:
			spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation])
			if !ok {
				return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid AI builder query spec %T", query.Spec)
			}
			spec.ShiftBy = extractShiftFromBuilderQuery(spec)
			timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
			bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, q.aiTraceStmtBuilder, query.Type, spec, timeRange, req.RequestType, tmplVars, builderConfig{})
			queries[spec.Name] = bq
			steps[spec.Name] = spec.StepInterval
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, q.traceStmtBuilder, query.Type, spec, timeRange, req.RequestType, tmplVars, builderConfig{})
				queries[spec.Name] = bq
				steps[spec.Name] = spec.StepInterval
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				stmtBuilder := q.logStmtBuilder
				if spec.Source == telemetrytypes.SourceAudit {
					stmtBuilder = q.auditStmtBuilder
				}
				bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, stmtBuilder, query.Type, spec, timeRange, req.RequestType, tmplVars, q.builderConfig)
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
				requestType := req.RequestType
				if requestType == qbtypes.RequestTypeHeatmap && spec.Disabled {
					// A disabled query in a heatmap request feeds a formula, and the
					// formula converts time series into heatmap data, so its inputs
					// run as time series queries.
					requestType = qbtypes.RequestTypeTimeSeries
				}
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, requestType)
				var bq *builderQuery[qbtypes.MetricAggregation]

				if spec.Source == telemetrytypes.SourceMeter {
					event.Source = telemetrytypes.SourceMeter.StringValue()
					bq = newBuilderQuery(q.logger, q.telemetryStore, orgID, q.meterStmtBuilder, query.Type, spec, timeRange, requestType, tmplVars, builderConfig{})
				} else {
					bq = newBuilderQuery(q.logger, q.telemetryStore, orgID, q.metricStmtBuilder, query.Type, spec, timeRange, requestType, tmplVars, builderConfig{})
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
		case qbtypes.QueryTypeBuilderAI:
			filter := query.GetFilter()
			event.FilterApplied = event.FilterApplied || (filter != nil && filter.Expression != "")
			event.GroupByApplied = event.GroupByApplied || len(query.GetGroupBy()) > 0
			event.TracesUsed = true
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
func (q *querier) resolveMetricMetadata(ctx context.Context, orgID valuer.UUID, queries []qbtypes.QueryEnvelope, start, end uint64, requestType qbtypes.RequestType) (missingMetricQueries []string, metricWarnings []string, err error) {
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
			if err := spec.Aggregations[i].ValidateForTypeAndTemporality(); err != nil {
				return nil, nil, err
			}
			// Only the enabled query is used to render the heatmap, so bucket
			// options are only applied to the enabled query.
			if requestType == qbtypes.RequestTypeHeatmap && !spec.Disabled {
				if err := spec.Aggregations[i].VerifyAndApplyBucketOptions(spec.BucketOptions); err != nil {
					return nil, nil, err
				}
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
	lastSeenInfo, _ := q.metadataStore.FetchLastSeenInfoMulti(ctx, orgID, externalMissingMetrics...)
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
			bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, liveTailStmtBuilder, query.Type, spec, timeRange, req.RequestType, map[string]qbtypes.VariableItem{
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
		case qbtypes.RequestTypeTimeSeries, qbtypes.RequestTypeHeatmap:
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

	names := maps.Keys(qs)
	slices.Sort(names)
	queryResults := make([]*qbtypes.Result, len(names))

	// sem limits how many queries run at once for this request. The same
	// limit covers the missing-range queries in executeWithCache. sem is held
	// only while a query is running, never while waiting for other
	// goroutines, so the two levels cannot deadlock.
	sem := make(chan struct{}, q.maxConcurrentQueries)

	eg, egCtx := errgroup.WithContext(ctx)
	for i, name := range names {
		query := qs[name]
		eg.Go(func() (err error) {
			// A panic here would end the process: errgroup does not recover
			// and the HTTP recovery middleware only covers the handler goroutine.
			defer func() {
				if r := recover(); r != nil {
					q.logger.ErrorContext(egCtx, "query execution panicked", slog.String("query", name), slog.Any("panic", r))
					err = errors.NewInternalf(errors.CodeInternal, "query %s failed", name)
				}
			}()
			// Skip cache if NoCache is set, or if cache is not available
			if req.NoCache || q.bucketCache == nil || query.Fingerprint() == "" {
				if req.NoCache {
					q.logger.DebugContext(egCtx, "NoCache flag set, bypassing cache", slog.String("query", name))
				} else {
					q.logger.DebugContext(egCtx, "no bucket cache or fingerprint, executing query", slog.String("query", name))
				}
				sem <- struct{}{}
				result, err := query.Execute(egCtx)
				<-sem
				if err != nil {
					return err
				}
				queryResults[i] = result
				return nil
			}

			result, err := q.executeWithCache(egCtx, orgID, query, steps[name], sem)
			if err != nil {
				return err
			}
			switch v := result.Value.(type) {
			case *qbtypes.TimeSeriesData:
				v.QueryName = name
			case *qbtypes.ScalarData:
				v.QueryName = name
			case *qbtypes.RawData:
				v.QueryName = name
			}
			queryResults[i] = result
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return nil, err
	}

	for i, name := range names {
		result := queryResults[i]
		qbEvent.HasData = qbEvent.HasData || hasData(result)
		results[name] = result.Value
		warnings = append(warnings, result.Warnings...)
		warningsDocURL = result.WarningsDocURL
		stats.RowsScanned += result.Stats.RowsScanned
		stats.BytesScanned += result.Stats.BytesScanned
		stats.DurationMS += result.Stats.DurationMS
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

// executeWithCache serves a query from the bucket cache: the cached part of
// the window plus one statement per missing range, merged and written back
// range by range. sem limits how many statements run at once for the whole
// request.
func (q *querier) executeWithCache(ctx context.Context, orgID valuer.UUID, query qbtypes.Query, step qbtypes.Step, sem chan struct{}) (*qbtypes.Result, error) {
	from, to := query.Window()
	stepMs := uint64(step.Milliseconds())
	// Functions such as runningDiff need the step before the window; the
	// cache window includes it so a hit carries it too.
	lookbackMs := uint64(lookbackSteps(query)) * stepMs
	req := CacheRequest{
		Key:             CacheKey(query.Fingerprint()),
		Window:          qbtypes.TimeRange{From: from - min(lookbackMs, from), To: to},
		Step:            step,
		Kind:            queryKind(query),
		TrimHeatmapAxis: trimsHeatmapAxis(query),
	}

	execute := func(qry qbtypes.Query) (*qbtypes.Result, error) {
		sem <- struct{}{}
		defer func() { <-sem }()
		return qry.Execute(ctx)
	}

	cached, missing := q.bucketCache.GetMissRanges(ctx, orgID, req)
	if len(missing) == 0 && cached != nil {
		flagPartialPoints(query, cached, from, to, stepMs)
		return cached, nil
	}
	// A statement that ranks or limits over its window cannot be assembled
	// from pieces, and a window that is entirely missing is cheaper as one
	// statement; both run the original query over its own window.
	entirelyMissing := cached == nil && len(missing) == 1 && missing[0] == req.Window
	if entirelyMissing || wholeWindowOnly(query) || len(missing) == 0 {
		result, err := execute(query)
		if err != nil {
			return nil, err
		}
		q.bucketCache.Put(ctx, orgID, req, req.Window, result)
		return result, nil
	}

	fresh := make([]*qbtypes.Result, len(missing))
	errs := make([]error, len(missing))
	var wg sync.WaitGroup
	for i, timeRange := range missing {
		wg.Add(1)
		go func(i int, timeRange qbtypes.TimeRange) {
			defer wg.Done()
			ranged := q.createRangedQuery(query, timeRange)
			if ranged == nil {
				errs[i] = errors.NewInternalf(errors.CodeInternal, "cannot range query over %d-%d", timeRange.From, timeRange.To)
				return
			}
			fresh[i], errs[i] = execute(ranged)
		}(i, timeRange)
	}
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	merged := mergeResults(req, cached, fresh)
	for i, timeRange := range missing {
		q.bucketCache.Put(ctx, orgID, req, timeRange, fresh[i])
	}
	flagPartialPoints(query, merged, from, to, stepMs)
	return merged, nil
}

// flagPartialPoints marks the points of a served result the way consume
// marks them for the query's own window: a bucket holds the flag of the
// window that fetched it, and a piece is fetched over a window of its own.
// PromQL evaluates instants and has no partial points.
func flagPartialPoints(query qbtypes.Query, result *qbtypes.Result, from, to, stepMs uint64) {
	if _, ok := query.(*promqlQuery); ok || result == nil {
		return
	}
	data, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok || data == nil {
		return
	}
	window := &qbtypes.TimeRange{From: from, To: to}
	for _, agg := range data.Aggregations {
		for _, s := range agg.Series {
			for _, v := range s.Values {
				v.Partial = isPartialValue(v.Timestamp, window, stepMs)
			}
		}
	}
}

// createRangedQuery copies a query over another window. The window is in the
// query's own clock: a timeShift query already reports a shifted window, so
// the copy takes the range as it is.
func (q *querier) createRangedQuery(original qbtypes.Query, timeRange qbtypes.TimeRange) qbtypes.Query {
	switch qt := original.(type) {
	case *promqlQuery:
		return qt.ranged(timeRange)

	case *chSQLQuery:
		queryCopy := qt.query.Copy()
		argsCopy := make([]any, len(qt.args))
		copy(argsCopy, qt.args)
		return newchSQLQuery(q.logger, q.telemetryStore, queryCopy, argsCopy, timeRange, qt.kind, qt.vars)

	case *builderQuery[qbtypes.TraceAggregation]:
		// reuse the original query's statement builder and type so an AI query
		// keeps its AI builder and cache key
		return newBuilderQuery(q.logger, q.telemetryStore, qt.orgID, qt.stmtBuilder, qt.queryType, qt.spec.Copy(), timeRange, qt.kind, qt.variables, qt.builderConfig)

	case *builderQuery[qbtypes.LogAggregation]:
		return newBuilderQuery(q.logger, q.telemetryStore, qt.orgID, qt.stmtBuilder, qt.queryType, qt.spec.Copy(), timeRange, qt.kind, qt.variables, qt.builderConfig)

	case *builderQuery[qbtypes.MetricAggregation]:
		specCopy := qt.spec.Copy()
		// The builder picks its tables from the window it is given; a piece
		// must read the tables the whole request reads.
		for i, agg := range specCopy.Aggregations {
			if specCopy.Source == telemetrytypes.SourceMeter {
				specCopy.Aggregations[i].TableHints = metertelemetryschema.TableHintsForWindow(qt.fromMS, qt.toMS, agg.Type, agg.TimeAggregation, agg.TableHints)
			} else {
				specCopy.Aggregations[i].TableHints = metricstelemetryschema.TableHintsForWindow(qt.fromMS, qt.toMS, agg.Type, agg.TimeAggregation, agg.Reduced, agg.TableHints)
			}
		}
		return newBuilderQuery(q.logger, q.telemetryStore, qt.orgID, qt.stmtBuilder, qt.queryType, specCopy, timeRange, qt.kind, qt.variables, qt.builderConfig)

	case *traceOperatorQuery:
		return &traceOperatorQuery{
			telemetryStore: q.telemetryStore,
			orgID:          qt.orgID,
			stmtBuilder:    q.traceOperatorStmtBuilder,
			spec:           qt.spec.Copy(),
			fromMS:         timeRange.From,
			toMS:           timeRange.To,
			compositeQuery: qt.compositeQuery,
			kind:           qt.kind,
		}
	default:
		return nil
	}
}

// mergeResults joins the cached part with the fresh pieces. Fresh points win
// over cached points at the same timestamp, and a partial point never wins
// over a whole one (a metrics piece returns the step before its range as a
// partial point that the cached part already holds whole).
func mergeResults(req CacheRequest, cached *qbtypes.Result, fresh []*qbtypes.Result) *qbtypes.Result {
	merged := &qbtypes.Result{Type: req.Kind}
	parts := make([]*qbtypes.TimeSeriesData, 0, len(fresh)+1)
	add := func(result *qbtypes.Result) {
		if result == nil {
			return
		}
		if data, ok := result.Value.(*qbtypes.TimeSeriesData); ok && data != nil {
			parts = append(parts, data)
		}
		merged.Stats.RowsScanned += result.Stats.RowsScanned
		merged.Stats.BytesScanned += result.Stats.BytesScanned
		merged.Stats.DurationMS += result.Stats.DurationMS
		merged.Warnings = append(merged.Warnings, result.Warnings...)
		if merged.WarningsDocURL == "" {
			merged.WarningsDocURL = result.WarningsDocURL
		}
	}
	add(cached)
	for _, result := range fresh {
		add(result)
	}
	merged.Warnings = dedupeWarnings(merged.Warnings)
	stepMs := uint64(req.Step.Milliseconds())
	windowStart := req.Window.From - req.Window.From%stepMs
	// A piece widened by the builder reports points before its own range;
	// only the ones inside the request window (and its partial first step)
	// belong to the answer, as with one statement over the whole window.
	merged.Value = selectPoints(mergeTimeSeriesData(parts), func(v *qbtypes.TimeSeriesValue) bool {
		ts := uint64(v.Timestamp)
		return ts >= windowStart && ts < req.Window.To
	})
	return merged
}

// alignWindowToStep moves both ends of a window down to the step grid, the
// way a query frontend does before a results cache: PromQL evaluates at
// start + k*step, so only windows on one grid share instants.
func alignWindowToStep(window qbtypes.TimeRange, step qbtypes.Step) qbtypes.TimeRange {
	stepMs := uint64(step.Milliseconds())
	if stepMs == 0 {
		return window
	}
	return qbtypes.TimeRange{From: window.From - window.From%stepMs, To: window.To - window.To%stepMs}
}

// queryKind is the request type a query answers with.
func queryKind(query qbtypes.Query) qbtypes.RequestType {
	switch qt := query.(type) {
	case *promqlQuery:
		return qt.requestType
	case *builderQuery[qbtypes.TraceAggregation]:
		return qt.kind
	case *builderQuery[qbtypes.LogAggregation]:
		return qt.kind
	case *builderQuery[qbtypes.MetricAggregation]:
		return qt.kind
	case *chSQLQuery:
		return qt.kind
	case *traceOperatorQuery:
		return qt.kind
	}
	return qbtypes.RequestTypeTimeSeries
}

// wholeWindowOnly reports whether the query's statement depends on the
// whole window, so its cached result serves only the identical window.
func wholeWindowOnly(query qbtypes.Query) bool {
	switch qt := query.(type) {
	case *builderQuery[qbtypes.TraceAggregation]:
		return qt.wholeWindowOnly()
	case *builderQuery[qbtypes.LogAggregation]:
		return qt.wholeWindowOnly()
	case *builderQuery[qbtypes.MetricAggregation]:
		return qt.wholeWindowOnly()
	}
	return false
}

// lookbackSteps is how many steps before the window the answer must carry.
func lookbackSteps(query qbtypes.Query) int {
	if qt, ok := query.(*builderQuery[qbtypes.MetricAggregation]); ok {
		return qt.lookbackSteps()
	}
	return 0
}

// trimsHeatmapAxis reports whether the query computes its heatmap axis from
// the served columns. A histogram metric, promql and clickhouse name their
// own buckets, and an empty one of theirs still belongs on the axis.
func trimsHeatmapAxis(query qbtypes.Query) bool {
	switch qt := query.(type) {
	case *builderQuery[qbtypes.TraceAggregation]:
		return qt.kind == qbtypes.RequestTypeHeatmap
	case *builderQuery[qbtypes.LogAggregation]:
		return qt.kind == qbtypes.RequestTypeHeatmap
	case *builderQuery[qbtypes.MetricAggregation]:
		if qt.kind != qbtypes.RequestTypeHeatmap {
			return false
		}
		for _, agg := range qt.spec.Aggregations {
			if agg.HeatmapBucketing != nil {
				return true
			}
		}
	}
	return false
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
		case qbtypes.QueryTypeBuilderAI:
			clampStep(qe, traceLogRecommended, traceLogMin, &warnings)
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
