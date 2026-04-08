package telemetryaudit

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryresourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type auditQueryStatementBuilder struct {
	logger                    *slog.Logger
	metadataStore             telemetrytypes.MetadataStore
	fm                        qbtypes.FieldMapper
	cb                        qbtypes.ConditionBuilder
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation]
	aggExprRewriter           qbtypes.AggExprRewriter
	fullTextColumn            *telemetrytypes.TelemetryFieldKey
	jsonKeyToKey              qbtypes.JsonKeyToFieldFunc
}

var _ qbtypes.StatementBuilder[qbtypes.LogAggregation] = (*auditQueryStatementBuilder)(nil)

func NewAuditQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	aggExprRewriter qbtypes.AggExprRewriter,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) *auditQueryStatementBuilder {
	auditSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryaudit")

	resourceFilterStmtBuilder := telemetryresourcefilter.New[qbtypes.LogAggregation](
		settings,
		DBName,
		LogsResourceTableName,
		telemetrytypes.SignalLogs,
		telemetrytypes.SourceAudit,
		metadataStore,
		fullTextColumn,
		jsonKeyToKey,
	)

	return &auditQueryStatementBuilder{
		logger:                    auditSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fieldMapper,
		cb:                        conditionBuilder,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
		aggExprRewriter:           aggExprRewriter,
		fullTextColumn:            fullTextColumn,
		jsonKeyToKey:              jsonKeyToKey,
	}
}

func (b *auditQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)

	keySelectors := getKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	query = b.adjustKeys(ctx, keys, query, requestType)

	q := sqlbuilder.NewSelectBuilder()

	var stmt *qbtypes.Statement
	switch requestType {
	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeRawStream:
		stmt, err = b.buildListQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeTimeSeries:
		stmt, err = b.buildTimeSeriesQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		stmt, err = b.buildScalarQuery(ctx, q, query, start, end, keys, false, variables)
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type: %s", requestType)
	}

	if err != nil {
		return nil, err
	}

	return stmt, nil
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]) []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector

	for idx := range query.Aggregations {
		aggExpr := query.Aggregations[idx]
		selectors := querybuilder.QueryStringToKeysSelectors(aggExpr.Expression)
		keySelectors = append(keySelectors, selectors...)
	}

	if query.Filter != nil && query.Filter.Expression != "" {
		whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
		keySelectors = append(keySelectors, whereClauseSelectors...)
	}

	for idx := range query.GroupBy {
		groupBy := query.GroupBy[idx]
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          groupBy.Name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  groupBy.FieldContext,
			FieldDataType: groupBy.FieldDataType,
		})
	}

	for idx := range query.SelectFields {
		selectField := query.SelectFields[idx]
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          selectField.Name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  selectField.FieldContext,
			FieldDataType: selectField.FieldDataType,
		})
	}

	for idx := range query.Order {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          query.Order[idx].Key.Name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  query.Order[idx].Key.FieldContext,
			FieldDataType: query.Order[idx].Key.FieldDataType,
		})
	}

	for idx := range keySelectors {
		keySelectors[idx].Signal = telemetrytypes.SignalLogs
		keySelectors[idx].Source = telemetrytypes.SourceAudit
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	return keySelectors
}

func (b *auditQueryStatementBuilder) adjustKeys(ctx context.Context, keys map[string][]*telemetrytypes.TelemetryFieldKey, query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], requestType qbtypes.RequestType) qbtypes.QueryBuilderQuery[qbtypes.LogAggregation] {
	keys["id"] = append([]*telemetrytypes.TelemetryFieldKey{{
		Name:          "id",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}}, keys["id"]...)

	keys["timestamp"] = append([]*telemetrytypes.TelemetryFieldKey{{
		Name:          "timestamp",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
	}}, keys["timestamp"]...)

	actions := querybuilder.AdjustKeysForAliasExpressions(&query, requestType)
	actions = append(actions, querybuilder.AdjustDuplicateKeys(&query)...)

	for idx := range query.SelectFields {
		actions = append(actions, b.adjustKey(&query.SelectFields[idx], keys)...)
	}
	for idx := range query.GroupBy {
		actions = append(actions, b.adjustKey(&query.GroupBy[idx].TelemetryFieldKey, keys)...)
	}
	for idx := range query.Order {
		actions = append(actions, b.adjustKey(&query.Order[idx].Key.TelemetryFieldKey, keys)...)
	}

	for _, action := range actions {
		b.logger.InfoContext(ctx, "key adjustment action", slog.String("action", action))
	}

	return query
}

