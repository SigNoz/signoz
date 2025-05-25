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
	MetadataStore             telemetrytypes.MetadataStore
	FieldMapper               qbtypes.FieldMapper
	ConditionBuilder          qbtypes.ConditionBuilder
	ResourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	Compiler                  qbtypes.FilterCompiler
	AggExprRewriter           qbtypes.AggExprRewriter
}

type traceQueryStatementBuilder struct {
	opts            TraceQueryStatementBuilderOpts
	fm              qbtypes.FieldMapper
	cb              qbtypes.ConditionBuilder
	compiler        qbtypes.FilterCompiler
	aggExprRewriter qbtypes.AggExprRewriter
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*traceQueryStatementBuilder)(nil)

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
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
) (*qbtypes.Statement, error) {

	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)

	keySelectors := getKeySelectors(query)
	keys, err := b.opts.MetadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	// Create SQL builder
	q := sqlbuilder.ClickHouse.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(ctx, q, query, start, end, keys)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, q, query, start, end, keys)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, q, query, start, end, keys, false)
	}

	return nil, fmt.Errorf("unsupported request type: %s", requestType)
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector

	for idx := range query.Aggregations {
		aggExpr := query.Aggregations[idx]
		selectors := querybuilder.QueryStringToKeysSelectors(aggExpr.Expression)
		keySelectors = append(keySelectors, selectors...)
	}

	whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
	keySelectors = append(keySelectors, whereClauseSelectors...)

	return keySelectors
}

// buildListQuery builds a query for list panel type
func (b *traceQueryStatementBuilder) buildListQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

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
		colExpr, err := b.fm.ColumnExpressionFor(ctx, &field, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colExpr)
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query)
	if err != nil {
		return nil, err
	}

	// Add order by
	for _, orderBy := range query.Order {
		sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction))
	}

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	finalSQL := combineCTEs(cteFragments) + mainSQL
	finalArgs := prependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
}

func (b *traceQueryStatementBuilder) buildTimeSeriesQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (*qbtypes.Statement, error) {

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	// Keep original column expressions so we can build the tuple
	fieldNames := make([]string, 0, len(query.GroupBy))
	for _, gb := range query.GroupBy {
		colExpr, err := b.fm.ColumnExpressionFor(ctx, &gb.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colExpr)
		fieldNames = append(fieldNames, fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name))
	}

	// Aggregations
	allAggChArgs := make([]any, 0)
	for i, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, agg.Expression)
		if err != nil {
			return nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, i))
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query)
	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.ClickHouse.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, cteSB, query, start, end, keys, true)
		if err != nil {
			return nil, err
		}

		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", cteStmt.Query))
		cteArgs = append(cteArgs, cteStmt.Args)

		// Constrain the main query to the rows that appear in the CTE.
		tuple := fmt.Sprintf("(%s)", strings.Join(fieldNames, ", "))
		sb.Where(fmt.Sprintf("%s IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(fieldNames, ", ")))

		// Group by all dimensions
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			sb.Having(query.Having.Expression)
		}

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = combineCTEs(cteFragments) + mainSQL
		finalArgs = prependArgs(cteArgs, mainArgs)

	} else {
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			sb.Having(query.Having.Expression)
		}

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = combineCTEs(cteFragments) + mainSQL
		finalArgs = prependArgs(cteArgs, mainArgs)
	}

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
}

// buildScalarQuery builds a query for scalar panel type
func (b *traceQueryStatementBuilder) buildScalarQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	skipResourceCTE bool,
) (*qbtypes.Statement, error) {

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end); err != nil {
		return nil, err
	} else if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	// Add group by columns
	for _, groupBy := range query.GroupBy {
		colExpr, err := b.fm.ColumnExpressionFor(ctx, &groupBy.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colExpr)
	}

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			aggExpr := query.Aggregations[idx]
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, aggExpr.Expression)
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
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query)
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
		idx, ok := aggOrderBy(orderBy, query)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction))
		}
	}

	// if there is no order by, then use the __result_0 as the order by
	if len(query.Order) == 0 {
		sb.OrderBy("__result_0 DESC")
	}

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, allAggChArgs...)

	finalSQL := combineCTEs(cteFragments) + mainSQL
	finalArgs := prependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *traceQueryStatementBuilder) addFilterCondition(ctx context.Context, sb *sqlbuilder.SelectBuilder, start, end uint64, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) ([]string, error) {

	// add filter expression

	filterWhereClause, warnings, err := b.compiler.Compile(ctx, query.Filter.Expression)

	if err != nil {
		return nil, err
	}

	if filterWhereClause != nil {
		sb.AddWhereClause(filterWhereClause)
	}

	// add time filter
	startBucket := start/1000000000 - 1800
	endBucket := end / 1000000000

	sb.Where(sb.GE("timestamp", start), sb.LE("timestamp", end), sb.GE("ts_bucket_start", startBucket), sb.LE("ts_bucket_start", endBucket))

	return warnings, nil
}

// combineCTEs takes any number of individual CTE fragments like
//
//	"__resource_filter AS (...)", "__limit_cte AS (...)"
//
// and renders the final `WITH …` clause.
func combineCTEs(ctes []string) string {
	if len(ctes) == 0 {
		return ""
	}
	return "WITH " + strings.Join(ctes, ", ") + " "
}

// prependArgs ensures CTE arguments appear before main-query arguments
// in the final slice so their ordinal positions match the SQL string.
func prependArgs(cteArgs [][]any, mainArgs []any) []any {
	out := make([]any, 0, len(mainArgs)+len(cteArgs))
	for _, a := range cteArgs { // CTEs first, in declaration order
		out = append(out, a...)
	}
	return append(out, mainArgs...)
}

func aggOrderBy(k qbtypes.OrderBy, q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) (int, bool) {
	for i, agg := range q.Aggregations {
		if k.Key.Name == agg.Alias ||
			k.Key.Name == agg.Expression ||
			k.Key.Name == fmt.Sprintf("%d", i) {
			return i, true
		}
	}
	return 0, false
}

func (b *traceQueryStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
) (cteSQL string, cteArgs []any, err error) {

	stmt, err := b.buildResourceFilterCTE(ctx, query, start, end)
	if err != nil {
		return "", nil, err
	}

	sb.Where("resource_fingerprint IN (SELECT fingerprint FROM __resource_filter)")

	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args, nil
}

func (b *traceQueryStatementBuilder) buildResourceFilterCTE(
	ctx context.Context,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
) (*qbtypes.Statement, error) {

	return b.opts.ResourceFilterStmtBuilder.Build(
		ctx,
		start,
		end,
		qbtypes.RequestTypeRaw,
		query,
	)
}
