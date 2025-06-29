package telemetrytraces

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

type cteNode struct {
	name      string
	sql       string
	args      []any
	dependsOn []string
}

type traceOperatorCTEBuilder struct {
	ctx            context.Context
	start          uint64
	end            uint64
	operator       *qbtypes.QueryBuilderTraceOperator
	stmtBuilder    *traceOperatorStatementBuilder
	queries        map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
	ctes           []cteNode // Ordered list of CTEs
	cteNameToIndex map[string]int
	queryToCTEName map[string]string
	compositeQuery *qbtypes.CompositeQuery
}

func (b *traceOperatorCTEBuilder) collectQueries() error {
	// Get all query names referenced in the expression
	referencedQueries := b.operator.CollectReferencedQueries(b.operator.ParsedExpression)

	// Extract the actual queries from composite query
	for _, queryEnv := range b.compositeQuery.Queries {
		if queryEnv.Type == qbtypes.QueryTypeBuilder {
			if traceQuery, ok := queryEnv.Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]); ok {
				// Check if this query is referenced
				for _, refName := range referencedQueries {
					if traceQuery.Name == refName {
						queryCopy := traceQuery // Make a copy
						b.queries[refName] = &queryCopy
						break
					}
				}
			}
		}
	}

	// Verify all referenced queries were found
	for _, refName := range referencedQueries {
		if _, found := b.queries[refName]; !found {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "referenced query '%s' not found", refName)
		}
	}

	return nil
}

func (b *traceOperatorCTEBuilder) build(requestType qbtypes.RequestType) (*qbtypes.Statement, error) {
	// Build base spans CTE
	b.buildBaseSpansCTE()

	// Build CTEs for the expression tree
	rootCTEName, err := b.buildExpressionCTEs(b.operator.ParsedExpression)
	if err != nil {
		return nil, err
	}

	// Determine which CTE to select from
	selectFromCTE := rootCTEName
	if b.operator.ReturnSpansFrom != "" {
		// Find the CTE that corresponds to this query
		selectFromCTE = b.queryToCTEName[b.operator.ReturnSpansFrom]
		if selectFromCTE == "" {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"returnSpansFrom references query '%s' which has no corresponding CTE",
				b.operator.ReturnSpansFrom)
		}
	}

	// Build the final SELECT based on request type
	finalStmt, err := b.buildFinalQuery(selectFromCTE, requestType)
	if err != nil {
		return nil, err
	}

	// Combine all CTEs
	var cteFragments []string
	var cteArgs [][]any

	// Add time constants
	timeConstantsCTE := b.buildTimeConstantsCTE()
	cteFragments = append(cteFragments, timeConstantsCTE)

	// Add all CTEs in order
	for _, cte := range b.ctes {
		cteFragments = append(cteFragments, fmt.Sprintf("%s AS (%s)", cte.name, cte.sql))
		cteArgs = append(cteArgs, cte.args)
	}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + finalStmt.Query
	finalArgs := querybuilder.PrependArgs(cteArgs, finalStmt.Args)

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: finalStmt.Warnings,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildTimeConstantsCTE() string {
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	return fmt.Sprintf(`
		toDateTime64(%d, 9) AS t_from,
		toDateTime64(%d, 9) AS t_to,
		%d AS bucket_from,
		%d AS bucket_to`,
		b.start, b.end, startBucket, endBucket)
}

func (b *traceOperatorCTEBuilder) buildBaseSpansCTE() {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"trace_id",
		"span_id",
		"parent_span_id",
		"name",
		"timestamp",
		"duration_nano AS durationNano",
		sqlbuilder.Escape("resource_string_service$$name")+" AS serviceName",
	)

	// Add any additional fields requested
	for _, field := range b.operator.SelectFields {
		colExpr, err := b.stmtBuilder.fm.ColumnExpressionFor(b.ctx, &field, nil)
		if err != nil {
			// Skip fields that can't be mapped
			continue
		}
		sb.SelectMore(sqlbuilder.Escape(colExpr))
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Convert nanoseconds to seconds for DateTime64 comparison
	startSeconds := float64(b.start) / 1e9
	endSeconds := float64(b.end) / 1e9

	// Add time filter
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	sb.Where(
		sb.GE("timestamp", fmt.Sprintf("toDateTime64(%.9f, 9)", startSeconds)),
		sb.L("timestamp", fmt.Sprintf("toDateTime64(%.9f, 9)", endSeconds)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	b.addCTE("base_spans", sql, args, nil)

}

func (b *traceOperatorCTEBuilder) buildExpressionCTEs(expr *qbtypes.TraceOperand) (string, error) {
	if expr == nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "expression is nil")
	}

	if expr.QueryRef != nil {
		// Leaf node - build CTE for the query
		return b.buildQueryCTE(expr.QueryRef.Name)
	}

	// Operator node - build CTEs for children first
	var leftCTE, rightCTE string
	var err error

	if expr.Left != nil {
		leftCTE, err = b.buildExpressionCTEs(expr.Left)
		if err != nil {
			return "", err
		}
	}

	if expr.Right != nil {
		rightCTE, err = b.buildExpressionCTEs(expr.Right)
		if err != nil {
			return "", err
		}
	}

	// Build CTE for this operator
	return b.buildOperatorCTE(*expr.Operator, leftCTE, rightCTE)
}

