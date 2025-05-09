package telemetrytraces

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type TraceQueryBuilderOptions struct {
	MetadataStore    telemetrytypes.MetadataStore
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	Compiler         qbtypes.Compiler
	AggExprRewriter  qbtypes.AggExprRewriter
}

type traceQueryBuilder struct {
	opts            TraceQueryBuilderOptions
	fm              qbtypes.FieldMapper
	cb              qbtypes.ConditionBuilder
	compiler        qbtypes.Compiler
	aggExprRewriter qbtypes.AggExprRewriter
}

func NewTraceQueryBuilder(opts TraceQueryBuilderOptions) *traceQueryBuilder {
	return &traceQueryBuilder{
		opts:            opts,
		fm:              opts.FieldMapper,
		cb:              opts.ConditionBuilder,
		compiler:        opts.Compiler,
		aggExprRewriter: opts.AggExprRewriter,
	}
}

// BuildQuery builds a SQL query for traces based on the given parameters
func (b *traceQueryBuilder) BuildQuery(
	start, end int64,
	panelType qbv5.PanelType,
	query *qbv5.QueryBuilderQuery,
) (string, []any, error) {

	// Create SQL builder
	builder := sqlbuilder.ClickHouse.NewSelectBuilder()

	switch panelType {
	case qbv5.PanelTypeList:
		return b.buildListQuery(builder, query, start, end)
	case qbv5.PanelTypeLine, qbv5.PanelTypeBar:
		return b.buildTimeSeriesQuery(builder, query, start, end)
	case qbv5.PanelTypeTable:
		return b.buildTableQuery(builder, query, start, end)
	case qbv5.PanelTypeNumber:
		return b.buildNumberQuery(builder, query, start, end)
	case qbv5.PanelTypeTrace:
		return b.buildTraceQuery(builder, query, start, end)
	default:
		return "", nil, fmt.Errorf("unsupported panel type: %s", panelType)
	}
}

// buildListQuery builds a query for list panel type
func (b *traceQueryBuilder) buildListQuery(
	sb *sqlbuilder.SelectBuilder,
	query *qbv5.QueryBuilderQuery,
	start, end int64,
) (string, []any, error) {

	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	// Select default columns
	sb.Select(
		"timestamp",
		"trace_id",
		"span_id",
		"name",
		"resource_string_service$$name",
		"duration_nano/1000000",
		"response_status_code",
	)

	for _, field := range query.SelectFields {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), field, keys)
		if err != nil {
			return "", nil, err
		}
		sb.Select(colName)
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return "", nil, err
	}

	// Add order by
	// TODO: add order by

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sqlQuery, chArgs, nil
}

// buildTimeSeriesQuery builds a query for time series panel types
func (b *traceQueryBuilder) buildTimeSeriesQuery(
	sb *sqlbuilder.SelectBuilder,
	query *qbv5.QueryBuilderQuery,
	start, end int64,
) (string, []any, error) {

	allAggChArgs := []any{}
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	// Select time bucket
	sb.SelectMore(fmt.Sprintf("toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts", int64(query.StepInterval.Seconds())))

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(colName)
	}

	// Add aggregation
	for idx, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), agg.Expression)
		if err != nil {
			return "", nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return "", nil, err
	}

	// Group by time bucket and other dimensions
	sb.GroupBy("ALL")

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		sb.Having(query.Having.Expression)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	return sqlQuery, chArgs, nil
}

// buildTableQuery builds a query for table panel type
func (b *traceQueryBuilder) buildTableQuery(
	sb *sqlbuilder.SelectBuilder,
	query *qbv5.QueryBuilderQuery,
	start, end int64,
) (string, []any, error) {

	allAggChArgs := []any{}
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return "", nil, err
		}
		sb.SelectMore(colName)
	}

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx, agg := range query.Aggregations {
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), agg.Expression)
			if err != nil {
				return "", nil, err
			}
			allAggChArgs = append(allAggChArgs, chArgs...)
			sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
		}
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return "", nil, err
	}

	// Group by dimensions
	sb.GroupBy("ALL")

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		sb.Having(query.Having.Expression)
	}

	// Add order by
	// TODO: add order by

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	return sqlQuery, chArgs, nil
}

// buildNumberQuery builds a query for number panel type
func (b *traceQueryBuilder) buildNumberQuery(
	sb *sqlbuilder.SelectBuilder,
	query *qbv5.QueryBuilderQuery,
	start, end int64,
) (string, []any, error) {

	allAggChArgs := []any{}

	// Add aggregation
	if len(query.Aggregations) > 0 {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), query.Aggregations[0].Expression)
		if err != nil {
			return "", nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_0", rewritten))
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return "", nil, err
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	return sqlQuery, chArgs, nil
}

// buildTraceQuery builds a query for trace panel type
func (b *traceQueryBuilder) buildTraceQuery(
	sb *sqlbuilder.SelectBuilder,
	query *qbv5.QueryBuilderQuery,
	start, end int64,
) (string, []any, error) {
	return "", nil, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *traceQueryBuilder) addFilterCondition(sb *sqlbuilder.SelectBuilder, start, end int64, query *qbv5.QueryBuilderQuery) error {

	// add filter expression

	filterWhereClause, warnings, err := b.compiler.Compile(context.Background(), query.Filter.Expression)

	if err != nil {
		return err
	}

	if len(warnings) > 0 {
		fmt.Println("warnings", warnings)
	}

	if filterWhereClause != nil {
		sb.AddWhereClause(filterWhereClause)
	}

	// add time filter
	start_bucket := start/1000000000 - 1800
	end_bucket := end / 1000000000

	sb.Where(sb.GE("timestamp", start), sb.LE("timestamp", end), sb.GE("ts_bucket_start", start_bucket), sb.LE("ts_bucket_start", end_bucket))

	return nil
}
