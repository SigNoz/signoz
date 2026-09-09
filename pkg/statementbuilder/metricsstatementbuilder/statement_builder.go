package metricsstatementbuilder

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const (
	RateTmpl = `multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))`

	IncreaseTmpl = `multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window)`

	RateMultiTemporalityTmpl = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(row_number() OVER rate_window = 1, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s / (ts - lagInFrame(ts, 1) OVER rate_window), (%s - lagInFrame(%s, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))) AS per_series_value`

	IncreaseMultiTemporality = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(row_number() OVER rate_window = 1, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s, (%s - lagInFrame(%s, 1) OVER rate_window))) AS per_series_value`

	OthersMultiTemporality = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, %s) AS per_series_value`
)

type StatementBuilder struct {
	logger        *slog.Logger
	metadataStore telemetrytypes.MetadataStore
	fm            qbtypes.FieldMapper
	cb            qbtypes.ConditionBuilder
	flagger       flagger.Flagger
}

var _ qbtypes.StatementBuilder[qbtypes.MetricAggregation] = (*StatementBuilder)(nil)

// NewFactory returns a provider factory for the metrics statement builder. Its
// New internalizes the FieldMapper and ConditionBuilder and yields the concrete
// *StatementBuilder so the meter builder can reuse it.
func NewFactory(
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[*StatementBuilder, statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("metrics"),
		func(_ context.Context, settings factory.ProviderSettings, _ statementbuilder.Config) (*StatementBuilder, error) {
			fm := metricstelemetryschema.NewFieldMapper()
			cb := metricstelemetryschema.NewConditionBuilder(fm)
			return NewMetricQueryStatementBuilder(settings, metadataStore, fm, cb, fl), nil
		},
	)
}

func NewMetricQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	flagger flagger.Flagger,
) *StatementBuilder {
	metricsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema")
	return &StatementBuilder{
		logger:        metricsSettings.Logger(),
		metadataStore: metadataStore,
		fm:            fieldMapper,
		cb:            conditionBuilder,
		flagger:       flagger,
	}
}

func GetKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector
	if query.Filter != nil && query.Filter.Expression != "" {
		whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
		keySelectors = append(keySelectors, whereClauseSelectors...)
	}

	for idx := range query.GroupBy {
		groupBy := query.GroupBy[idx]
		selectors := querybuilder.QueryStringToKeysSelectors(groupBy.Name)
		keySelectors = append(keySelectors, selectors...)
	}

	for idx := range query.Order {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          query.Order[idx].Key.Name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  query.Order[idx].Key.FieldContext,
			FieldDataType: query.Order[idx].Key.FieldDataType,
		})
	}

	for idx := range keySelectors {
		keySelectors[idx].Signal = telemetrytypes.SignalMetrics
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
		keySelectors[idx].MetricContext = &telemetrytypes.MetricContext{
			MetricName: query.Aggregations[0].MetricName,
		}
		keySelectors[idx].Source = query.Source
	}
	return keySelectors
}

func (b *StatementBuilder) Build(
	ctx context.Context,
	orgID valuer.UUID,
	start uint64,
	end uint64,
	_ qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	keySelectors := GetKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, keySelectors)
	if err != nil {
		return nil, err
	}

	start, end = querybuilder.AdjustedMetricTimeRange(start, end, uint64(query.StepInterval.Seconds()), query)

	return b.buildPipelineStatement(ctx, orgID, start, end, query, keys, variables)
}

func (b *StatementBuilder) buildPipelineStatement(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	cteQuery := query
	if query.Aggregations[0].Type == metrictypes.HistogramType {
		query.GroupBy = slices.DeleteFunc(slices.Clone(query.GroupBy), isHistogramBucket)
		cteQuery = histogramCTEQuery(query)
	}

	agg := cteQuery.Aggregations[0]

	// A reduced metric reads the raw buffer for recent short windows, and
	// samples_v4/agg (unioned with the reduced tables) otherwise. The buffer is
	// shaped exactly like samples_v4 / time_series_v4, so once the table names are
	// chosen the rest of the pipeline is unchanged.
	useBuffer := agg.Reduced &&
		end-start < metricstelemetryschema.OneDayInMilliseconds &&
		start >= uint64(time.Now().UnixMilli())-metricstelemetryschema.OneDayInMilliseconds

	samplesTable, _ := metricstelemetryschema.WhichSamplesTableToUse(start, end, agg.Type, agg.TimeAggregation, useBuffer, agg.TableHints)
	tsStart, tsEnd, _, tsTable := metricstelemetryschema.WhichTSTableToUse(start, end, useBuffer, agg.TableHints)

	var timeSeriesCTE string
	var timeSeriesCTEArgs []any
	var filterWarnings []string
	var err error

	if timeSeriesCTE, timeSeriesCTEArgs, filterWarnings, err = b.buildTimeSeriesCTE(ctx, orgID, tsStart, tsEnd, cteQuery, keys, variables, tsTable); err != nil {
		return nil, err
	}

	if qbtypes.CanShortCircuitDelta(agg) {
		// spatial_aggregation_cte directly for certain delta queries
		if frag, args, err := b.buildTemporalAggDeltaFastPath(start, end, cteQuery, samplesTable, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	} else {
		// temporal_aggregation_cte
		if frag, args, err := b.buildTemporalAggregationCTE(ctx, start, end, cteQuery, keys, samplesTable, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}

		// spatial_aggregation_cte
		if frag, args := b.buildSpatialAggregationCTE(ctx, start, end, cteQuery, keys); frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	}

	var reducedFragments []string
	var reducedArgs [][]any
	if agg.Reduced && !useBuffer {
		var tsCTE string
		var tsArgs []any
		// time series rows are written on hour boundaries
		tsStart := start - (start % metricstelemetryschema.OneHourInMilliseconds)
		if tsCTE, tsArgs, err = b.buildReducedTimeSeriesCTE(ctx, orgID, tsStart, end, cteQuery, keys, variables); err != nil {
			return nil, err
		}
		if qbtypes.CanShortCircuitReduced(agg) {
			// spatial_aggregation_cte directly, no per-series level
			if spatialFrag, spatialArgs, ok := b.buildReducedSpatialAggFastPath(start, end, cteQuery, tsCTE, tsArgs); ok {
				reducedFragments = []string{spatialFrag}
				reducedArgs = [][]any{spatialArgs}
			}
		} else if temporalFrag, temporalArgs, ok := b.buildReducedTemporalAggregationCTE(start, end, cteQuery, tsCTE, tsArgs); ok {
			spatialFrag, spatialArgs := b.buildReducedSpatialAggregationCTE(cteQuery)
			reducedFragments = []string{temporalFrag, spatialFrag}
			reducedArgs = [][]any{temporalArgs, spatialArgs}
		}
	}

	mainStmt, err := b.BuildFinalSelect(cteFragments, cteArgs, query)
	if err != nil {
		return nil, err
	}
	mainStmt.Warnings = append(mainStmt.Warnings, filterWarnings...)
	if reducedFragments == nil {
		return mainStmt, nil
	}
	reducedStmt, err := b.BuildFinalSelect(reducedFragments, reducedArgs, query)
	if err != nil {
		return nil, err
	}
	return unionStatements(mainStmt, reducedStmt, query)
}

func unionStatements(main, reduced *qbtypes.Statement, query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) (*qbtypes.Statement, error) {
	orderBy := "ts"
	for i, g := range query.GroupBy {
		orderBy = fmt.Sprintf("`%s`, ", GroupByColumnAlias(i, g.Name)) + orderBy
	}
	q := fmt.Sprintf(
		"SELECT * FROM (%s) UNION ALL SELECT * FROM (%s) ORDER BY %s SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
		main.Query, reduced.Query, orderBy,
	)
	args := append(append([]any{}, main.Args...), reduced.Args...)
	warnings := append(append([]string{}, main.Warnings...), reduced.Warnings...)
	return &qbtypes.Statement{Query: q, Args: args, Warnings: warnings}, nil
}

func (b *StatementBuilder) buildReducedTimeSeriesCTE(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	var preparedWhereClause querybuilder.PreparedWhereClause
	var err error
	if query.Filter != nil && query.Filter.Expression != "" {
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:          ctx,
			OrgID:            orgID,
			Logger:           b.logger,
			FieldMapper:      b.fm,
			ConditionBuilder: b.cb,
			FieldKeys:        keys,
			FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels"},
			Variables:        variables,
			StartNs:          start,
			EndNs:            end,
		})
		if err != nil {
			return "", nil, err
		}
	}

	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, metricstelemetryschema.TimeseriesV4ReducedLocalTableName))
	sb.Select("fingerprint")
	for i, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &g.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(col), GroupByColumnAlias(i, g.Name)))
	}
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LTE("unix_milli", end),
	)

	if !preparedWhereClause.IsEmpty() {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}
	sb.GroupBy("fingerprint")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("(%s) AS filtered_time_series", q), args, nil
}

// buildReducedSpatialAggFastPath is the reduced analog of
// buildTemporalAggDeltaFastPath: for combinations where the temporal and
// spatial aggregations collapse (CanShortCircuitReduced), it emits the
// spatial_aggregation_cte in one level with no per-series grouping, so shards
// send one state per (step, group) instead of per (series, step, group).
// FINAL still dedups recomputed 60s buckets at scan time.
func (b *StatementBuilder) buildReducedSpatialAggFastPath(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, bool) {
	agg := query.Aggregations[0]
	stepSec := int64(query.StepInterval.Seconds())

	value, _, ok := metricstelemetryschema.ReducedValueColumn(agg.Type, agg.SpaceAggregation)
	if !ok {
		return "", nil, false
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(fmt.Sprintf("toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts", stepSec))
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}
	sb.SelectMore(fmt.Sprintf("%s AS value", metricstelemetryschema.ReducedTimeAggregationColumn(agg.TimeAggregation, stepSec, value)))
	sb.From(fmt.Sprintf("%s.%s AS points FINAL", metricstelemetryschema.DBName, metricstelemetryschema.WhichReducedSamplesTableToUse(agg.Type)))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.reduced_fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", agg.MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	sb.GroupBy("ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, true
}

func (b *StatementBuilder) buildReducedTemporalAggregationCTE(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, bool) {
	agg := query.Aggregations[0]
	stepSec := int64(query.StepInterval.Seconds())

	value, weight, ok := metricstelemetryschema.ReducedValueColumn(agg.Type, agg.SpaceAggregation)
	if !ok {
		return "", nil, false
	}

	// TODO(srikanthccv): add _5m/_30m tables similar to samples_v4
	// and wire them up in querier before GA
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("points.reduced_fingerprint AS fingerprint")
	sb.SelectMore(fmt.Sprintf("toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts", stepSec))
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}
	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", metricstelemetryschema.ReducedTimeAggregationColumn(agg.TimeAggregation, stepSec, value)))
	if weight != "" {
		// count_series is a series count, not additive over time, so the avg
		// denominator is reduced with avg
		sb.SelectMore(fmt.Sprintf("avg(%s) AS per_series_weight", weight))
	}
	sb.From(fmt.Sprintf("%s.%s AS points FINAL", metricstelemetryschema.DBName, metricstelemetryschema.WhichReducedSamplesTableToUse(agg.Type)))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.reduced_fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", agg.MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	sb.GroupBy("fingerprint", "ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, true
}

func (b *StatementBuilder) buildReducedSpatialAggregationCTE(
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
) (string, []any) {
	spatial := "sum(per_series_value)"
	switch query.Aggregations[0].SpaceAggregation {
	case metrictypes.SpaceAggregationAvg:
		spatial = "sum(per_series_value) / sum(per_series_weight)"
	case metrictypes.SpaceAggregationMin:
		spatial = "min(per_series_value)"
	case metrictypes.SpaceAggregationMax:
		spatial = "max(per_series_value)"
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("ts")
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}
	sb.SelectMore(spatial + " AS value")
	sb.From("__temporal_aggregation_cte")
	sb.GroupBy("ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args
}

func (b *StatementBuilder) buildTemporalAggDeltaFastPath(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	sb := sqlbuilder.NewSelectBuilder()

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}

	var aggCol string
	if query.Aggregations[0].SpaceAggregation.IsPercentile() &&
		query.Aggregations[0].Type == metrictypes.ExpHistogramType {
		// merging sketches already spans every series in the step, so neither a
		// samples-table value column nor the rate divisor applies
		aggCol = fmt.Sprintf("quantilesDDMerge(0.01, %f)(sketch)[1]", query.Aggregations[0].SpaceAggregation.Percentile())
	} else {
		col, err := metricstelemetryschema.AggregationColumnForSamplesTable(
			samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation,
		)
		if err != nil {
			return "", nil, err
		}
		aggCol = col
		if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
			// TODO(srikanthccv): should it be step interval or use [start_time_unix_nano](https://github.com/open-telemetry/opentelemetry-proto/blob/d3fb76d70deb0874692bd0ebe03148580d85f3bb/opentelemetry/proto/metrics/v1/metrics.proto#L400C11-L400C31)?
			aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
		}
	}

	sb.SelectMore(fmt.Sprintf("%s AS value", aggCol))

	sb.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, samplesTable))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	if f := metricstelemetryschema.StaleMarkerFilterForSamplesTable(samplesTable); f != "" {
		sb.Where(f)
	}
	sb.GroupBy("ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *StatementBuilder) buildTimeSeriesCTE(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
	tsTable string,
) (string, []any, []string, error) {
	sb := sqlbuilder.NewSelectBuilder()

	var preparedWhereClause querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:          ctx,
			OrgID:            orgID,
			Logger:           b.logger,
			FieldMapper:      b.fm,
			ConditionBuilder: b.cb,
			FieldKeys:        keys,
			FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels"},
			Variables:        variables,
			StartNs:          start,
			EndNs:            end,
		})
		if err != nil {
			return "", nil, nil, err
		}
	}

	sb.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, tsTable))

	sb.Select("fingerprint")
	for i, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &g.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return "", nil, nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(col), GroupByColumnAlias(i, g.Name)))
	}

	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LTE("unix_milli", end),
	)

	if query.Aggregations[0].Temporality != metrictypes.Multiple && query.Aggregations[0].Temporality != metrictypes.Unknown {
		sb.Where(sb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}

	// the buffer holds both raw rows and the reduced catalog rows; the raw read
	// only wants the original series
	if tsTable == metricstelemetryschema.TimeseriesV4BufferLocalTableName {
		sb.Where(sb.EQ("is_reduced", false))
	}

	if !preparedWhereClause.IsEmpty() {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}

	sb.GroupBy("fingerprint")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("(%s) AS filtered_time_series", q), args, preparedWhereClause.Warnings, nil
}

func (b *StatementBuilder) buildTemporalAggregationCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	if query.Aggregations[0].Temporality == metrictypes.Delta {
		return b.buildTemporalAggDelta(ctx, start, end, query, samplesTable, timeSeriesCTE, timeSeriesCTEArgs)
	} else if query.Aggregations[0].Temporality != metrictypes.Multiple {
		return b.buildTemporalAggCumulativeOrUnspecified(ctx, start, end, query, samplesTable, timeSeriesCTE, timeSeriesCTEArgs)
	}
	return b.buildTemporalAggForMultipleTemporalities(ctx, start, end, query, samplesTable, timeSeriesCTE, timeSeriesCTEArgs)
}

func (b *StatementBuilder) buildTemporalAggDelta(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	sb := sqlbuilder.NewSelectBuilder()

	sb.Select("fingerprint")
	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}

	aggCol, err := metricstelemetryschema.AggregationColumnForSamplesTable(samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		// TODO(srikanthccv): should it be step interval or use [start_time_unix_nano](https://github.com/open-telemetry/opentelemetry-proto/blob/d3fb76d70deb0874692bd0ebe03148580d85f3bb/opentelemetry/proto/metrics/v1/metrics.proto#L400C11-L400C31)?
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	sb.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, samplesTable))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	if f := metricstelemetryschema.StaleMarkerFilterForSamplesTable(samplesTable); f != "" {
		sb.Where(f)
	}
	sb.GroupBy("fingerprint", "ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)
	sb.OrderBy("fingerprint", "ts")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
}

func (b *StatementBuilder) buildTemporalAggCumulativeOrUnspecified(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	baseSb := sqlbuilder.NewSelectBuilder()
	baseSb.Select("fingerprint")
	baseSb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for i, g := range query.GroupBy {
		baseSb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}

	aggCol, err := metricstelemetryschema.AggregationColumnForSamplesTable(samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	baseSb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	baseSb.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, samplesTable))
	baseSb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	baseSb.Where(
		baseSb.In("metric_name", query.Aggregations[0].MetricName),
		baseSb.GTE("unix_milli", start),
		baseSb.LT("unix_milli", end),
	)
	if f := metricstelemetryschema.StaleMarkerFilterForSamplesTable(samplesTable); f != "" {
		baseSb.Where(f)
	}
	baseSb.GroupBy("fingerprint", "ts")
	baseSb.GroupBy(GroupByAliases(query.GroupBy)...)
	baseSb.OrderBy("fingerprint", "ts")

	innerQuery, innerArgs := baseSb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)

	switch query.Aggregations[0].TimeAggregation {
	case metrictypes.TimeAggregationRate:
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for i, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", RateTmpl))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil

	case metrictypes.TimeAggregationIncrease:
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for i, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", IncreaseTmpl))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
	default:
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", innerQuery), innerArgs, nil
	}
}

func (b *StatementBuilder) buildTemporalAggForMultipleTemporalities(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())
	sb := sqlbuilder.NewSelectBuilder()

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}

	aggForDeltaTemporality, err := metricstelemetryschema.AggregationColumnForSamplesTable(samplesTable, metrictypes.Delta, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	aggForCumulativeTemporality, err := metricstelemetryschema.AggregationColumnForSamplesTable(samplesTable, metrictypes.Cumulative, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		aggForDeltaTemporality = fmt.Sprintf("%s/%d", aggForDeltaTemporality, stepSec)
	}

	switch query.Aggregations[0].TimeAggregation {
	case metrictypes.TimeAggregationRate:
		rateExpr := fmt.Sprintf(RateMultiTemporalityTmpl,
			aggForDeltaTemporality,
			aggForCumulativeTemporality, aggForCumulativeTemporality, aggForCumulativeTemporality,
			aggForCumulativeTemporality, aggForCumulativeTemporality,
		)
		sb.SelectMore(rateExpr)
	case metrictypes.TimeAggregationIncrease:
		increaseExpr := fmt.Sprintf(IncreaseMultiTemporality,
			aggForDeltaTemporality,
			aggForCumulativeTemporality, aggForCumulativeTemporality, aggForCumulativeTemporality,
			aggForCumulativeTemporality, aggForCumulativeTemporality,
		)
		sb.SelectMore(increaseExpr)
	default:
		expr := fmt.Sprintf(OthersMultiTemporality, aggForDeltaTemporality, aggForCumulativeTemporality)
		sb.SelectMore(expr)
	}

	sb.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, samplesTable))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	if f := metricstelemetryschema.StaleMarkerFilterForSamplesTable(samplesTable); f != "" {
		sb.Where(f)
	}
	sb.GroupBy("fingerprint", "ts", "temporality")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)
	queryWithoutWindow, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	queryWithWindowAndOrder := queryWithoutWindow + " WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint ASC, ts ASC) ORDER BY ts"
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", queryWithWindowAndOrder), args, nil
}

func (b *StatementBuilder) buildSpatialAggregationCTE(
	_ context.Context,
	_ uint64,
	_ uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select("ts")
	for i, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
	}
	sb.SelectMore(fmt.Sprintf("%s(per_series_value) AS value", query.Aggregations[0].SpaceAggregation.StringValue()))
	sb.From("__temporal_aggregation_cte")
	sb.Where(sb.EQ("isNaN(per_series_value)", 0))
	if query.Aggregations[0].ValueFilter != nil {
		sb.Where(sb.EQ("per_series_value", query.Aggregations[0].ValueFilter.Value))
	}
	sb.GroupBy("ts")
	sb.GroupBy(GroupByAliases(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args
}

func (b *StatementBuilder) BuildFinalSelect(
	cteFragments []string,
	cteArgs [][]any,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
) (*qbtypes.Statement, error) {
	metricType := query.Aggregations[0].Type
	spaceAgg := query.Aggregations[0].SpaceAggregation

	combined := querybuilder.CombineCTEs(cteFragments)

	var args []any
	for _, a := range cteArgs {
		args = append(args, a...)
	}

	sb := sqlbuilder.NewSelectBuilder()

	if metricType == metrictypes.HistogramType && spaceAgg.IsPercentile() {
		quantile := query.Aggregations[0].SpaceAggregation.Percentile()
		sb.Select("ts")
		for i, g := range query.GroupBy {
			sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
		}
		sb.SelectMore(fmt.Sprintf(
			"histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) AS value",
			quantile,
		))
		sb.From("__spatial_aggregation_cte")
		sb.GroupBy(GroupByAliases(query.GroupBy)...)
		sb.GroupBy("ts")
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}
	} else if metricType == metrictypes.HistogramType && spaceAgg == metrictypes.SpaceAggregationCount && query.Aggregations[0].ComparisonSpaceAggregationParam != nil {
		sb.Select("ts")

		for i, g := range query.GroupBy {
			sb.SelectMore(fmt.Sprintf("`%s`", GroupByColumnAlias(i, g.Name)))
		}

		aggQuery, err := metricstelemetryschema.AggregationQueryForHistogramCountWithParams(query.Aggregations[0].ComparisonSpaceAggregationParam)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(aggQuery)

		sb.From("__spatial_aggregation_cte")

		sb.GroupBy(GroupByAliases(query.GroupBy)...)
		sb.GroupBy("ts")

		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}
	} else {
		// for count aggregation on histograms with no params, the exact result of spatial aggregation can be sent forward
		sb.Select("*")
		sb.From("__spatial_aggregation_cte")
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Where(rewrittenExpr)
		}
	}
	sb.OrderBy(GroupByAliases(query.GroupBy)...)
	sb.OrderBy("ts")
	if metricType == metrictypes.HistogramType && spaceAgg == metrictypes.SpaceAggregationCount && query.Aggregations[0].ComparisonSpaceAggregationParam == nil {
		sb.OrderBy("toFloat64(le)")
	}

	q, a := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{Query: combined + q, Args: append(args, a...)}, nil
}

const histogramBucketKey = "le"

func isHistogramBucket(k qbtypes.GroupByKey) bool { return k.Name == histogramBucketKey }

func histogramCTEQuery(query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation] {
	query.GroupBy = append(slices.Clone(query.GroupBy), qbtypes.GroupByKey{
		TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: histogramBucketKey},
	})

	query.Aggregations = slices.Clone(query.Aggregations)
	if query.Aggregations[0].SpaceAggregation.IsPercentile() {
		query.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationRate
	} else {
		query.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationIncrease
	}
	query.Aggregations[0].SpaceAggregation = metrictypes.SpaceAggregationSum

	return query
}

func GroupByColumnAlias(i int, name string) string {
	if name == histogramBucketKey {
		return histogramBucketKey
	}
	return fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, name)
}

func GroupByAliases(groupBy []qbtypes.GroupByKey) []string {
	aliases := make([]string, 0, len(groupBy))
	for i := range groupBy {
		aliases = append(aliases, fmt.Sprintf("`%s`", GroupByColumnAlias(i, groupBy[i].Name)))
	}
	return aliases
}
