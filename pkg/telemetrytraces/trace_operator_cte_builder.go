package telemetrytraces

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type cteNode struct {
	name      string
	sql       string
	args      []any
	dependsOn []string
}

type traceOperatorCTEBuilder struct {
	start          uint64
	end            uint64
	orgID          valuer.UUID
	operator       *qbtypes.QueryBuilderTraceOperator
	stmtBuilder    *traceOperatorStatementBuilder
	queries        map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
	ctes           []cteNode
	cteNameToIndex map[string]int
	queryToCTEName map[string]string
	compositeQuery *qbtypes.CompositeQuery
}

func (b *traceOperatorCTEBuilder) collectQueries() error {
	referencedQueries := b.operator.CollectReferencedQueries(b.operator.ParsedExpression)

	for _, queryEnv := range b.compositeQuery.Queries {
		if queryEnv.Type == qbtypes.QueryTypeBuilder {
			if traceQuery, ok := queryEnv.Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]); ok {
				for _, refName := range referencedQueries {
					if traceQuery.Name == refName {
						queryCopy := traceQuery
						b.queries[refName] = &queryCopy
						break
					}
				}
			}
		}
	}

	for _, refName := range referencedQueries {
		if _, found := b.queries[refName]; !found {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "referenced query '%s' not found", refName)
		}
	}

	return nil
}

func (b *traceOperatorCTEBuilder) build(ctx context.Context, requestType qbtypes.RequestType) (*qbtypes.Statement, error) {

	b.buildAllSpansCTE(ctx)

	rootCTEName, err := b.buildExpressionCTEs(ctx, b.operator.ParsedExpression)
	if err != nil {
		return nil, err
	}

	selectFromCTE := rootCTEName
	if b.operator.ReturnSpansFrom != "" {
		sourceQueryCTE := b.queryToCTEName[b.operator.ReturnSpansFrom]
		if sourceQueryCTE == "" {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"returnSpansFrom references query '%s' which has no corresponding CTE",
				b.operator.ReturnSpansFrom)
		}
		filteredCTEName := fmt.Sprintf("__return_from_%s", b.operator.ReturnSpansFrom)

		// rootCTEName holds one row per matching *span*, not per *trace*, so it can
		// contain many rows for the same trace_id. DISTINCT de-duplicates that set
		// before ClickHouse builds the hash table for the IN check, keeping memory
		// usage proportional to the number of distinct traces rather than spans.
		matchingTracedSB := sqlbuilder.NewSelectBuilder()
		matchingTracedSB.Select("DISTINCT trace_id")
		matchingTracedSB.From(rootCTEName)
		matchedTracesSQL, matchedTracesArgs := matchingTracedSB.BuildWithFlavor(sqlbuilder.ClickHouse)

		filteredSB := sqlbuilder.NewSelectBuilder()
		filteredSB.Select("*")
		filteredSB.From(sourceQueryCTE)
		filteredSB.Where(fmt.Sprintf("trace_id IN (%s)", matchedTracesSQL))
		filteredSQL, filteredArgs := filteredSB.BuildWithFlavor(sqlbuilder.ClickHouse, matchedTracesArgs...)

		b.addCTE(filteredCTEName, filteredSQL, filteredArgs, []string{sourceQueryCTE, rootCTEName})
		selectFromCTE = filteredCTEName
	}

	finalStmt, err := b.buildFinalQuery(ctx, selectFromCTE, requestType)
	if err != nil {
		return nil, err
	}

	var cteFragments []string
	var cteArgs [][]any

	timeConstantsCTE := b.buildTimeConstantsCTE()
	cteFragments = append(cteFragments, timeConstantsCTE)

	for _, cte := range b.ctes {
		cteFragments = append(cteFragments, fmt.Sprintf("%s AS (%s)", cte.name, cte.sql))
		cteArgs = append(cteArgs, cte.args)
	}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + finalStmt.Query + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, finalStmt.Args)

	b.stmtBuilder.logger.DebugContext(ctx, "Final trace operator query built",
		slog.String("operator_expression", b.operator.Expression),
		slog.Int("cte_count", len(cteFragments)),
		slog.Int("args_count", len(finalArgs)))

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: finalStmt.Warnings,
	}, nil
}

