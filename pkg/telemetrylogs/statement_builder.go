package telemetrylogs

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type LogQueryStatementBuilderOpts struct {
	MetadataStore    telemetrytypes.MetadataStore
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	Compiler         qbtypes.FilterCompiler
	AggExprRewriter  qbtypes.AggExprRewriter
}

type logQueryStatementBuilder struct {
	opts            LogQueryStatementBuilderOpts
	fm              qbtypes.FieldMapper
	cb              qbtypes.ConditionBuilder
	compiler        qbtypes.FilterCompiler
	aggExprRewriter qbtypes.AggExprRewriter
}

var _ qbtypes.StatementBuilder = (*logQueryStatementBuilder)(nil)

func NewLogQueryStatementBuilder(opts LogQueryStatementBuilderOpts) *logQueryStatementBuilder {
	return &logQueryStatementBuilder{
		opts:            opts,
		fm:              opts.FieldMapper,
		cb:              opts.ConditionBuilder,
		compiler:        opts.Compiler,
		aggExprRewriter: opts.AggExprRewriter,
	}
}

// Build builds a SQL query for logs based on the given parameters
func (b *logQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery,
) (*qbtypes.Statement, error) {

	// Create SQL builder
	q := sqlbuilder.ClickHouse.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(q, query, start, end)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(q, query, start, end)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(q, query, start, end)
	}

	return nil, fmt.Errorf("unsupported request type: %s", requestType)
}

// buildListQuery builds a query for list panel type
func (b *logQueryStatementBuilder) buildListQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery,
	start, end uint64,
) (*qbtypes.Statement, error) {

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
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &field, keys)
		if err != nil {
			return nil, err
		}
		sb.Select(colName)
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return nil, err
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
	return &qbtypes.Statement{
		Query:    sqlQuery,
		Args:     chArgs,
		Warnings: warnings,
	}, nil
}

// buildTimeSeriesQuery builds a query for time series panel types
func (b *logQueryStatementBuilder) buildTimeSeriesQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery,
	start, end uint64,
) (*qbtypes.Statement, error) {

	allAggChArgs := []any{}
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	// Select time bucket
	sb.SelectMore(fmt.Sprintf("toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts", int64(query.StepInterval.Seconds())))

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colName)
	}

	// Add aggregation
	for idx := range query.Aggregations {
		agg, ok := query.Aggregations[idx].(qbtypes.Aggregation)
		if !ok {
			continue
		}

		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), agg.Expression)
		if err != nil {
			return nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return nil, err
	}

	// Group by time bucket and other dimensions
	sb.GroupBy("ALL")

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		sb.Having(query.Having.Expression)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	return &qbtypes.Statement{
		Query:    sqlQuery,
		Args:     chArgs,
		Warnings: warnings,
	}, nil
}

// buildTableQuery builds a query for table panel type
func (b *logQueryStatementBuilder) buildScalarQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery,
	start, end uint64,
) (*qbtypes.Statement, error) {

	allAggChArgs := []any{}
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colName)
	}

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			agg, ok := query.Aggregations[idx].(qbtypes.Aggregation)
			if !ok {
				continue
			}
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), agg.Expression)
			if err != nil {
				return nil, err
			}
			allAggChArgs = append(allAggChArgs, chArgs...)
			sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
		}
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return nil, err
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
	return &qbtypes.Statement{
		Query:    sqlQuery,
		Args:     chArgs,
		Warnings: warnings,
	}, nil
}

// buildTraceQuery builds a query for trace panel type
func (b *logQueryStatementBuilder) buildTraceQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery,
	start, end int64,
) (*qbtypes.Statement, error) {
	return nil, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *logQueryStatementBuilder) addFilterCondition(sb *sqlbuilder.SelectBuilder, start, end uint64, query qbtypes.QueryBuilderQuery) ([]string, error) {

	// add filter expression

	filterWhereClause, warnings, err := b.compiler.Compile(context.Background(), query.Filter.Expression)

	if err != nil {
		return nil, err
	}

	if filterWhereClause != nil {
		sb.AddWhereClause(filterWhereClause)
	}

	// add time filter
	start_bucket := start/1000000000 - 1800
	end_bucket := end / 1000000000

	sb.Where(sb.GE("timestamp", start), sb.LE("timestamp", end), sb.GE("ts_bucket_start", start_bucket), sb.LE("ts_bucket_start", end_bucket))

	return warnings, nil
}