func (b *auditQueryStatementBuilder) adjustKey(key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) []string {
	if _, ok := IntrinsicFields[key.Name]; ok {
		intrinsicField := IntrinsicFields[key.Name]
		return querybuilder.AdjustKey(key, keys, &intrinsicField)
	}
	return querybuilder.AdjustKey(key, keys, nil)
}

func (b *auditQueryStatementBuilder) buildListQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	sb.Select(TimestampColumn)
	sb.SelectMore(IDColumn)
	if len(query.SelectFields) == 0 {
		sb.SelectMore(TraceIDColumn)
		sb.SelectMore(SpanIDColumn)
		sb.SelectMore(TraceFlagsColumn)
		sb.SelectMore(SeverityTextColumn)
		sb.SelectMore(SeverityNumberColumn)
		sb.SelectMore(ScopeNameColumn)
		sb.SelectMore(ScopeVersionColumn)
		sb.SelectMore(BodyColumn)
		sb.SelectMore(EventNameColumn)
		sb.SelectMore(AttributesStringColumn)
		sb.SelectMore(AttributesNumberColumn)
		sb.SelectMore(AttributesBoolColumn)
		sb.SelectMore(ResourceColumn)
		sb.SelectMore(ScopeStringColumn)
	} else {
		for index := range query.SelectFields {
			if query.SelectFields[index].Name == TimestampColumn || query.SelectFields[index].Name == IDColumn {
				continue
			}

			colExpr, err := b.fm.ColumnExpressionFor(ctx, start, end, &query.SelectFields[index], keys)
			if err != nil {
				return nil, err
			}
			sb.SelectMore(colExpr)
		}
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, AuditLogsTableName))

	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	for _, orderBy := range query.Order {
		colExpr, err := b.fm.ColumnExpressionFor(ctx, start, end, &orderBy.Key.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", colExpr, orderBy.Direction.StringValue()))
	}

	if query.Limit > 0 {
		sb.Limit(query.Limit)
	} else {
		sb.Limit(100)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	stmt := &qbtypes.Statement{
		Query: finalSQL,
		Args:  finalArgs,
	}
	if preparedWhereClause != nil {
		stmt.Warnings = preparedWhereClause.Warnings
		stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
	}

	return stmt, nil
}

func (b *auditQueryStatementBuilder) buildTimeSeriesQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	var allGroupByArgs []any

	fieldNames := make([]string, 0, len(query.GroupBy))
	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, start, end, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonKeyToKey)
		if err != nil {
			return nil, err
		}

		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
		fieldNames = append(fieldNames, fmt.Sprintf("`%s`", gb.Name))
	}

	allAggChArgs := make([]any, 0)
	for i, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, start, end, agg.Expression, uint64(query.StepInterval.Seconds()), keys)
		if err != nil {
			return nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, i))
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, AuditLogsTableName))

	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 && len(query.GroupBy) > 0 {
		cteSB := sqlbuilder.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, cteSB, query, start, end, keys, true, variables)
		if err != nil {
			return nil, err
		}

		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", cteStmt.Query))
		cteArgs = append(cteArgs, cteStmt.Args)

		tuple := fmt.Sprintf("(%s)", strings.Join(fieldNames, ", "))
		sb.Where(fmt.Sprintf("%s GLOBAL IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(fieldNames, ", ")))

		sb.GroupBy("ts")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}

		if len(query.Order) != 0 {
			for _, orderBy := range query.Order {
				_, ok := aggOrderBy(orderBy, query)
				if !ok {
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}

		combinedArgs := append(allGroupByArgs, allAggChArgs...)
		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)
	} else {
		sb.GroupBy("ts")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}

		if len(query.Order) != 0 {
			for _, orderBy := range query.Order {
				_, ok := aggOrderBy(orderBy, query)
				if !ok {
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}

		combinedArgs := append(allGroupByArgs, allAggChArgs...)
		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)
	}

	stmt := &qbtypes.Statement{
		Query: finalSQL,
		Args:  finalArgs,
	}
	if preparedWhereClause != nil {
		stmt.Warnings = preparedWhereClause.Warnings
		stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
	}

	return stmt, nil
}