// Will be used in Indirect descendant Query, will not be used in any other query.
func (b *traceOperatorCTEBuilder) buildAllSpansCTE(ctx context.Context) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("*")
	sb.SelectMore(sqlbuilder.Escape("resource_string_service$$name") + " AS `service.name`")

	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds
	sb.Where(
		sb.GE("timestamp", fmt.Sprintf("%d", b.start)),
		sb.L("timestamp", fmt.Sprintf("%d", b.end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.stmtBuilder.logger.DebugContext(ctx, "Built all_spans CTE")
	b.addCTE("all_spans", sql, args, nil)
}

func (b *traceOperatorCTEBuilder) buildTimeConstantsCTE() string {
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	return fmt.Sprintf(`toDateTime64(%d, 9) AS t_from, toDateTime64(%d, 9) AS t_to, %d AS bucket_from, %d AS bucket_to`, b.start, b.end, startBucket, endBucket)
}

func (b *traceOperatorCTEBuilder) buildResourceFilterCTE(ctx context.Context, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) (*qbtypes.Statement, error) {
	return b.stmtBuilder.resourceFilterStmtBuilder.Build(
		ctx,
		b.orgID,
		b.start,
		b.end,
		qbtypes.RequestTypeRaw,
		query,
		nil,
	)
}

func (b *traceOperatorCTEBuilder) buildExpressionCTEs(ctx context.Context, expr *qbtypes.TraceOperand) (string, error) {
	if expr == nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "expression is nil")
	}

	if expr.QueryRef != nil {
		return b.buildQueryCTE(ctx, expr.QueryRef.Name)
	}

	var leftCTE, rightCTE string
	var err error

	if expr.Left != nil {
		leftCTE, err = b.buildExpressionCTEs(ctx, expr.Left)
		if err != nil {
			return "", err
		}
	}

	if expr.Right != nil {
		rightCTE, err = b.buildExpressionCTEs(ctx, expr.Right)
		if err != nil {
			return "", err
		}
	}

	return b.buildOperatorCTE(ctx, *expr.Operator, leftCTE, rightCTE)
}

