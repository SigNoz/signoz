package telemetrytraces

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrUnsupportedAggregation = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported aggregation")
)

type TraceQueryStatementBuilderOpts struct {
	MetadataStore    telemetrytypes.MetadataStore
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	Compiler         qbtypes.FilterCompiler
	AggExprRewriter  qbtypes.AggExprRewriter
}

type traceQueryStatementBuilder struct {
	opts            TraceQueryStatementBuilderOpts
	fm              qbtypes.FieldMapper
	cb              qbtypes.ConditionBuilder
	compiler        qbtypes.FilterCompiler
	aggExprRewriter qbtypes.AggExprRewriter
}

var _ qbtypes.StatementBuilder[qbtypes.Aggregation] = (*traceQueryStatementBuilder)(nil)

func NewTraceQueryStatementBuilder(opts TraceQueryStatementBuilderOpts) *traceQueryStatementBuilder {
	return &traceQueryStatementBuilder{
		opts:            opts,
		fm:              opts.FieldMapper,
		cb:              opts.ConditionBuilder,
		compiler:        opts.Compiler,
		aggExprRewriter: opts.AggExprRewriter,
	}
}

// Build builds a SQL query for traces based on the given parameters
func (b *traceQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
) (*qbtypes.Statement, error) {

	keySelectors, err := getKeySelectors(query)
	if err != nil {
		return nil, err
	}
	keys, err := b.opts.MetadataStore.GetKeysMulti(context.Background(), keySelectors)
	if err != nil {
		return nil, err
	}

	// Create SQL builder
	q := sqlbuilder.ClickHouse.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(q, query, start, end, keys)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(q, query, start, end, keys)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(q, query, start, end, keys)
	}

	return nil, fmt.Errorf("unsupported request type: %s", requestType)
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.Aggregation]) ([]*telemetrytypes.FieldKeySelector, error) {
	var keySelectors []*telemetrytypes.FieldKeySelector

	for idx := range query.Aggregations {
		aggExpr := query.Aggregations[idx]
		selectors := querybuilder.QueryStringToKeysSelectors(aggExpr.Expression)
		keySelectors = append(keySelectors, selectors...)
	}

	whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
	keySelectors = append(keySelectors, whereClauseSelectors...)

	return keySelectors, nil
}

// buildListQuery builds a query for list panel type
func (b *traceQueryStatementBuilder) buildListQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {

	// Select default columns
	sb.Select(
		"timestamp",
		"trace_id",
		"span_id",
		"name",
		"resource_string_service$$name",
		"duration_nano",
		"response_status_code",
	)

	for _, field := range query.SelectFields {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &field, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", colName, field.Name))
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	err := b.addFilterCondition(sb, start, end, query)
	if err != nil {
		return nil, err
	}

	// Add order by
	for _, orderBy := range query.Order {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &orderBy.Key.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", colName, orderBy.Direction))
	}

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: sqlQuery,
		Args:  chArgs,
	}, nil
}

func (b *traceQueryStatementBuilder) buildTimeSeriesQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	// Keep original column expressions so we can build the tuple
	colExprs := make([]string, 0, len(query.GroupBy))
	for _, gb := range query.GroupBy {
		colExpr, err := b.fm.ColumnExpressionFor(context.Background(), &gb.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", colExpr, gb.TelemetryFieldKey.Name))
		colExprs = append(colExprs, colExpr)
	}

	// Aggregations
	allAggChArgs := make([]any, 0)
	for i, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), agg.Expression)
		if err != nil {
			return nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, i))
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	if err := b.addFilterCondition(sb, start, end, query); err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.ClickHouse.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(cteSB, query, start, end, keys)
		if err != nil {
			return nil, err
		}

		// Constrain the main query to the rows that appear in the CTE.
		tuple := fmt.Sprintf("(%s)", strings.Join(colExprs, ", "))
		sb.Where(fmt.Sprintf("%s IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(colExprs, ", ")))

		// Group by all dimensions
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			sb.Having(query.Having.Expression)
		}

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = fmt.Sprintf("WITH __limit_cte AS (%s) %s", cteStmt.Query, mainSQL)
		finalArgs = append(cteStmt.Args, mainArgs...)

	} else {
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			sb.Having(query.Having.Expression)
		}

		finalSQL, finalArgs = sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	}

	return &qbtypes.Statement{
		Query: finalSQL,
		Args:  finalArgs,
	}, nil
}

// buildScalarQuery builds a query for scalar panel type
func (b *traceQueryStatementBuilder) buildScalarQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {

	allAggChArgs := []any{}

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", colName, groupBy.TelemetryFieldKey.Name))
	}

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			aggExpr := query.Aggregations[idx]
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(context.Background(), aggExpr.Expression)
			if err != nil {
				return nil, err
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
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy("ALL")

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		sb.Having(query.Having.Expression)
	}

	// Add order by
	for _, orderBy := range query.Order {
		colName, err := b.fm.ColumnExpressionFor(context.Background(), &orderBy.Key.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", colName, orderBy.Direction))
	}

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	sqlQuery, chArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)
	return &qbtypes.Statement{
		Query: sqlQuery,
		Args:  chArgs,
	}, nil
}

// buildTraceQuery builds a query for trace panel type
func (b *traceQueryStatementBuilder) buildTraceQuery(
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
	start, end int64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {
	return nil, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *traceQueryStatementBuilder) addFilterCondition(sb *sqlbuilder.SelectBuilder, start, end uint64, query qbtypes.QueryBuilderQuery[qbtypes.Aggregation]) error {

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
