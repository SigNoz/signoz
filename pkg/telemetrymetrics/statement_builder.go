package telemetrymetrics

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/slices"
)

const (
	RateTmpl = `multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))`

	IncreaseTmpl = `multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window)`

	RateMultiTemporalityTmpl = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(row_number() OVER rate_window = 1, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s / (ts - lagInFrame(ts, 1) OVER rate_window), (%s - lagInFrame(%s, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))) AS per_series_value`

	IncreaseMultiTemporality = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(row_number() OVER rate_window = 1, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s, (%s - lagInFrame(%s, 1) OVER rate_window))) AS per_series_value`

	OthersMultiTemporality = `IF(LOWER(temporality) LIKE LOWER('delta'), %s, %s) AS per_series_value`
)

type MetricQueryStatementBuilder struct {
	logger        *slog.Logger
	metadataStore telemetrytypes.MetadataStore
	fm            qbtypes.FieldMapper
	cb            qbtypes.ConditionBuilder
	flagger       flagger.Flagger
}

var _ qbtypes.StatementBuilder[qbtypes.MetricAggregation] = (*MetricQueryStatementBuilder)(nil)

func NewMetricQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	flagger flagger.Flagger,
) *MetricQueryStatementBuilder {
	metricsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymetrics")
	return &MetricQueryStatementBuilder{
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
		selectors := querybuilder.QueryStringToKeysSelectors(groupBy.TelemetryFieldKey.Name)
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

func (b *MetricQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	_ qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	keySelectors := GetKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	start, end = querybuilder.AdjustedMetricTimeRange(start, end, uint64(query.StepInterval.Seconds()), query)

	return b.buildPipelineStatement(ctx, start, end, query, keys, variables)
}

func (b *MetricQueryStatementBuilder) buildPipelineStatement(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	origSpaceAgg := query.Aggregations[0].SpaceAggregation
	origTimeAgg := query.Aggregations[0].TimeAggregation
	origGroupBy := slices.Clone(query.GroupBy)

	if query.Aggregations[0].SpaceAggregation.IsPercentile() &&
		query.Aggregations[0].Type != metrictypes.ExpHistogramType {
		// add le in the group by if doesn't exist
		leExists := false
		for _, g := range query.GroupBy {
			if g.TelemetryFieldKey.Name == "le" {
				leExists = true
				break
			}
		}

		if leExists {
			// if the user themselves adds `le`, then we remove it from the original group by
			// this is to avoid preparing a query that returns `nan`s, see following query
			// SELECT
			// 		ts,
			// 		le,
			// 		histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.99) AS value
			// FROM __spatial_aggregation_cte
			// GROUP BY
			// 		le,
			// 		ts

			origGroupBy = slices.DeleteFunc(origGroupBy, func(k qbtypes.GroupByKey) bool { return k.Name == "le" })
		} else {
			query.GroupBy = append(query.GroupBy, qbtypes.GroupByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "le"},
			})
		}

		// make the time aggregation rate and space aggregation sum
		query.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationRate
		query.Aggregations[0].SpaceAggregation = metrictypes.SpaceAggregationSum
	}

	var timeSeriesCTE string
	var timeSeriesCTEArgs []any
	var err error

	// time_series_cte
	// this is applicable for all the queries
	if timeSeriesCTE, timeSeriesCTEArgs, err = b.buildTimeSeriesCTE(ctx, start, end, query, keys, variables); err != nil {
		return nil, err
	}

	if qbtypes.CanShortCircuitDelta(query.Aggregations[0]) {
		// spatial_aggregation_cte directly for certain delta queries
		if frag, args, err := b.buildTemporalAggDeltaFastPath(start, end, query, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	} else {
		// temporal_aggregation_cte
		if frag, args, err := b.buildTemporalAggregationCTE(ctx, start, end, query, keys, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}

		// spatial_aggregation_cte
		if frag, args, err := b.buildSpatialAggregationCTE(ctx, start, end, query, keys); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	}

	// reset the query to the original state
	query.Aggregations[0].SpaceAggregation = origSpaceAgg
	query.Aggregations[0].TimeAggregation = origTimeAgg
	query.GroupBy = origGroupBy

	// final SELECT
	return b.BuildFinalSelect(cteFragments, cteArgs, query)
}

func (b *MetricQueryStatementBuilder) buildTemporalAggDeltaFastPath(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	sb := sqlbuilder.NewSelectBuilder()

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(
		start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality,
		query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints,
	)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		// TODO(srikanthccv): should it be step interval or use [start_time_unix_nano](https://github.com/open-telemetry/opentelemetry-proto/blob/d3fb76d70deb0874692bd0ebe03148580d85f3bb/opentelemetry/proto/metrics/v1/metrics.proto#L400C11-L400C31)?
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	if query.Aggregations[0].SpaceAggregation.IsPercentile() &&
		query.Aggregations[0].Type == metrictypes.ExpHistogramType {
		aggCol = fmt.Sprintf("quantilesDDMerge(0.01, %f)(sketch)[1]", query.Aggregations[0].SpaceAggregation.Percentile())
	}

	sb.SelectMore(fmt.Sprintf("%s AS value", aggCol))

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	sb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	sb.GroupBy("ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *MetricQueryStatementBuilder) buildTimeSeriesCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	var preparedWhereClause *querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Logger:           b.logger,
			FieldMapper:      b.fm,
			ConditionBuilder: b.cb,
			FieldKeys:        keys,
			FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels"},
			Variables:        variables,
		}, start, end)
		if err != nil {
			return "", nil, err
		}
	}

	start, end, _, tbl := WhichTSTableToUse(start, end, query.Aggregations[0].TableHints)
	sb.From(fmt.Sprintf("%s.%s", DBName, tbl))

	sb.Select("fingerprint")
	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, &g.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(col)
	}

	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LTE("unix_milli", end),
	)

	if query.Aggregations[0].Temporality != metrictypes.Multiple && query.Aggregations[0].Temporality != metrictypes.Unknown {
		sb.Where(sb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}

	// TODO configurable if we don't rollout the new un-normalized metrics
	sb.Where(
		sb.EQ("__normalized", false),
	)

	if preparedWhereClause != nil {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}

	sb.GroupBy("fingerprint")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("(%s) AS filtered_time_series", q), args, nil
}

