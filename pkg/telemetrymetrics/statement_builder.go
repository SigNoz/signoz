package telemetrymetrics

import (
	"context"
	"fmt"
	"log/slog"
	"time"

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

	// TODO(srikanthccv): move the missing-key detection into the where clause
	// visitor. Doing it here over the lexer-derived selectors can't tell a key
	// from a value, so dashboard variables and bare literals in value position
	// (e.g. `service.name = $service`) get flagged as missing keys. We still add
	// a labels fallback for any unresolved selector so the query can be built,
	// but we no longer emit a warning until the visitor can classify keys.
	for _, sel := range keySelectors {
		if _, ok := keys[sel.Name]; !ok {
			keys[sel.Name] = []*telemetrytypes.TelemetryFieldKey{{
				Name:          sel.Name,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Signal:        telemetrytypes.SignalMetrics,
			}}
		}
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

	if query.Aggregations[0].Type == metrictypes.HistogramType {
		// add le in the group by if doesn't exist
		leExists := false
		for _, g := range query.GroupBy {
			if g.Name == "le" {
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
		if query.Aggregations[0].SpaceAggregation.IsPercentile() {
			query.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationRate
		} else {
			query.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationIncrease
		}
		query.Aggregations[0].SpaceAggregation = metrictypes.SpaceAggregationSum
	}

	agg := query.Aggregations[0]

	// A reduced metric reads the raw buffer for recent short windows, and
	// samples_v4/agg (unioned with the reduced tables) otherwise. The buffer is
	// shaped exactly like samples_v4 / time_series_v4, so once the table names are
	// chosen the rest of the pipeline is unchanged.
	useBuffer := agg.Reduced &&
		end-start < oneDayInMilliseconds &&
		start >= uint64(time.Now().UnixMilli())-oneDayInMilliseconds

	samplesTable, _ := WhichSamplesTableToUse(start, end, agg.Type, agg.TimeAggregation, useBuffer, agg.TableHints)
	tsStart, tsEnd, _, tsTable := WhichTSTableToUse(start, end, useBuffer, agg.TableHints)

	var timeSeriesCTE string
	var timeSeriesCTEArgs []any
	var err error

	if timeSeriesCTE, timeSeriesCTEArgs, err = b.buildTimeSeriesCTE(ctx, tsStart, tsEnd, query, keys, variables, tsTable); err != nil {
		return nil, err
	}

	if qbtypes.CanShortCircuitDelta(query.Aggregations[0]) {
		// spatial_aggregation_cte directly for certain delta queries
		if frag, args, err := b.buildTemporalAggDeltaFastPath(start, end, query, samplesTable, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	} else {
		// temporal_aggregation_cte
		if frag, args, err := b.buildTemporalAggregationCTE(ctx, start, end, query, keys, samplesTable, timeSeriesCTE, timeSeriesCTEArgs); err != nil {
			return nil, err
		} else if frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}

		// spatial_aggregation_cte
		if frag, args := b.buildSpatialAggregationCTE(ctx, start, end, query, keys); frag != "" {
			cteFragments = append(cteFragments, frag)
			cteArgs = append(cteArgs, args)
		}
	}

	var reducedFragments []string
	var reducedArgs [][]any
	if agg.Reduced && !useBuffer {
		var tsCTE string
		var tsArgs []any
		if tsCTE, tsArgs, err = b.buildReducedTimeSeriesCTE(ctx, start, end, query, keys, variables); err != nil {
			return nil, err
		}
		if temporalFrag, temporalArgs, ok := b.buildReducedTemporalAggregationCTE(start, end, query, tsCTE, tsArgs); ok {
			spatialFrag, spatialArgs := b.buildReducedSpatialAggregationCTE(query)
			reducedFragments = []string{temporalFrag, spatialFrag}
			reducedArgs = [][]any{temporalArgs, spatialArgs}
		}
	}

	// reset the query to the original state
	query.Aggregations[0].SpaceAggregation = origSpaceAgg
	query.Aggregations[0].TimeAggregation = origTimeAgg
	query.GroupBy = origGroupBy

	mainStmt, err := b.BuildFinalSelect(cteFragments, cteArgs, query)
	if err != nil {
		return nil, err
	}
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
	for _, g := range query.GroupBy {
		orderBy = fmt.Sprintf("`%s`, ", g.Name) + orderBy
	}
	q := fmt.Sprintf("SELECT * FROM (%s) UNION ALL SELECT * FROM (%s) ORDER BY %s", main.Query, reduced.Query, orderBy)
	args := append(append([]any{}, main.Args...), reduced.Args...)
	warnings := append(append([]string{}, main.Warnings...), reduced.Warnings...)
	return &qbtypes.Statement{Query: q, Args: args, Warnings: warnings}, nil
}

func (b *MetricQueryStatementBuilder) buildReducedTimeSeriesCTE(
	ctx context.Context,
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

	sb.From(fmt.Sprintf("%s.%s", DBName, TimeseriesV4ReducedTableName))
	sb.Select("fingerprint")
	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, start, end, &g.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(col)
	}
	sb.Where(
		sb.In("metric_name", query.Aggregations[0].MetricName),
		sb.GTE("unix_milli", start),
		sb.LTE("unix_milli", end),
		sb.EQ("__normalized", false),
	)

	if !preparedWhereClause.IsEmpty() {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}
	sb.GroupBy("fingerprint")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("(%s) AS filtered_time_series", q), args, nil
}

func (b *MetricQueryStatementBuilder) buildReducedTemporalAggregationCTE(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, bool) {
	agg := query.Aggregations[0]
	stepSec := int64(query.StepInterval.Seconds())

	value, weight, ok := ReducedValueColumn(agg.Type, agg.SpaceAggregation)
	if !ok {
		return "", nil, false
	}

	// dedup recomputed buckets: latest computed_at wins per (series, 60s bucket)
	dedup := sqlbuilder.NewSelectBuilder()
	dedup.Select("reduced_fingerprint AS fingerprint", "unix_milli")
	dedup.SelectMore(fmt.Sprintf("argMax(%s, computed_at) AS value", value))
	if weight != "" {
		dedup.SelectMore(fmt.Sprintf("argMax(%s, computed_at) AS weight", weight))
	}
	dedup.From(fmt.Sprintf("%s.%s", DBName, WhichReducedSamplesTableToUse(agg.Type)))
	dedup.Where(
		dedup.In("metric_name", agg.MetricName),
		dedup.GTE("unix_milli", start),
		dedup.LT("unix_milli", end),
	)
	dedup.GroupBy("reduced_fingerprint", "unix_milli")
	dedupQuery, dedupArgs := dedup.BuildWithFlavor(sqlbuilder.ClickHouse)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fingerprint")
	sb.SelectMore(fmt.Sprintf("toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts", stepSec))
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}
	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", ReducedTimeAggregationColumn(agg.TimeAggregation, stepSec)))
	if weight != "" {
		// count_series is a series count, not additive over time, so the avg
		// denominator is reduced with avg
		sb.SelectMore("avg(weight) AS per_series_weight")
	}
	sb.From(fmt.Sprintf("(%s) AS points", dedupQuery))
	sb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	sb.GroupBy("fingerprint", "ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	initArgs := append(append([]any{}, dedupArgs...), timeSeriesCTEArgs...)
	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, initArgs...)
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, true
}

func (b *MetricQueryStatementBuilder) buildReducedSpatialAggregationCTE(
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
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}
	sb.SelectMore(spatial + " AS value")
	sb.From("__temporal_aggregation_cte")
	sb.GroupBy("ts")
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__spatial_aggregation_cte AS (%s)", q), args
}

