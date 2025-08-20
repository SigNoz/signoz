package telemetrytraces

import (
	"context"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"strings"
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

func (b *traceOperatorCTEBuilder) build(requestType qbtypes.RequestType) (*qbtypes.Statement, error) {
	if len(b.queries) == 0 {
		if err := b.collectQueries(); err != nil {
			return nil, err
		}
	}

	err := b.buildBaseSpansCTE()
	if err != nil {
		return nil, err
	}

	rootCTEName, err := b.buildExpressionCTEs(b.operator.ParsedExpression)
	if err != nil {
		return nil, err
	}

	selectFromCTE := rootCTEName
	if b.operator.ReturnSpansFrom != "" {
		selectFromCTE = b.queryToCTEName[b.operator.ReturnSpansFrom]
		if selectFromCTE == "" {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"returnSpansFrom references query '%s' which has no corresponding CTE",
				b.operator.ReturnSpansFrom)
		}
	}

	finalStmt, err := b.buildFinalQuery(selectFromCTE, requestType)
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

func (b *traceOperatorCTEBuilder) buildBaseSpansCTE() error {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		"trace_id",
		"span_id",
		"parent_span_id",
		"name",
		"timestamp",
		"duration_nano",
		sqlbuilder.Escape("resource_string_service$$name")+" AS `service.name`",
		sqlbuilder.Escape("resource_string_service$$name"),
		sqlbuilder.Escape("resource_string_service$$name_exists"),
	)

	requiredFields := make(map[string]bool)
	for _, query := range b.queries {
		if query.Filter != nil && query.Filter.Expression != "" {
			selectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
			for _, selector := range selectors {
				requiredFields[selector.Name] = true
			}
		}
	}

	for _, field := range b.operator.SelectFields {
		requiredFields[field.Name] = true
	}

	for fieldName := range requiredFields {
		if fieldName == "service.name" {
			continue
		}
		// Skip span scope fields (isRoot, isEntryPoint) as they are computed conditions, not actual columns
		if strings.ToLower(fieldName) == SpanSearchScopeRoot || strings.ToLower(fieldName) == SpanSearchScopeEntryPoint {
			continue
		}
		sb.SelectMore(sqlbuilder.Escape(fieldName))
	}

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
	b.addCTE("base_spans", sql, args, nil)
	return nil
}

func (b *traceOperatorCTEBuilder) buildExpressionCTEs(expr *qbtypes.TraceOperand) (string, error) {
	if expr == nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "expression is nil")
	}

	if expr.QueryRef != nil {
		return b.buildQueryCTE(expr.QueryRef.Name)
	}

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

	return b.buildOperatorCTE(*expr.Operator, leftCTE, rightCTE)
}

func (b *traceOperatorCTEBuilder) buildQueryCTE(queryName string) (string, error) {
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
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(b.ctx, keySelectors)
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
		"duration_nano",
		"`service.name`",
		fmt.Sprintf("'%s' AS level", cteName),
	)
	sb.From("base_spans AS s")

	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhereClause, err := querybuilder.PrepareWhereClause(
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
			sb.AddWhereClause(filterWhereClause.WhereClause)
		}
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE(cteName, sql, args, []string{"base_spans"})

	return cteName, nil
}

func sanitizeForSQL(s string) string {
	replacements := map[string]string{
		"=>":  "DIRECT_DESC",
		"->":  "INDIRECT_DESC",
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

func (b *traceOperatorCTEBuilder) buildOperatorCTE(op qbtypes.TraceOperatorType, leftCTE, rightCTE string) (string, error) {
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
		"c.duration_nano",
		"c.`service.name`",
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
		"l.duration_nano",
		"l.`service.name`",
		"l.level",
	)
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
		"l.duration_nano",
		"l.`service.name`",
		"l.level",
	)
	sb.From(fmt.Sprintf("%s AS l", leftCTE))
	sb.Where(fmt.Sprintf(
		"NOT EXISTS (SELECT 1 FROM %s AS r WHERE r.trace_id = l.trace_id)",
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
	case qbtypes.RequestTypeTrace:
		return b.buildTraceQuery(selectFromCTE)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(selectFromCTE)
	default:
		return nil, fmt.Errorf("unsupported request type: %s", requestType)
	}
}

func (b *traceOperatorCTEBuilder) buildListQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		"timestamp",
		"trace_id",
		"span_id",
		"name",
		"service.name",
		"duration_nano",
		"parent_span_id",
	)

	for _, field := range b.operator.SelectFields {
		colExpr, err := b.stmtBuilder.fm.ColumnExpressionFor(b.ctx, &field, nil)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map select field '%s' in list query: %v",
				field.Name,
				err,
			)
		}
		sb.SelectMore(sqlbuilder.Escape(colExpr))
	}

	sb.From(selectFromCTE)

	sb.OrderBy("timestamp DESC")

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
		selectors := querybuilder.QueryStringToKeysSelectors(gb.TelemetryFieldKey.Name)
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

	for i := range keySelectors {
		keySelectors[i].Signal = telemetrytypes.SignalTraces
	}

	return keySelectors
}