func (b *traceOperatorCTEBuilder) buildQueryCTE(queryName string) (string, error) {
	query, exists := b.queries[queryName]
	if !exists {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "query %s not found", queryName)
	}

	cteName := queryName
	b.queryToCTEName[queryName] = cteName

	// Check if already built
	if _, exists := b.cteNameToIndex[cteName]; exists {
		return cteName, nil
	}

	// Get key selectors for the query
	keySelectors := getKeySelectors(*query)
	keys, err := b.stmtBuilder.metadataStore.GetKeysMulti(b.ctx, keySelectors)
	if err != nil {
		return "", err
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"trace_id",
		"span_id",
		"parent_span_id",
		"name",
		"timestamp",
		"durationNano",
		"serviceName",
		fmt.Sprintf("'%s' AS level", cteName),
	)
	sb.From("base_spans AS s")

	// Add filter conditions if present
	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhereClause, _, err := querybuilder.PrepareWhereClause(
			query.Filter.Expression,
			querybuilder.FilterExprVisitorOpts{
				FieldMapper:      b.stmtBuilder.fm,
				ConditionBuilder: b.stmtBuilder.cb,
				FieldKeys:        keys,
			},
		)
		if err != nil {
			return "", err
		}
		if filterWhereClause != nil {
			sb.AddWhereClause(filterWhereClause)
		}
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE(cteName, sql, args, []string{"base_spans"})

	return cteName, nil
}

func (b *traceOperatorCTEBuilder) buildOperatorCTE(op qbtypes.TraceOperatorType, leftCTE, rightCTE string) (string, error) {
	cteName := fmt.Sprintf("%s_%s_%s", leftCTE, strings.ReplaceAll(op.StringValue(), " ", "_"), rightCTE)

	// Check if already built
	if _, exists := b.cteNameToIndex[cteName]; exists {
		return cteName, nil
	}

	var sql string
	var args []any
	var dependsOn []string

	switch op {
	case qbtypes.TraceOperatorDirectDescendant:
		sql, args, dependsOn = b.buildDirectDescendantCTE(leftCTE, rightCTE)
	case qbtypes.TraceOperatorAnd:
		sql, args, dependsOn = b.buildAndCTE(leftCTE, rightCTE)
	case qbtypes.TraceOperatorOr:
		sql, dependsOn = b.buildOrCTE(leftCTE, rightCTE)
		args = nil // OR operations don't need args
	case qbtypes.TraceOperatorNot, qbtypes.TraceOperatorExclude:
		sql, args, dependsOn = b.buildNotCTE(leftCTE, rightCTE)
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %s", op.StringValue())
	}

	b.addCTE(cteName, sql, args, dependsOn)
	return cteName, nil
}

func (b *traceOperatorCTEBuilder) buildDirectDescendantCTE(parentCTE, childCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"c.trace_id",
		"c.span_id",
		"c.parent_span_id",
		"c.name",
		"c.timestamp",
		"c.durationNano",
		"c.serviceName",
		fmt.Sprintf("'%s' AS level", childCTE),
	)
	sb.From(fmt.Sprintf("%s AS c", childCTE))
	sb.JoinWithOption(
		sqlbuilder.InnerJoin,
		fmt.Sprintf("%s AS p", parentCTE),
		"p.trace_id = c.trace_id AND p.span_id = c.parent_span_id",
	)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{parentCTE, childCTE}
}