func (b *MetricQueryStatementBuilder) buildTemporalAggDeltaFastPath(
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
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(
		samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation,
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

	sb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
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
	tsTable string,
) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	var preparedWhereClause querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:          ctx,
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

	sb.From(fmt.Sprintf("%s.%s", DBName, tsTable))

	sb.Select("fingerprint")
	for _, g := range query.GroupBy {
		col, err := b.fm.ColumnExpressionFor(ctx, start, end, &g.TelemetryFieldKey, keys)
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

	// the buffer holds both raw rows and the reduced catalog rows; the raw read
	// only wants the original series
	if tsTable == TimeseriesV4BufferLocalTableName {
		sb.Where(sb.EQ("is_reduced", false))
	}

	if !preparedWhereClause.IsEmpty() {
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

func (b *MetricQueryStatementBuilder) buildTemporalAggDelta(
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
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		// TODO(srikanthccv): should it be step interval or use [start_time_unix_nano](https://github.com/open-telemetry/opentelemetry-proto/blob/d3fb76d70deb0874692bd0ebe03148580d85f3bb/opentelemetry/proto/metrics/v1/metrics.proto#L400C11-L400C31)?
		aggCol = fmt.Sprintf("%s/%d", aggCol, stepSec)
	}

	sb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	sb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
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
	for _, g := range query.GroupBy {
		baseSb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}

	aggCol, err := AggregationColumnForSamplesTable(samplesTable, query.Aggregations[0].Temporality, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	baseSb.SelectMore(fmt.Sprintf("%s AS per_series_value", aggCol))

	baseSb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
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
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.Name))
		}
		wrapped.SelectMore(fmt.Sprintf("%s AS per_series_value", RateTmpl))
		wrapped.From(fmt.Sprintf("(%s) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)", innerQuery))
		q, args := wrapped.BuildWithFlavor(sqlbuilder.ClickHouse, innerArgs...)
		return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", q), args, nil

	case metrictypes.TimeAggregationIncrease:
		wrapped := sqlbuilder.NewSelectBuilder()
		wrapped.Select("ts")
		for _, g := range query.GroupBy {
			wrapped.SelectMore(fmt.Sprintf("`%s`", g.Name))
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
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}

	aggForDeltaTemporality, err := AggregationColumnForSamplesTable(samplesTable, metrictypes.Delta, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	aggForCumulativeTemporality, err := AggregationColumnForSamplesTable(samplesTable, metrictypes.Cumulative, query.Aggregations[0].TimeAggregation)
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

	sb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
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
) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select("ts")
	for _, g := range query.GroupBy {
		sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
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

func (b *MetricQueryStatementBuilder) BuildFinalSelect(
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
		for _, g := range query.GroupBy {
			sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
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
			rewrittenExpr, err := rewriter.RewriteForMetrics(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}
	} else if metricType == metrictypes.HistogramType && spaceAgg == metrictypes.SpaceAggregationCount && query.Aggregations[0].ComparisonSpaceAggregationParam != nil {
		sb.Select("ts")

		for _, g := range query.GroupBy {
			sb.SelectMore(fmt.Sprintf("`%s`", g.Name))
		}

		aggQuery, err := AggregationQueryForHistogramCountWithParams(query.Aggregations[0].ComparisonSpaceAggregationParam)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(aggQuery)

		sb.From("__spatial_aggregation_cte")

		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
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
	sb.OrderBy(querybuilder.GroupByKeys(query.GroupBy)...)
	sb.OrderBy("ts")
	if metricType == metrictypes.HistogramType && spaceAgg == metrictypes.SpaceAggregationCount && query.Aggregations[0].ComparisonSpaceAggregationParam == nil {
		sb.OrderBy("toFloat64(le)")
	}

	q, a := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{Query: combined + q, Args: append(args, a...)}, nil
}