func (b *traceOperatorCTEBuilder) buildTimeSeriesQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	stepIntervalSeconds := int64(b.operator.StepInterval.Seconds())
	if stepIntervalSeconds <= 0 {
		timeRangeSeconds := (b.end - b.start) / querybuilder.NsToSeconds
		if timeRangeSeconds > 3600 {
			stepIntervalSeconds = 300
		} else if timeRangeSeconds > 1800 {
			stepIntervalSeconds = 120
		} else {
			stepIntervalSeconds = 60
		}

		b.stmtBuilder.logger.WarnContext(b.ctx,
			"trace operator stepInterval not set, using default",
			"defaultSeconds", stepIntervalSeconds)
	}

	sb.Select(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		stepIntervalSeconds,
	))

	keySelectors := b.getKeySelectors()
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(b.ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	var allGroupByArgs []any

	for _, gb := range b.operator.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(
			b.ctx,
			&gb.TelemetryFieldKey,
			b.stmtBuilder.fm,
			b.stmtBuilder.cb,
			keys,
			telemetrytypes.FieldDataTypeString,
			"",
			nil,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.TelemetryFieldKey.Name,
				err,
			)
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
	}

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			b.ctx,
			agg.Expression,
			uint64(stepIntervalSeconds),
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
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name)
		}
		sb.GroupBy(groupByKeys...)
	}

	combinedArgs := append(allGroupByArgs, allAggChArgs...)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildTraceQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	keySelectors := b.getKeySelectors()
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(b.ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	var allGroupByArgs []any

	for _, gb := range b.operator.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(
			b.ctx,
			&gb.TelemetryFieldKey,
			b.stmtBuilder.fm,
			b.stmtBuilder.cb,
			keys,
			telemetrytypes.FieldDataTypeString,
			"",
			nil,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.TelemetryFieldKey.Name,
				err,
			)
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
	}

	rateInterval := (b.end - b.start) / querybuilder.NsToSeconds

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			b.ctx,
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

	traceSubquery := fmt.Sprintf("SELECT DISTINCT trace_id FROM %s", selectFromCTE)

	sb.Select(
		"any(timestamp) as timestamp",
		"any(`service.name`) as `service.name`",
		"any(name) as `name`",
		"count() as span_count",
		"any(duration_nano) as `duration_nano`",
		"trace_id as `trace_id`",
	)

	sb.From("base_spans")
	sb.Where(
		fmt.Sprintf("trace_id GLOBAL IN (%s)", traceSubquery),
		"parent_span_id = ''",
	)

	sb.GroupBy("trace_id")
	if len(b.operator.GroupBy) > 0 {
		groupByKeys := make([]string, len(b.operator.GroupBy))
		for i, gb := range b.operator.GroupBy {
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name)
		}
		sb.GroupBy(groupByKeys...)
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
				b.stmtBuilder.logger.WarnContext(b.ctx,
					"ignoring order by field that's not available in trace context",
					"field", orderBy.Key.Name)
			}
		}
	}

	if !orderApplied {
		sb.OrderBy("`duration_nano` DESC")
	}

	if b.operator.Limit > 0 {
		sb.Limit(b.operator.Limit)
	}

	combinedArgs := append(allGroupByArgs, allAggChArgs...)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
	return &qbtypes.Statement{
		Query: sql,
		Args:  args,
	}, nil
}

func (b *traceOperatorCTEBuilder) buildScalarQuery(selectFromCTE string) (*qbtypes.Statement, error) {
	sb := sqlbuilder.NewSelectBuilder()

	keySelectors := b.getKeySelectors()
	keys, _, err := b.stmtBuilder.metadataStore.GetKeysMulti(b.ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	var allGroupByArgs []any

	for _, gb := range b.operator.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(
			b.ctx,
			&gb.TelemetryFieldKey,
			b.stmtBuilder.fm,
			b.stmtBuilder.cb,
			keys,
			telemetrytypes.FieldDataTypeString,
			"",
			nil,
		)
		if err != nil {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"failed to map group by field '%s': %v",
				gb.TelemetryFieldKey.Name,
				err,
			)
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
	}

	var allAggChArgs []any
	for i, agg := range b.operator.Aggregations {
		rewritten, chArgs, err := b.stmtBuilder.aggExprRewriter.Rewrite(
			b.ctx,
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
			groupByKeys[i] = fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name)
		}
		sb.GroupBy(groupByKeys...)
	}

	combinedArgs := append(allGroupByArgs, allAggChArgs...)

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
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