func (b *traceOperatorCTEBuilder) buildQueryCTE(ctx context.Context, queryName string) (string, error) {
	query, exists := b.queries[queryName]
	if !exists {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "query %s not found", queryName)
	}

	cteName := queryName
	b.queryToCTEName[queryName] = cteName

	if _, exists := b.cteNameToIndex[cteName]; exists {
		return cteName, nil
	}

	keySelectors := getKeySelectors(*query)
	b.stmtBuilder.logger.DebugContext(ctx, "Key selectors for query", slog.String("query_name", queryName), slog.Any("key_selectors", keySelectors))
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(ctx, b.orgID, keySelectors)
	if err != nil {
		return "", err
	}
	b.stmtBuilder.logger.DebugContext(ctx, "Retrieved keys for query", slog.String("query_name", queryName), slog.Int("keys_count", len(keys)))

	// The CTE only selects spans matching the filter. Aggregations, group by
	// and order by run later in buildFinalQuery, so RequestTypeRaw is fine here.
	for _, action := range adjustTraceKeys(keys, query, qbtypes.RequestTypeRaw) {
		// TODO: change to debug level once we are confident about the behavior
		b.stmtBuilder.logger.InfoContext(ctx, "key adjustment action", slog.String("action", action))
	}

	// Build resource filter CTE for this specific query
	resourceFilterCTEName := fmt.Sprintf("__resource_filter_%s", cteName)
	resourceStmt, err := b.buildResourceFilterCTE(ctx, *query)
	if err != nil {
		return "", err
	}

	if resourceStmt != nil && resourceStmt.Query != "" {
		b.stmtBuilder.logger.DebugContext(ctx, "Built resource filter CTE for query",
			slog.String("query_name", queryName),
			slog.String("resource_filter_cte_name", resourceFilterCTEName))
		b.addCTE(resourceFilterCTEName, resourceStmt.Query, resourceStmt.Args, nil)
	} else {
		b.stmtBuilder.logger.DebugContext(ctx, "No resource filter needed for query", slog.String("query_name", queryName))
		resourceFilterCTEName = ""
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("*")
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	if resourceFilterCTEName != "" {
		sb.Where(fmt.Sprintf("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM %s)", resourceFilterCTEName))
	}
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds
	sb.Where(
		sb.GE("timestamp", fmt.Sprintf("%d", b.start)),
		sb.L("timestamp", fmt.Sprintf("%d", b.end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)

	if query.Filter != nil && query.Filter.Expression != "" {
		b.stmtBuilder.logger.DebugContext(ctx, "Applying filter to query CTE", slog.String("query_name", queryName), slog.String("filter", query.Filter.Expression))
		filterWhereClause, err := querybuilder.PrepareWhereClause(
			query.Filter.Expression,
			querybuilder.FilterExprVisitorOpts{
				Context:            ctx,
				OrgID:              b.orgID,
				Logger:             b.stmtBuilder.logger,
				FieldMapper:        b.stmtBuilder.fm,
				ConditionBuilder:   b.stmtBuilder.cb,
				FieldKeys:          keys,
				SkipResourceFilter: true,
				StartNs:            b.start,
				EndNs:              b.end,
			},
		)
		if err != nil {
			b.stmtBuilder.logger.ErrorContext(ctx, "Failed to prepare where clause", errors.Attr(err), slog.String("filter", query.Filter.Expression))
			return "", err
		}
		if !filterWhereClause.IsEmpty() {
			b.stmtBuilder.logger.DebugContext(ctx, "Adding where clause", slog.Any("where_clause", filterWhereClause.WhereClause))
			sb.AddWhereClause(filterWhereClause.WhereClause)
		} else {
			b.stmtBuilder.logger.WarnContext(ctx, "PrepareWhereClause returned nil", slog.String("filter", query.Filter.Expression))
		}
	} else {
		if query.Filter == nil {
			b.stmtBuilder.logger.DebugContext(ctx, "No filter for query CTE", slog.String("query_name", queryName), slog.String("reason", "filter is nil"))
		} else {
			b.stmtBuilder.logger.DebugContext(ctx, "No filter for query CTE", slog.String("query_name", queryName), slog.String("reason", "filter expression is empty"))
		}
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.stmtBuilder.logger.DebugContext(ctx, "Built query CTE",
		slog.String("query_name", queryName),
		slog.String("cte_name", cteName))
	dependencies := []string{}
	if resourceFilterCTEName != "" {
		dependencies = append(dependencies, resourceFilterCTEName)
	}
	b.addCTE(cteName, sql, args, dependencies)

	return cteName, nil
}

func sanitizeForSQL(s string) string {
	replacements := map[string]string{
		"=>":  "DIR_DESC",
		"->":  "INDIR_DESC",
		"&&":  "AND",
		"||":  "OR",
		"NOT": "NOT",
		" ":   "_",
	}

	result := s
	for old, new := range replacements {
		result = strings.ReplaceAll(result, old, new)
	}
	return result
}

func (b *traceOperatorCTEBuilder) buildOperatorCTE(ctx context.Context, op qbtypes.TraceOperatorType, leftCTE, rightCTE string) (string, error) {
	sanitizedOp := sanitizeForSQL(op.StringValue())
	cteName := fmt.Sprintf("%s_%s_%s", leftCTE, sanitizedOp, rightCTE)

	if _, exists := b.cteNameToIndex[cteName]; exists {
		return cteName, nil
	}

	var sql string
	var args []any
	var dependsOn []string

	switch op {
	case qbtypes.TraceOperatorDirectDescendant:
		sql, args, dependsOn = b.buildDirectDescendantCTE(leftCTE, rightCTE)
	case qbtypes.TraceOperatorIndirectDescendant:
		sql, dependsOn = b.buildIndirectDescendantCTE(leftCTE, rightCTE)
		args = nil
	case qbtypes.TraceOperatorAnd:
		sql, args, dependsOn = b.buildAndCTE(leftCTE, rightCTE)
	case qbtypes.TraceOperatorOr:
		sql, dependsOn = b.buildOrCTE(leftCTE, rightCTE)
		args = nil
	case qbtypes.TraceOperatorNot, qbtypes.TraceOperatorExclude:
		sql, args, dependsOn = b.buildNotCTE(leftCTE, rightCTE)
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %s", op.StringValue())
	}

	b.stmtBuilder.logger.DebugContext(ctx, "Built operator CTE",
		slog.String("operator", op.StringValue()),
		slog.String("cte_name", cteName),
		slog.String("left_cte", leftCTE),
		slog.String("right_cte", rightCTE))
	b.addCTE(cteName, sql, args, dependsOn)
	return cteName, nil
}

func (b *traceOperatorCTEBuilder) buildDirectDescendantCTE(parentCTE, childCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("p.*")

	sb.From(fmt.Sprintf("%s AS p", parentCTE))
	sb.JoinWithOption(
		sqlbuilder.InnerJoin,
		fmt.Sprintf("%s AS c", childCTE),
		"p.trace_id = c.trace_id AND p.span_id = c.parent_span_id",
	)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{parentCTE, childCTE}
}

func (b *traceOperatorCTEBuilder) buildIndirectDescendantCTE(ancestorCTE, descendantCTE string) (string, []string) {
	sql := fmt.Sprintf(`WITH RECURSIVE up AS (SELECT d.trace_id, d.span_id, d.parent_span_id, 0 AS depth FROM %s AS d UNION ALL SELECT p.trace_id, p.span_id, p.parent_span_id, up.depth + 1 FROM all_spans AS p JOIN up ON p.trace_id = up.trace_id AND p.span_id = up.parent_span_id WHERE up.depth < 100) SELECT DISTINCT a.* FROM %s AS a GLOBAL INNER JOIN (SELECT DISTINCT trace_id, span_id FROM up WHERE depth > 0 ) AS ancestors ON ancestors.trace_id = a.trace_id AND ancestors.span_id = a.span_id`, descendantCTE, ancestorCTE)
	return sql, []string{ancestorCTE, descendantCTE, "all_spans"}
}

func (b *traceOperatorCTEBuilder) buildAndCTE(leftCTE, rightCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()
	// Select all columns from left CTE
	sb.Select("l.*")
	sb.From(fmt.Sprintf("%s AS l", leftCTE))
	sb.JoinWithOption(
		sqlbuilder.InnerJoin,
		fmt.Sprintf("%s AS r", rightCTE),
		"l.trace_id = r.trace_id",
	)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildOrCTE(leftCTE, rightCTE string) (string, []string) {
	sql := fmt.Sprintf(`SELECT * FROM %s UNION DISTINCT SELECT * FROM %s`, leftCTE, rightCTE)

	return sql, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildNotCTE(leftCTE, rightCTE string) (string, []any, []string) {
	sb := sqlbuilder.NewSelectBuilder()

	// Handle unary NOT case (rightCTE is empty)
	if rightCTE == "" {
		sb.Select("b.*")
		sb.From("all_spans AS b")
		sb.Where(fmt.Sprintf(
			"b.trace_id GLOBAL NOT IN (SELECT DISTINCT trace_id FROM %s)",
			leftCTE,
		))
		sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		return sql, args, []string{"all_spans", leftCTE}
	}

	sb.Select("l.*")
	sb.From(fmt.Sprintf("%s AS l", leftCTE))
	sb.Where(fmt.Sprintf(
		"l.trace_id GLOBAL NOT IN (SELECT DISTINCT trace_id FROM %s)",
		rightCTE,
	))

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, []string{leftCTE, rightCTE}
}

func (b *traceOperatorCTEBuilder) buildFinalQuery(ctx context.Context, selectFromCTE string, requestType qbtypes.RequestType) (*qbtypes.Statement, error) {
	// Mirror statement_builder.go::Build: for raw queries, empty selectFields
	// expands to the full intrinsic + calculated set, and the list query also
	// pulls in the contextual columns so the consume layer can merge them
	// into unified attributes/resource (and parse events/links).
	isSelectFieldsEmpty := false
	if requestType == qbtypes.RequestTypeRaw {
		isSelectFieldsEmpty = len(b.operator.SelectFields) == 0
		if isSelectFieldsEmpty {
			b.operator.SelectFields = make([]telemetrytypes.TelemetryFieldKey, 0, len(IntrinsicSpanFields)+len(CalculatedSpanFields))
			b.operator.SelectFields = append(b.operator.SelectFields, IntrinsicSpanFields...)
			b.operator.SelectFields = append(b.operator.SelectFields, CalculatedSpanFields...)
		}
	}

	keySelectors := b.getKeySelectors()
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(ctx, b.orgID, keySelectors)
	if err != nil {
		return nil, err
	}
	b.adjustOperatorKeys(ctx, keys, requestType)

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(ctx, selectFromCTE, keys, isSelectFieldsEmpty)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, selectFromCTE, keys)
	case qbtypes.RequestTypeTrace:
		return b.buildTraceQuery(ctx, selectFromCTE, keys)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, selectFromCTE, keys)
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type: %s", requestType)
	}
}

func (b *traceOperatorCTEBuilder) buildListQuery(ctx context.Context, selectFromCTE string, keys map[string][]*telemetrytypes.TelemetryFieldKey, isSelectFieldsEmpty bool) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// Select core fields. These are always present so the trace operator
	// response shape is stable regardless of user-supplied selectFields.
	sb.Select(
		"timestamp",
		"trace_id",
		"span_id",
		"name",
		"duration_nano",
		"parent_span_id",
	)

	selectedFields := map[string]bool{
		"timestamp":      true,
		"trace_id":       true,
		"span_id":        true,
		"name":           true,
		"duration_nano":  true,
		"parent_span_id": true,
	}

	// Add selectFields since we now have all base table columns
	for i, field := range b.operator.SelectFields {
		if selectedFields[field.Name] {
			continue
		}
		expr, err := b.stmtBuilder.fm.ColumnExpressionFor(ctx, b.orgID, b.start, b.end, &field, telemetrytypes.FieldDataTypeUnspecified, keys)
		if err != nil {
			b.stmtBuilder.logger.WarnContext(ctx, "failed to map select field",
				slog.String("field", field.Name), errors.Attr(err))
			continue
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(expr), selectColumnAlias(i, field.Name)))
		selectedFields[field.Name] = true
	}

	if isSelectFieldsEmpty {
		for _, col := range ContextualSpanColumns {
			sb.SelectMore(col)
		}
	}

	sb.From(selectFromCTE)

	// Add order by support
	orderApplied := false
	for _, orderBy := range b.operator.Order {
		expr, err := b.stmtBuilder.fm.ColumnExpressionFor(ctx, b.orgID, b.start, b.end, &orderBy.Key.TelemetryFieldKey, telemetrytypes.FieldDataTypeUnspecified, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", sqlbuilder.Escape(expr), orderBy.Direction.StringValue()))
		orderApplied = true
	}

	if !orderApplied {
		sb.OrderBy("timestamp DESC")
	}

	if b.operator.Limit > 0 {
		sb.Limit(b.operator.Limit)
	} else {
		sb.Limit(100)
	}

	if b.operator.Offset > 0 {
		sb.Offset(b.operator.Offset)
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

// adjustOperatorKeys runs the same key adjustments as adjustTraceKeys, but on
// the operator's own fields. The operator has a different struct shape than
// QueryBuilderQuery, so we copy the relevant fields into a temp query, run
// the shared helpers, and copy the results back.
func (b *traceOperatorCTEBuilder) adjustOperatorKeys(ctx context.Context, keys map[string][]*telemetrytypes.TelemetryFieldKey, requestType qbtypes.RequestType) {
	mergeDeprecatedTraceKeys(keys)

	tmp := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Aggregations: b.operator.Aggregations,
		SelectFields: b.operator.SelectFields,
		GroupBy:      b.operator.GroupBy,
		Order:        b.operator.Order,
	}

	actions := querybuilder.AdjustKeysForAliasExpressions(&tmp, requestType)
	actions = append(actions, querybuilder.AdjustDuplicateKeys(&tmp)...)

	for idx := range tmp.SelectFields {
		actions = append(actions, adjustTraceKey(&tmp.SelectFields[idx], keys)...)
	}
	for idx := range tmp.GroupBy {
		actions = append(actions, adjustTraceKey(&tmp.GroupBy[idx].TelemetryFieldKey, keys)...)
	}
	for idx := range tmp.Order {
		actions = append(actions, adjustTraceKey(&tmp.Order[idx].Key.TelemetryFieldKey, keys)...)
	}

	// Copy back the slices the helpers can rewrite.
	b.operator.Aggregations = tmp.Aggregations
	b.operator.SelectFields = tmp.SelectFields
	b.operator.GroupBy = tmp.GroupBy
	b.operator.Order = tmp.Order

	for _, action := range actions {
		b.stmtBuilder.logger.InfoContext(ctx, "key adjustment action", slog.String("action", action))
	}
}

func (b *traceOperatorCTEBuilder) getKeySelectors() []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector

	for _, agg := range b.operator.Aggregations {
		selectors := querybuilder.QueryStringToKeysSelectors(agg.Expression)
		keySelectors = append(keySelectors, selectors...)
	}

	if b.operator.Filter != nil && b.operator.Filter.Expression != "" {
		selectors := querybuilder.QueryStringToKeysSelectors(b.operator.Filter.Expression)
		keySelectors = append(keySelectors, selectors...)
	}

	for _, gb := range b.operator.GroupBy {
		selectors := querybuilder.QueryStringToKeysSelectors(gb.Name)
		keySelectors = append(keySelectors, selectors...)
	}

	for _, order := range b.operator.Order {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          order.Key.Name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  order.Key.FieldContext,
			FieldDataType: order.Key.FieldDataType,
		})
	}

	for _, sf := range b.operator.SelectFields {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          sf.Name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  sf.FieldContext,
			FieldDataType: sf.FieldDataType,
		})
	}

	for i := range keySelectors {
		keySelectors[i].Signal = telemetrytypes.SignalTraces
	}

	return keySelectors
}

