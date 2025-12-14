package telemetrymeter

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type meterQueryStatementBuilder struct {
	logger                  *slog.Logger
	metadataStore           telemetrytypes.MetadataStore
	fm                      qbtypes.FieldMapper
	cb                      qbtypes.ConditionBuilder
	metricsStatementBuilder *telemetrymetrics.MetricQueryStatementBuilder
}

var _ qbtypes.StatementBuilder[qbtypes.MetricAggregation] = (*meterQueryStatementBuilder)(nil)

func NewMeterQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
) *meterQueryStatementBuilder {
	metricsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymeter")
	metricsStatementBuilder := telemetrymetrics.NewMetricQueryStatementBuilder(settings, metadataStore, fieldMapper, conditionBuilder)

	return &meterQueryStatementBuilder{
		logger:                  metricsSettings.Logger(),
		metadataStore:           metadataStore,
		fm:                      fieldMapper,
		cb:                      conditionBuilder,
		metricsStatementBuilder: metricsStatementBuilder,
	}
}

func (b *meterQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	_ qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	keySelectors := telemetrymetrics.GetKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	start, end = querybuilder.AdjustedMetricTimeRange(start, end, uint64(query.StepInterval.Seconds()), query)

	return b.buildPipelineStatement(ctx, start, end, query, keys, variables)
}

func (b *meterQueryStatementBuilder) buildPipelineStatement(
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

	if b.metricsStatementBuilder.CanShortCircuitDelta(query) {
		// spatial_aggregation_cte directly for certain delta queries
		if frag, args, err := b.buildTemporalAggDeltaFastPath(ctx, start, end, query, keys, variables); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	} else {
		// temporal_aggregation_cte
		if frag, args, err := b.buildTemporalAggregationCTE(ctx, start, end, query, keys, variables); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}

		// spatial_aggregation_cte
		frag, args := b.buildSpatialAggregationCTE(ctx, start, end, query, keys)
		if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	}

	// final SELECT
	return b.metricsStatementBuilder.BuildFinalSelect(cteFragments, cteArgs, query)
}

func (b *meterQueryStatementBuilder) buildTemporalAggDeltaFastPath(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	var filterWhere *querybuilder.PreparedWhereClause
	var err error
	stepSec := int64(query.StepInterval.Seconds())

	sb := sqlbuilder.NewSelectBuilder()

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, &g.TelemetryFieldKey, keys)
		if err != nil {
			return "", []any{}, err
		}
		sb.SelectMore(col)
	}

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	aggCol := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	sb.SelectMore(fmt.Sprintf("%s AS value", aggCol))
	sb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)
	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhere, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Logger:           b.logger,
			FieldMapper:      b.fm,
			ConditionBuilder: b.cb,
			FieldKeys:        keys,
			FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels"},
			Variables:        variables,
        }, start, end)
		if err != nil {
			return "", []any{}, err
		}
	}
	if filterWhere != nil {
		sb.AddWhereClause(filterWhere.WhereClause)
	}

	if query.Aggregations[0].Temporality != metrictypes.Unknown {
		sb.Where(sb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}
	sb.GroupBy("ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args, nil
}

func (b *meterQueryStatementBuilder) buildTemporalAggregationCTE(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	if query.Aggregations[0].Temporality == metrictypes.Delta {
		return b.buildTemporalAggDelta(ctx, start, end, query, keys, variables)
	}
	return b.buildTemporalAggCumulativeOrUnspecified(ctx, start, end, query, keys, variables)
}

func (b *meterQueryStatementBuilder) buildTemporalAggDelta(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	var filterWhere *querybuilder.PreparedWhereClause
	var err error

	stepSec := int64(query.StepInterval.Seconds())
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select("fingerprint")
	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))

	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, &g.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(col)
	}

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	aggCol := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality,
		query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	sb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LT("unix_milli", end),
	)

	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhere, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
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
	if filterWhere != nil {
		sb.AddWhereClause(filterWhere.WhereClause)
	}

	if query.Aggregations[0].Temporality != metrictypes.Unknown {
		sb.Where(sb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}

	sb.GroupBy("fingerprint", "ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	sb.OrderBy("fingerprint", "ts")

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
}

func (b *meterQueryStatementBuilder) buildTemporalAggCumulativeOrUnspecified(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (string, []any, error) {
	var filterWhere *querybuilder.PreparedWhereClause
	var err error
	stepSec := int64(query.StepInterval.Seconds())

	baseSb := sqlbuilder.NewSelectBuilder()
	baseSb.Select("fingerprint")
	baseSb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, &g.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		baseSb.SelectMore(col)
	}

	tbl := WhichSamplesTableToUse(start, end, query.Aggregations[0].Type, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	aggCol := AggregationColumnForSamplesTable(start, end, query.Aggregations[0].Type, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation, query.Aggregations[0].TableHints)
	baseSb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	baseSb.From(fmt.Sprintf("%s.%s AS points", DBName, tbl))
	baseSb.Where(
		baseSb.In("metric_name", query.Aggregations[0].MetricName),
		baseSb.GTE("unix_milli", start),
		baseSb.LT("unix_milli", end),
	)
	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhere, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
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
	if filterWhere != nil {
		baseSb.AddWhereClause(filterWhere.WhereClause)
	}

	if query.Aggregations[0].Temporality != metrictypes.Unknown {
		baseSb.Where(baseSb.ILike("temporality", query.Aggregations[0].Temporality.StringValue()))
	}
	baseSb.GroupBy("fingerprint", "ts")
	baseSb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	baseSb.OrderBy("fingerprint", "ts")

	innerQuery, innerArgs := baseSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	switch query.Aggregations[0].TimeAggregation {
	case metrictypes.TimeAggregationRate:
		rateExpr := fmt.Sprintf(telemetrymetrics.RateWithoutNegative, start, start)
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
		incExpr := fmt.Sprintf(telemetrymetrics.IncreaseWithoutNegative, start, start)
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.TelemetryFieldKey.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", incExpr))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil
	default:
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", innerQuery), innerArgs, nil
	}
}

func (b *meterQueryStatementBuilder) buildSpatialAggregationCTE(
	_ context.Context,
	_ uint64,
	_ uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any) {
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
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args
}