func (b *MetricQueryStatementBuilder) buildTemporalAggregationCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	if query.Aggregations[0].Temporality == metrictypes.Delta {
		return b.buildTemporalAggDelta(ctx, start, end, query, timeSeriesCTE, timeSeriesCTEArgs)
	} else if query.Aggregations[0].Temporality != metrictypes.Multiple {
		return b.buildTemporalAggCumulativeOrUnspecified(ctx, start, end, query, timeSeriesCTE, timeSeriesCTEArgs)
	}
	return b.buildTemporalAggForMultipleTemporalities(ctx, start, end, query, timeSeriesCTE, timeSeriesCTEArgs)
}

func (b *MetricQueryStatementBuilder) buildTemporalAggDelta(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
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
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		// TODO(srikanthccv): should it be step interval or use [start_time_unix_nano](https://github.com/open-telemetry/opentelemetry-proto/blob/d3fb76d70deb0874692bd0ebe03148580d85f3bb/opentelemetry/proto/metrics/v1/metrics.proto#L400C11-L400C31)?
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	sb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	sb.GroupBy("fingerprint", "ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	sb.OrderBy("fingerprint", "ts")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
}

func (b *MetricQueryStatementBuilder) buildTemporalAggCumulativeOrUnspecified(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
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
	for _, g := range query.GroupBy {
		baseSb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if err != nil {
		return "", nil, err
	}
	baseSb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	baseSb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	baseSb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	baseSb.Where(
		baseSb.In("metric_name", query.Aggregations[0].MetricName),
		baseSb.GTE("unix_milli", start),
		baseSb.LT("unix_milli", end),
	)
	baseSb.GroupBy("fingerprint", "ts")
	baseSb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	baseSb.OrderBy("fingerprint", "ts")

	innerQuery, innerArgs := baseSb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)

	switch query.Aggregations[0].TimeAggregation {
	case metrictypes.TimeAggregationRate:
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", RateTmpl))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil

	case metrictypes.TimeAggregationIncrease:
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", IncreaseTmpl))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
	default:
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", innerQuery), innerArgs, nil
	}
}

func (b *MetricQueryStatementBuilder) buildTemporalAggForMultipleTemporalities(
	_ context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())
	sb := sqlbuilder.NewSelectBuilder()

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
	}

	aggForDeltaTemporality, err := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, metrictypes.Delta, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if err != nil {
		return "", nil, err
	}
	aggForCumulativeTemporality, err := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, metrictypes.Cumulative, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
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

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	sb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	sb.GroupBy("fingerprint", "ts", "temporality")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	queryWithoutWindow, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	queryWithWindowAndOrder := queryWithoutWindow + " WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint ASC, ts ASC) ORDER BY ts"
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", queryWithWindowAndOrder), args, nil
}

func (b *MetricQueryStatementBuilder) buildSpatialAggregationCTE(
	_ context.Context,
	_ uint64,
	_ uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {
	if query.Aggregations[0].SpaceAggregation.IsZero() {
		return "", nil, errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"invalid space aggregation, should be one of the following: [`sum`, `avg`, `min`, `max`, `count`, `p50`, `p75`, `p90`, `p95`, `p99`]",
		)
	}
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select("ts")
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
	}
	sb.SelectMore(fmt.Sprintf("%s(per_series_value) AS value", query.Aggregations[0].SpaceAggregation.StringValue()))
	sb.From("__temporal_aggregation_cte")
	sb.Where(sb.EQ("isNaN(per_series_value)", 0))
	if query.Aggregations[0].ValueFilter != nil {
		sb.Where(sb.EQ("per_series_value", query.Aggregations[0].ValueFilter.Value))
	}
	sb.GroupBy("ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *MetricQueryStatementBuilder) BuildFinalSelect(
	cteFragments []string,
	cteArgs [][]any,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
) (*qbtypes.Statement, error) {
	combined := querybuilder.CombineCTEs(cteFragments)

	var args []any
	for _, a := range cteArgs {
		args = append(args, a...)
	}

	sb := sqlbuilder.NewSelectBuilder()

	var quantile float64
	if query.Aggregations[0].SpaceAggregation.IsPercentile() {
		quantile = query.Aggregations[0].SpaceAggregation.Percentile()
	}

	if quantile != 0 && query.Aggregations[0].Type != metrictypes.ExpHistogramType {
		sb.Select("ts")
		for _, g := range query.GroupBy {
			sb.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		sb.SelectMore(fmt.Sprintf(
			"histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) AS value",
			quantile,
		))
		sb.From("__spatial_aggregation_cte")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		sb.GroupBy("ts")
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			sb.Having(rewrittenExpr)
		}
	} else {
		sb.Select("*")
		sb.From("__spatial_aggregation_cte")
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			sb.Where(rewrittenExpr)
		}
	}
	sb.OrderBy(querybuilder.GroupByKeys(query.GroupBy)...)
	sb.OrderBy("ts")

	q, a := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{Query: combined + q, Args: append(args, a...)}, nil
}