func (b *traceOperatorCTEBuilder) buildTimeSeriesQuery(ctx context.Context, selectFromCTE string, keys map[string][]*telemetrytypes.TelemetryFieldKey) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(b.operator.StepInterval.Seconds()),
	))

	for _, gb := range b.operator.GroupBy {
		expr, err := b.stmtBuilder.fm.ColumnExpressionFor(ctx, b.orgID, b.start, b.end, &gb.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.Name,
				err,
			)
		}
		sb.SelectMore(fmt.Sprintf("toString(%s) AS `%s`", sqlbuilder.Escape(expr), gb.Name))
	}

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			ctx,
			b.orgID,
			b.start,
			b.end,
			agg.Expression,
			uint64(b.operator.StepInterval.Seconds()),
			keys,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to rewrite aggregation expression '%s': %v",
				agg.Expression,
				err,
			)
		}
		allAggChArgs = append(allAggChArgs, chArgs...)

		alias := fmt.Sprintf("__result_%d", i)

		sb.SelectMore(fmt.Sprintf("%s AS %s", rewritten, alias))
	}

	sb.From(selectFromCTE)

	sb.GroupBy("ts")
	if len(b.operator.GroupBy) > 0 {
		groupByKeys := make([]string, len(b.operator.GroupBy))
		for i, gb := range b.operator.GroupBy {
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.Name)
		}
		sb.GroupBy(groupByKeys...)
	}

	// Add order by support
	for _, orderBy := range b.operator.Order {
		idx, ok := b.aggOrderBy(orderBy)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
		}
	}
	sb.OrderBy("ts desc")

	combinedArgs := allAggChArgs

	// Add HAVING clause if specified
	if err := b.addHavingClause(sb); err != nil {
		return nil, err
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildTraceSummaryCTE(selectFromCTE string) {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		"trace_id",
		"count() AS total_span_count",
	)

	sb.From("all_spans")
	sb.Where(fmt.Sprintf("trace_id GLOBAL IN (SELECT DISTINCT trace_id FROM %s)", selectFromCTE))
	sb.GroupBy("trace_id")

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE("trace_summary", sql, args, []string{"all_spans", selectFromCTE})
}

