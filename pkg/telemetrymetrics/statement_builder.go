package telemetrymetrics

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

const (
	RateWithoutNegative     = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window))`
	IncreaseWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, per_series_value, ((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window)) * (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window))`
)

type metricQueryStatementBuilder struct {
	logger        *slog.Logger
	metadataStore telemetrytypes.MetadataStore
	fm            qbtypes.FieldMapper
	cb            qbtypes.ConditionBuilder
}

var _ qbtypes.StatementBuilder[qbtypes.MetricAggregation] = (*metricQueryStatementBuilder)(nil)

func NewMetricQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
) *metricQueryStatementBuilder {
	metricsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymetrics")
	return &metricQueryStatementBuilder{
		logger:        metricsSettings.Logger(),
		metadataStore: metadataStore,
		fm:            fieldMapper,
		cb:            conditionBuilder,
	}
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) []*telemetrytypes.FieldKeySelector {
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
	}
	return keySelectors
}

func (b *metricQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	_ qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
) (*qbtypes.Statement, error) {
	keySelectors := getKeySelectors(query)
	keys, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	return b.buildPipelineStatement(ctx, start, end, query, keys)
}

// Fast‑path (no fingerprint grouping)
// canShortCircuitDelta returns true if we can use the optimized query
// for the given query
// This is used to avoid the group by fingerprint thus improving the performance
// for certain queries
// cases where we can short circuit:
// 1. time aggregation = (rate|increase) and space aggregation = sum
//   - rate = sum(value)/step, increase = sum(value) - sum of sums is same as sum of all values
//
// 2. time aggregation = sum and space aggregation = sum
//   - sum of sums is same as sum of all values
//
// 3. time aggregation = min and space aggregation = min
//   - min of mins is same as min of all values
//
// 4. time aggregation = max and space aggregation = max
//   - max of maxs is same as max of all values
//
// 5. special case exphist, there is no need for per series/fingerprint aggregation
// we can directly use the quantilesDDMerge function
//
// all of this is true only for delta metrics
func (b *metricQueryStatementBuilder) canShortCircuitDelta(q qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) bool {
	if q.Aggregations[0].Temporality != metrictypes.Delta {
		return false
	}

	ta := q.Aggregations[0].TimeAggregation
	sa := q.Aggregations[0].SpaceAggregation

	if (ta == metrictypes.TimeAggregationRate || ta == metrictypes.TimeAggregationIncrease) && sa == metrictypes.SpaceAggregationSum {
		return true
	}
	if ta == metrictypes.TimeAggregationSum && sa == metrictypes.SpaceAggregationSum {
		return true
	}
	if ta == metrictypes.TimeAggregationMin && sa == metrictypes.SpaceAggregationMin {
		return true
	}
	if ta == metrictypes.TimeAggregationMax && sa == metrictypes.SpaceAggregationMax {
		return true
	}
	if q.Aggregations[0].Type == metrictypes.ExpHistogramType && sa.IsPercentile() {
		return true
	}
	return false
}

func (b *metricQueryStatementBuilder) buildPipelineStatement(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	origSpaceAgg := query.Aggregations[0].SpaceAggregation
	origTimeAgg := query.Aggregations[0].TimeAggregation
	origGroupBy := query.GroupBy

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

		// we need to add le in the group by if it doesn't exist
		if !leExists {
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
	if timeSeriesCTE, timeSeriesCTEArgs, err = b.buildTimeSeriesCTE(ctx, start, end, query, keys); err != nil {
		return nil, err
	}

	if b.canShortCircuitDelta(query) {
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
	return b.buildFinalSelect(cteFragments, cteArgs, query)
}

func (b *metricQueryStatementBuilder) buildTemporalAggDeltaFastPath(
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

	aggCol := AggregationColumnForSamplesTable(
		start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality,
		query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints,
	)
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
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
	sb.GroupBy("ALL")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *metricQueryStatementBuilder) buildTimeSeriesCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	var filterWhere *sqlbuilder.WhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhere, _, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			FieldMapper:      b.fm,
			ConditionBuilder: b.cb,
			FieldKeys:        keys,
			FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels"},
		})
		if err != nil {
			return "", nil, err
		}
	}

	start, end, tbl := WhichTSTableToUse(start, end, query.Aggregations[0].TableHints)
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

	if query.Aggregations[0].Temporality != metrictypes.Unspecified {
		sb.Where(sb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}

	// TODO configurable if we don't rollout the new un-normalized metrics
	sb.Where(
		sb.EQ("__normalized", false),
	)

	if filterWhere != nil {
		sb.AddWhereClause(filterWhere)
	}

	sb.GroupBy("ALL")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("(%s) AS filtered_time_series", q), args, nil
}

func (b *metricQueryStatementBuilder) buildTemporalAggregationCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	if query.Aggregations[0].Temporality == metrictypes.Delta {
		return b.buildTemporalAggDelta(ctx, start, end, query, timeSeriesCTE, timeSeriesCTEArgs)
	}
	return b.buildTemporalAggCumulativeOrUnspecified(ctx, start, end, query, timeSeriesCTE, timeSeriesCTEArgs)
}

func (b *metricQueryStatementBuilder) buildTemporalAggDelta(
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

	aggCol := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
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
	sb.GroupBy("ALL")
	sb.OrderBy("fingerprint", "ts")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
}

func (b *metricQueryStatementBuilder) buildTemporalAggCumulativeOrUnspecified(
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

	aggCol := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	baseSb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	baseSb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	baseSb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	baseSb.Where(
		baseSb.In("metric_name", query.Aggregations[0].MetricName),
		baseSb.GTE("unix_milli", start),
		baseSb.LT("unix_milli", end),
	)
	baseSb.GroupBy("ALL")
	baseSb.OrderBy("fingerprint", "ts")

	innerQuery, innerArgs := baseSb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)

	switch query.Aggregations[0].TimeAggregation {
	case metrictypes.TimeAggregationRate:
		rateExpr := fmt.Sprintf(RateWithoutNegative, start, start)
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", rateExpr))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil

	case metrictypes.TimeAggregationIncrease:
		incExpr := fmt.Sprintf(IncreaseWithoutNegative, start, start)
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", incExpr))
		wrapped.From(fmt.Sprintf("(%s) WINDOW increase_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
	default:
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", innerQuery), innerArgs, nil
	}
}

func (b *metricQueryStatementBuilder) buildSpatialAggregationCTE(
	_ context.Context,
	_ uint64,
	_ uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {
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
	sb.GroupBy("ALL")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *metricQueryStatementBuilder) buildFinalSelect(
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
		for _, g := range query.GroupBy {
			sb.GroupBy(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		sb.GroupBy("ts")
	} else {
		sb.Select("*")
		sb.From("__spatial_aggregation_cte")
	}

	q, a := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{Query: combined + q, Args: append(args, a...)}, nil
}