func (b *auditQueryStatementBuilder) buildScalarQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	skipResourceCTE bool,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	var allGroupByArgs []any

	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, start, end, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonKeyToKey)
		if err != nil {
			return nil, err
		}

		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
	}

	rateInterval := (end - start) / querybuilder.NsToSeconds

	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			aggExpr := query.Aggregations[idx]
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, start, end, aggExpr.Expression, rateInterval, keys)
			if err != nil {
				return nil, err
			}
			allAggChArgs = append(allAggChArgs, chArgs...)
			sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
		}
	}

	sb.From(fmt.Sprintf("%s.%s", DBName, AuditLogsTableName))

	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	if query.Having != nil && query.Having.Expression != "" {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr, err := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
		if err != nil {
			return nil, err
		}
		sb.Having(rewrittenExpr)
	}

	for _, orderBy := range query.Order {
		idx, ok := aggOrderBy(orderBy, query)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
		}
	}

	if len(query.Order) == 0 {
		sb.OrderBy("__result_0 DESC")
	}

	if query.Limit > 0 {
		sb.Limit(query.Limit)
	}

	combinedArgs := append(allGroupByArgs, allAggChArgs...)

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	stmt := &qbtypes.Statement{
		Query: finalSQL,
		Args:  finalArgs,
	}
	if preparedWhereClause != nil {
		stmt.Warnings = preparedWhereClause.Warnings
		stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
	}

	return stmt, nil
}

func (b *auditQueryStatementBuilder) addFilterCondition(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*querybuilder.PreparedWhereClause, error) {
	var preparedWhereClause *querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:            ctx,
			Logger:             b.logger,
			FieldMapper:        b.fm,
			ConditionBuilder:   b.cb,
			FieldKeys:          keys,
			SkipResourceFilter: true,
			FullTextColumn:     b.fullTextColumn,
			JsonKeyToKey:       b.jsonKeyToKey,
			Variables:          variables,
			StartNs:            start,
			EndNs:              end,
		})

		if err != nil {
			return nil, err
		}
	}

	if preparedWhereClause != nil {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	var endBucket uint64
	if end != 0 {
		endBucket = end / querybuilder.NsToSeconds
	}

	if start != 0 {
		sb.Where(sb.GE("timestamp", fmt.Sprintf("%d", start)), sb.GE("ts_bucket_start", startBucket))
	}
	if end != 0 {
		sb.Where(sb.L("timestamp", fmt.Sprintf("%d", end)), sb.LE("ts_bucket_start", endBucket))
	}

	return preparedWhereClause, nil
}

func aggOrderBy(k qbtypes.OrderBy, q qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]) (int, bool) {
	for i, agg := range q.Aggregations {
		if k.Key.Name == agg.Alias || k.Key.Name == agg.Expression || k.Key.Name == fmt.Sprintf("%d", i) {
			return i, true
		}
	}
	return 0, false
}

func (b *auditQueryStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (cteSQL string, cteArgs []any, err error) {
	stmt, err := b.resourceFilterStmtBuilder.Build(ctx, start, end, qbtypes.RequestTypeRaw, query, variables)
	if err != nil {
		return "", nil, err
	}

	sb.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")

	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args, nil
}