func (b *traceOperatorCTEBuilder) buildTraceQuery(ctx context.Context, selectFromCTE string, keys map[string][]*telemetrytypes.TelemetryFieldKey) (*qbtypes.Statement, error) {
	b.buildTraceSummaryCTE(selectFromCTE)

	sb := sqlbuilder.NewSelectBuilder()

	for _, gb := range b.operator.GroupBy {
		expr, err := b.stmtBuilder.fm.ColumnExpressionFor(ctx, b.orgID, b.start, b.end, &gb.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.Name,
				err,
			)
		}
		sb.SelectMore(fmt.Sprintf("toString(%s) AS `%s`", sqlbuilder.Escape(expr), gb.Name))
	}

	rateInterval := (b.end - b.start) / querybuilder.NsToSeconds

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			ctx,
			b.orgID,
			b.start,
			b.end,
			agg.Expression,
			rateInterval,
			keys,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to rewrite aggregation expression '%s': %v",
				agg.Expression,
				err,
			)
		}
		allAggChArgs = append(allAggChArgs, chArgs...)

		alias := fmt.Sprintf("__result_%d", i)

		sb.SelectMore(fmt.Sprintf("%s AS %s", rewritten, alias))
	}

	sb.Select(
		"any(root.timestamp) as timestamp",
		"any(root.`service.name`) as `service.name`",
		"any(root.name) as `name`",
		"summary.total_span_count as span_count", // Updated column name
		"any(root.duration_nano) as `duration_nano`",
		"root.trace_id as `trace_id`",
	)

	sb.From("all_spans as root")
	sb.JoinWithOption(
		sqlbuilder.InnerJoin,
		"trace_summary as summary",
		"root.trace_id = summary.trace_id",
	)
	sb.Where("root.parent_span_id = ''")

	sb.GroupBy("root.trace_id", "summary.total_span_count")
	if len(b.operator.GroupBy) > 0 {
		groupByKeys := make([]string, len(b.operator.GroupBy))
		for i, gb := range b.operator.GroupBy {
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.Name)
		}
		sb.GroupBy(groupByKeys...)
	}

	if err := b.addHavingClause(sb); err != nil {
		return nil, err
	}

	orderApplied := false
	for _, orderBy := range b.operator.Order {
		switch orderBy.Key.Name {
		case qbtypes.OrderByTraceDuration.StringValue():
			sb.OrderBy(fmt.Sprintf("`duration_nano` %s", orderBy.Direction.StringValue()))
			orderApplied = true
		case qbtypes.OrderBySpanCount.StringValue():
			sb.OrderBy(fmt.Sprintf("span_count %s", orderBy.Direction.StringValue()))
			orderApplied = true
		case "timestamp":
			sb.OrderBy(fmt.Sprintf("timestamp %s", orderBy.Direction.StringValue()))
			orderApplied = true
		default:
			aggIndex := -1
			for i, agg := range b.operator.Aggregations {
				if orderBy.Key.Name == agg.Alias || orderBy.Key.Name == fmt.Sprintf("__result_%d", i) {
					aggIndex = i
					break
				}
			}
			if aggIndex >= 0 {
				alias := fmt.Sprintf("__result_%d", aggIndex)
				if b.operator.Aggregations[aggIndex].Alias != "" {
					alias = b.operator.Aggregations[aggIndex].Alias
				}
				sb.OrderBy(fmt.Sprintf("%s %s", alias, orderBy.Direction.StringValue()))
				orderApplied = true
			} else {
				b.stmtBuilder.logger.WarnContext(ctx,
					"ignoring order by field that's not available in trace context",
					slog.String("field", orderBy.Key.Name))
			}
		}
	}

	if !orderApplied {
		sb.OrderBy("`duration_nano` DESC")
	}

	if b.operator.Limit > 0 {
		sb.Limit(b.operator.Limit)
	}

	combinedArgs := allAggChArgs

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildScalarQuery(ctx context.Context, selectFromCTE string, keys map[string][]*telemetrytypes.TelemetryFieldKey) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	for _, gb := range b.operator.GroupBy {
		expr, err := b.stmtBuilder.fm.ColumnExpressionFor(ctx, b.orgID, b.start, b.end, &gb.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.Name,
				err,
			)
		}
		sb.SelectMore(fmt.Sprintf("toString(%s) AS `%s`", sqlbuilder.Escape(expr), gb.Name))
	}

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			ctx,
			b.orgID,
			b.start,
			b.end,
			agg.Expression,
			uint64((b.end-b.start)/querybuilder.NsToSeconds),
			keys,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to rewrite aggregation expression '%s': %v",
				agg.Expression,
				err,
			)
		}
		allAggChArgs = append(allAggChArgs, chArgs...)

		alias := fmt.Sprintf("__result_%d", i)

		sb.SelectMore(fmt.Sprintf("%s AS %s", rewritten, alias))
	}

	sb.From(selectFromCTE)

	if len(b.operator.GroupBy) > 0 {
		groupByKeys := make([]string, len(b.operator.GroupBy))
		for i, gb := range b.operator.GroupBy {
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.Name)
		}
		sb.GroupBy(groupByKeys...)
	}

	// Add order by support
	for _, orderBy := range b.operator.Order {
		idx, ok := b.aggOrderBy(orderBy)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
		}
	}

	// Add default ordering if no orderBy specified
	if len(b.operator.Order) == 0 {
		sb.OrderBy("__result_0 DESC")
	}

	combinedArgs := allAggChArgs

	// Add HAVING clause if specified
	if err := b.addHavingClause(sb); err != nil {
		return nil, err
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) addHavingClause(sb *sqlbuilder.SelectBuilder) error {
	if b.operator.Having != nil && b.operator.Having.Expression != "" {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr, err := rewriter.RewriteForTraces(b.operator.Having.Expression, b.operator.Aggregations)
		if err != nil {
			return err
		}
		sb.Having(rewrittenExpr)
	}
	return nil
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

func (b *traceOperatorCTEBuilder) aggOrderBy(k qbtypes.OrderBy) (int, bool) {
	for i, agg := range b.operator.Aggregations {
		if k.Key.Name == agg.Alias ||
			k.Key.Name == agg.Expression ||
			k.Key.Name == fmt.Sprintf("__result_%d", i) {
			return i, true
		}
	}
	return 0, false
}