func (b *traceOperatorCTEBuilder) buildAndCTE(leftCTE, rightCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"l.trace_id",
		"l.span_id",
		"l.parent_span_id",
		"l.name",
		"l.timestamp",
		"l.durationNano",
		"l.serviceName",
		"l.level",
	)
	sb.From(fmt.Sprintf("%s AS l", leftCTE))
	sb.JoinWithOption(
		sqlbuilder.InnerJoin,
		fmt.Sprintf("%s AS r", rightCTE),
		"l.trace_id = r.trace_id AND l.span_id = r.span_id",
	)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildOrCTE(leftCTE, rightCTE string) (string, []string) {
	sql := fmt.Sprintf(`
		SELECT * FROM %s
		UNION DISTINCT
		SELECT * FROM %s
	`, leftCTE, rightCTE)

	return sql, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildNotCTE(leftCTE, rightCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"l.trace_id",
		"l.span_id",
		"l.parent_span_id",
		"l.name",
		"l.timestamp",
		"l.durationNano",
		"l.serviceName",
		"l.level",
	)
	sb.From(fmt.Sprintf("%s AS l", leftCTE))
	sb.Where(fmt.Sprintf(
		"NOT EXISTS (SELECT 1 FROM %s AS r WHERE r.trace_id = l.trace_id AND r.span_id = l.span_id)",
		rightCTE,
	))

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildFinalQuery(selectFromCTE string, requestType qbtypes.RequestType) (*qbtypes.Statement, error) {
	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(selectFromCTE)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(selectFromCTE)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(selectFromCTE)
	default:
		return nil, fmt.Errorf("unsupported request type: %s", requestType)
	}
}

func (b *traceOperatorCTEBuilder) buildListQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// Select default columns
	sb.Select(
		"timestamp",
		"trace_id",
		"span_id",
		"name",
		"serviceName",
		"durationNano",
		"parent_span_id",
	)

	// Add any additional select fields
	for _, field := range b.operator.SelectFields {
		colExpr, err := b.stmtBuilder.fm.ColumnExpressionFor(b.ctx, &field, nil)
		if err != nil {
			continue
		}
		sb.SelectMore(sqlbuilder.Escape(colExpr))
	}

	sb.From(selectFromCTE)

	// For span results, only timestamp ordering makes sense
	sb.OrderBy("timestamp DESC")

	// Add limit
	if b.operator.Limit > 0 {
		sb.Limit(b.operator.Limit)
	} else {
		sb.Limit(100)
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildTimeSeriesQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// Add time bucketing
	sb.Select(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(b.operator.StepInterval.Seconds()),
	))

	// Add group by fields
	for _, gb := range b.operator.GroupBy {
		// For now, just use the field name directly
		// In a real implementation, you'd use the field mapper
		sb.SelectMore(fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name))
	}

	// Add aggregations
	for i := range b.operator.Aggregations {
		// Simple implementation - in reality, you'd use the aggExprRewriter
		sb.SelectMore(fmt.Sprintf("count(*) AS __result_%d", i))
	}

	sb.From(selectFromCTE)
	sb.GroupBy("ALL")

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildScalarQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	traceSubquery := fmt.Sprintf("SELECT DISTINCT trace_id FROM %s", selectFromCTE)

	// Keeping the return of current query same
	sb.Select(
		"any(root.serviceName) as `subQuery.serviceName`",
		"any(root.name) as `subQuery.name`",
		"count(bs.span_id) as span_count",
		"any(root.durationNano) as `subQuery.durationNano`",
		"result.trace_id as `subQuery.traceID`",
	)

	sb.From(fmt.Sprintf("(%s) result", traceSubquery))
	sb.JoinWithOption(sqlbuilder.InnerJoin, "base_spans bs", "result.trace_id = bs.trace_id")
	sb.JoinWithOption(sqlbuilder.InnerJoin, "base_spans root",
		"result.trace_id = root.trace_id AND root.parent_span_id = ''")

	sb.GroupBy("result.trace_id")

	// Handle ordering - update column references to match new aliases
	orderApplied := false
	for _, orderBy := range b.operator.Order {
		switch orderBy.Key.Name {
		case qbtypes.OrderByTraceDuration.StringValue():
			// Use root span duration for trace duration
			sb.OrderBy(fmt.Sprintf("`subQuery.durationNano` %s", orderBy.Direction.StringValue()))
			orderApplied = true
		case qbtypes.OrderBySpanCount.StringValue():
			// Use span count
			sb.OrderBy(fmt.Sprintf("span_count %s", orderBy.Direction.StringValue()))
			orderApplied = true
		default:
			// For other fields, try to map them (could be root span fields)
			sb.OrderBy(fmt.Sprintf("%s %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
			orderApplied = true
		}
	}

	// Default order by root span duration DESC if no order specified
	if !orderApplied {
		sb.OrderBy("`subQuery.durationNano` DESC")
	}

	// Add limit if specified
	if b.operator.Limit > 0 {
		sb.Limit(b.operator.Limit)
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) addCTE(name, sql string, args []any, dependsOn []string) {
	b.ctes = append(b.ctes, cteNode{
		name:      name,
		sql:       sql,
		args:      args,
		dependsOn: dependsOn,
	})
	b.cteNameToIndex[name] = len(b.ctes) - 1
}
