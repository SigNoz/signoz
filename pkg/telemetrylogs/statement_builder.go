package telemetrylogs

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type logQueryStatementBuilder struct {
	logger                    *slog.Logger
	metadataStore             telemetrytypes.MetadataStore
	fm                        qbtypes.FieldMapper
	cb                        qbtypes.ConditionBuilder
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation]
	aggExprRewriter           qbtypes.AggExprRewriter

	jsonResolver *JSONFieldResolver

	fullTextColumn *telemetrytypes.TelemetryFieldKey
	jsonBodyPrefix string
	jsonKeyToKey   qbtypes.JsonKeyToFieldFunc
}

var _ qbtypes.StatementBuilder[qbtypes.LogAggregation] = (*logQueryStatementBuilder)(nil)

func NewLogQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	aggExprRewriter qbtypes.AggExprRewriter,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
	jsonResolver *JSONFieldResolver,
) *logQueryStatementBuilder {
	logsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrylogs")

	return &logQueryStatementBuilder{
		logger:                    logsSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fieldMapper,
		cb:                        conditionBuilder,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
		aggExprRewriter:           aggExprRewriter,
		fullTextColumn:            fullTextColumn,
		jsonBodyPrefix:            jsonBodyPrefix,
		jsonKeyToKey:              jsonKeyToKey,
		jsonResolver:              jsonResolver,
	}
}

// Build builds a SQL query for logs based on the given parameters
func (b *logQueryStatementBuilder) Build(
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

	b.adjustKeys(ctx, keys, query)

	// Create SQL builder
	q := sqlbuilder.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeRawStream:
		return b.buildListQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, q, query, start, end, keys, false, variables)
	}

	return nil, fmt.Errorf("unsupported request type: %s", requestType)
}

// arrayJoinClause builds the ARRAY JOIN clause fragment for a given collector.
// Returns an empty string if no joins are required.
func arrayJoinClause(collector []ArrayJoinReq) string {
	if len(collector) == 0 {
		return ""
	}
	joins := make([]string, 0, len(collector))
	for _, req := range collector {
		jsonAlias := req.JSONItemAlias
		if jsonAlias == "" {
			jsonAlias = req.DynamicItemAlias + "_json"
		}
		joins = append(joins, fmt.Sprintf("ARRAY JOIN dynamicElement(%s, 'JSON') AS %s", req.DynamicArrayExpr, jsonAlias))
	}
	return " " + strings.Join(joins, ", ")
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
		selectors := querybuilder.QueryStringToKeysSelectors(groupBy.TelemetryFieldKey.Name)
		keySelectors = append(keySelectors, selectors...)
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
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	return keySelectors
}

func (b *logQueryStatementBuilder) adjustKeys(ctx context.Context, keys map[string][]*telemetrytypes.TelemetryFieldKey, query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]) {
	// for group by / order by, if there is a key
	// that exactly matches the name of intrinsic field but has
	// a field context or data type that doesn't match the field context or data type of the
	// intrinsic field,
	// and there is no additional key present in the data with the incoming key match,
	// then override the given context with
	// intrinsic field context and data type
	// Why does that happen? Because we have a lot of dashboards created by users and shared over web
	// that has incorrect context or data type populated so we fix it
	// note: this override happens only when there is no match; if there is a match,
	// we can't make decision on behalf of users so we let it use unmodified

	// example: {"key": "severity_text","type": "tag","dataType": "string"}
	// This is sent as "tag", when it's not, this was earlier managed with
	// `isColumn`, which we don't have in v5 (because it's not a user concern whether it's mat col or not)
	// Such requests as-is look for attributes, the following code exists to handle them
	checkMatch := func(k *telemetrytypes.TelemetryFieldKey) {
		var overallMatch bool

		findMatch := func(staticKeys map[string]telemetrytypes.TelemetryFieldKey) bool {
			// for a given key `k`, iterate over the metadata keys `keys`
			// and see if there is any exact match
			match := false
			for _, mapKey := range keys[k.Name] {
				if mapKey.FieldContext == k.FieldContext && mapKey.FieldDataType == k.FieldDataType {
					match = true
				}
			}
			// we don't have exact match, then it's doesn't exist in attribute or resource attribute
			// use the intrinsic/calculated field
			if !match {
				b.logger.InfoContext(ctx, "overriding the field context and data type", "key", k.Name)
				k.FieldContext = staticKeys[k.Name].FieldContext
				k.FieldDataType = staticKeys[k.Name].FieldDataType
			}
			return match
		}

		if _, ok := IntrinsicFields[k.Name]; ok {
			overallMatch = overallMatch || findMatch(IntrinsicFields)
		}

		if !overallMatch {
			// check if all the key for the given field have been materialized, if so
			// set the key to materialized
			materilized := true
			for _, key := range keys[k.Name] {
				materilized = materilized && key.Materialized
			}
			k.Materialized = materilized
		}
	}

	for idx := range query.GroupBy {
		checkMatch(&query.GroupBy[idx].TelemetryFieldKey)
	}
	for idx := range query.Order {
		checkMatch(&query.Order[idx].Key.TelemetryFieldKey)
	}

	keys["id"] = []*telemetrytypes.TelemetryFieldKey{
		{
			Name:          "id",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
	}
}

// buildListQuery builds a query for list panel type
func (b *logQueryStatementBuilder) buildListQuery(
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

	// per-request local collectors (no context usage)
	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// Plan ARRAY JOINs for JSON GROUP BY paths (centralized planning)
	arrayJoinCollector, needsUnion := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, joinPlanModeAuto)

	// If UNION ALL is needed (both Array(JSON) and Array(Dynamic) exist), build two branches and union
	if needsUnion {
		buildBranch := func(mode joinPlanMode) (*qbtypes.Statement, error) {
			// fresh collector for this branch
			branchCollector, _ := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, mode)

			// clone a new builder for branch
			branchSB := sqlbuilder.NewSelectBuilder()

			// SELECT columns (same as below)
			branchSB.Select(LogsV2TimestampColumn)
			branchSB.SelectMore(LogsV2IDColumn)
			if len(query.SelectFields) == 0 {
				branchSB.SelectMore(LogsV2TraceIDColumn)
				branchSB.SelectMore(LogsV2SpanIDColumn)
				branchSB.SelectMore(LogsV2TraceFlagsColumn)
				branchSB.SelectMore(LogsV2SeverityTextColumn)
				branchSB.SelectMore(LogsV2SeverityNumberColumn)
				branchSB.SelectMore(LogsV2ScopeNameColumn)
				branchSB.SelectMore(LogsV2ScopeVersionColumn)
				branchSB.SelectMore(LogsV2BodyV2Column)
				branchSB.SelectMore(LogsV2PromotedColumn)
				branchSB.SelectMore(LogsV2AttributesStringColumn)
				branchSB.SelectMore(LogsV2AttributesNumberColumn)
				branchSB.SelectMore(LogsV2AttributesBoolColumn)
				branchSB.SelectMore(LogsV2ResourcesStringColumn)
				branchSB.SelectMore(LogsV2ScopeStringColumn)
			} else {
				for index := range query.SelectFields {
					if query.SelectFields[index].Name == LogsV2TimestampColumn || query.SelectFields[index].Name == LogsV2IDColumn {
						continue
					}
					colExpr, err := b.fm.ColumnExpressionFor(ctx, &query.SelectFields[index], keys)
					if err != nil {
						return nil, err
					}
					branchSB.SelectMore(colExpr)
				}
			}

			// FROM with branch joins
			fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
			if len(branchCollector) > 0 {
				joins := make([]string, 0, len(branchCollector))
				for _, req := range branchCollector {
					jsonAlias := req.JSONItemAlias
					if jsonAlias == "" {
						jsonAlias = req.DynamicItemAlias + "_json"
					}
					joins = append(joins, fmt.Sprintf("ARRAY JOIN dynamicElement(%s, 'JSON') AS %s", req.DynamicArrayExpr, jsonAlias))
				}
				fromBase = fromBase + " " + strings.Join(joins, ", ")
			}
			branchSB.From(fromBase)

			// WHERE/time filters
			preparedWhereClause, err := b.addFilterCondition(ctx, branchSB, start, end, query, keys, variables)
			if err != nil {
				return nil, err
			}

			// ORDER BY
			for _, orderBy := range query.Order {
				colExpr, err := b.fm.ColumnExpressionFor(ctx, &orderBy.Key.TelemetryFieldKey, keys)
				if err != nil {
					return nil, err
				}
				branchSB.OrderBy(fmt.Sprintf("%s %s", colExpr, orderBy.Direction.StringValue()))
			}

			if query.Limit > 0 {
				branchSB.Limit(query.Limit)
			} else {
				branchSB.Limit(100)
			}
			if query.Offset > 0 {
				branchSB.Offset(query.Offset)
			}

			mainSQL, mainArgs := branchSB.BuildWithFlavor(sqlbuilder.ClickHouse)
			stmt := &qbtypes.Statement{Query: mainSQL, Args: mainArgs}
			if preparedWhereClause != nil {
				stmt.Warnings = preparedWhereClause.Warnings
				stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
			}
			return stmt, nil
		}

		left, err := buildBranch(joinPlanModeArrayJSON)
		if err != nil {
			return nil, err
		}
		right, err := buildBranch(joinPlanModeArrayDynamicFiltered)
		if err != nil {
			return nil, err
		}

		// UNION ALL both branches
		unionSQL := fmt.Sprintf("(%s) UNION ALL (%s)", left.Query, right.Query)
		unionArgs := append(left.Args, right.Args...)
		return &qbtypes.Statement{Query: unionSQL, Args: unionArgs, Warnings: left.Warnings, WarningsDocURL: left.WarningsDocURL}, nil
	}

	// Select timestamp and id by default
	sb.Select(LogsV2TimestampColumn)
	sb.SelectMore(LogsV2IDColumn)
	if len(query.SelectFields) == 0 {
		// Select all default columns
		sb.SelectMore(LogsV2TraceIDColumn)
		sb.SelectMore(LogsV2SpanIDColumn)
		sb.SelectMore(LogsV2TraceFlagsColumn)
		sb.SelectMore(LogsV2SeverityTextColumn)
		sb.SelectMore(LogsV2SeverityNumberColumn)
		sb.SelectMore(LogsV2ScopeNameColumn)
		sb.SelectMore(LogsV2ScopeVersionColumn)
		sb.SelectMore(LogsV2BodyV2Column)
		sb.SelectMore(LogsV2PromotedColumn)
		sb.SelectMore(LogsV2AttributesStringColumn)
		sb.SelectMore(LogsV2AttributesNumberColumn)
		sb.SelectMore(LogsV2AttributesBoolColumn)
		sb.SelectMore(LogsV2ResourcesStringColumn)
		sb.SelectMore(LogsV2ScopeStringColumn)

	} else {
		// Select specified columns
		for index := range query.SelectFields {
			if query.SelectFields[index].Name == LogsV2TimestampColumn || query.SelectFields[index].Name == LogsV2IDColumn {
				continue
			}
			// Keep SELECT projection raw for body JSON paths unless narrower typing is required by agg/filter
			// Here, for plain SELECT, emit raw body_v2.path
			if b.jsonBodyPrefix != "" && strings.HasPrefix(query.SelectFields[index].Name, b.jsonBodyPrefix) {
				path := strings.TrimPrefix(query.SelectFields[index].Name, b.jsonBodyPrefix)
				sb.SelectMore("body_v2." + path)
				continue
			}
			// get column expression for the field - use array index directly to avoid pointer to loop variable
			colExpr, err := b.fm.ColumnExpressionFor(ctx, &query.SelectFields[index], keys)
			if err != nil {
				return nil, err
			}
			sb.SelectMore(colExpr)
		}
	}

	// From table (inject ARRAY JOINs if collected)
	fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
	fromBase = fromBase + arrayJoinClause(arrayJoinCollector)
	sb.From(fromBase)

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)

	if err != nil {
		return nil, err
	}

	// Add order by
	for _, orderBy := range query.Order {
		colExpr, err := b.fm.ColumnExpressionFor(ctx, &orderBy.Key.TelemetryFieldKey, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", colExpr, orderBy.Direction.StringValue()))
	}

	// Add limit and offset
	if query.Limit > 0 {
		sb.Limit(query.Limit)
	} else {
		sb.Limit(100)
	}

	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	// stitch extras from prepared where clause
	if preparedWhereClause != nil {
		if len(preparedWhereClause.Extras.CTEs) > 0 {
			cteFragments = append(cteFragments, strings.Join(preparedWhereClause.Extras.CTEs, ", "))
		}
		// convert qbtypes.ArrayJoinReq to local ArrayJoinReq
		for _, req := range preparedWhereClause.Extras.ArrayJoins {
			arrayJoinCollector = append(arrayJoinCollector, ArrayJoinReq{
				DynamicArrayExpr:  req.DynamicArrayExpr,
				DynamicItemAlias:  req.DynamicItemAlias,
				JSONItemAlias:     req.JSONItemAlias,
				Path:              req.Path,
				ScalarAccessHints: req.ScalarAccessHints,
			})
		}
	}

	// NOTE: ARRAY JOIN emission will be integrated in a follow-up using raw SQL injection at FROM.

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

func (b *logQueryStatementBuilder) buildTimeSeriesQuery(
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

	// Plan ARRAY JOINs for JSON GROUP BY paths (centralized planning)
	arrayJoinCollector, needsUnionTS := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, joinPlanModeAuto)
	if needsUnionTS {
		// Build two full statements and UNION ALL them
		buildTSBranch := func(mode joinPlanMode) (*qbtypes.Statement, error) {
			// collector for this mode
			branchCollector, _ := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, mode)
			// Create fresh builder and reuse existing logic with minimal duplication by temporarily swapping collector
			// Build select ts, groupby dims, aggs
			sbBranch := sqlbuilder.NewSelectBuilder()
			sbBranch.SelectMore(fmt.Sprintf(
				"toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts",
				int64(query.StepInterval.Seconds()),
			))
			var allGroupByArgs []any
			for _, gb := range query.GroupBy {
				expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonBodyPrefix, b.jsonKeyToKey)
				if err != nil {
					return nil, err
				}
				colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
				allGroupByArgs = append(allGroupByArgs, args...)
				sbBranch.SelectMore(colExpr)
			}
			var allAggChArgs []any
			for i, agg := range query.Aggregations {
				rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, agg.Expression, uint64(query.StepInterval.Seconds()), keys)
				if err != nil {
					return nil, err
				}
				allAggChArgs = append(allAggChArgs, chArgs...)
				sbBranch.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, i))
			}
			fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
			if len(branchCollector) > 0 {
				joins := make([]string, 0, len(branchCollector))
				for _, req := range branchCollector {
					jsonAlias := req.JSONItemAlias
					if jsonAlias == "" {
						jsonAlias = req.DynamicItemAlias + "_json"
					}
					joins = append(joins, fmt.Sprintf("ARRAY JOIN dynamicElement(%s, 'JSON') AS %s", req.DynamicArrayExpr, jsonAlias))
				}
				fromBase = fromBase + " " + strings.Join(joins, ", ")
			}
			sbBranch.From(fromBase)
			preparedWhereClause, err := b.addFilterCondition(ctx, sbBranch, start, end, query, keys, variables)
			if err != nil {
				return nil, err
			}
			sbBranch.GroupBy("ts")
			sbBranch.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
			if query.Having != nil && query.Having.Expression != "" {
				rewriter := querybuilder.NewHavingExpressionRewriter()
				rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
				sbBranch.Having(rewrittenExpr)
			}
			if len(query.Order) != 0 {
				for _, orderBy := range query.Order {
					_, ok := aggOrderBy(orderBy, query)
					if !ok {
						sbBranch.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
					}
				}
				sbBranch.OrderBy("ts desc")
			}
			combinedArgs := append(allGroupByArgs, allAggChArgs...)
			mainSQL, mainArgs := sbBranch.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
			stmt := &qbtypes.Statement{Query: mainSQL, Args: mainArgs}
			if preparedWhereClause != nil {
				stmt.Warnings = preparedWhereClause.Warnings
				stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
			}
			return stmt, nil
		}
		left, err := buildTSBranch(joinPlanModeArrayJSON)
		if err != nil {
			return nil, err
		}
		right, err := buildTSBranch(joinPlanModeArrayDynamicFiltered)
		if err != nil {
			return nil, err
		}
		unionSQL := fmt.Sprintf("(%s) UNION ALL (%s)", left.Query, right.Query)
		unionArgs := append(left.Args, right.Args...)
		return &qbtypes.Statement{Query: unionSQL, Args: unionArgs, Warnings: left.Warnings, WarningsDocURL: left.WarningsDocURL}, nil
	}

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

	// Keep original column expressions so we can build the tuple
	fieldNames := make([]string, 0, len(query.GroupBy))
	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonBodyPrefix, b.jsonKeyToKey)
		if err != nil {
			return nil, err
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
		fieldNames = append(fieldNames, fmt.Sprintf("`%s`", gb.TelemetryFieldKey.Name))
	}

	// Aggregations
	allAggChArgs := make([]any, 0)
	for i, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(
			ctx, agg.Expression,
			uint64(query.StepInterval.Seconds()),
			keys,
		)
		if err != nil {
			return nil, err
		}
		allAggChArgs = append(allAggChArgs, chArgs...)
		sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, i))
	}

	// From table (inject ARRAY JOINs if collected)
	fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
	fromBase = fromBase + arrayJoinClause(arrayJoinCollector)
	sb.From(fromBase)
	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)

	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 && len(query.GroupBy) > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, cteSB, query, start, end, keys, true, variables)
		if err != nil {
			return nil, err
		}

		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", cteStmt.Query))
		cteArgs = append(cteArgs, cteStmt.Args)

		// Constrain the main query to the rows that appear in the CTE.
		tuple := fmt.Sprintf("(%s)", strings.Join(fieldNames, ", "))
		sb.Where(fmt.Sprintf("%s GLOBAL IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(fieldNames, ", ")))

		// Group by all dimensions
		sb.GroupBy("ts")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		if query.Having != nil && query.Having.Expression != "" {
			// Rewrite having expression to use SQL column names
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
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

		// stitch extras from prepared where clause
		if preparedWhereClause != nil {
			if len(preparedWhereClause.Extras.CTEs) > 0 {
				cteFragments = append(cteFragments, strings.Join(preparedWhereClause.Extras.CTEs, ", "))
			}
			for _, req := range preparedWhereClause.Extras.ArrayJoins {
				arrayJoinCollector = append(arrayJoinCollector, ArrayJoinReq{
					DynamicArrayExpr:  req.DynamicArrayExpr,
					DynamicItemAlias:  req.DynamicItemAlias,
					JSONItemAlias:     req.JSONItemAlias,
					Path:              req.Path,
					ScalarAccessHints: req.ScalarAccessHints,
				})
			}
		}

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)

	} else {
		sb.GroupBy("ts")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
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

		// stitch extras from prepared where clause
		if preparedWhereClause != nil {
			if len(preparedWhereClause.Extras.CTEs) > 0 {
				cteFragments = append(cteFragments, strings.Join(preparedWhereClause.Extras.CTEs, ", "))
			}
			for _, req := range preparedWhereClause.Extras.ArrayJoins {
				arrayJoinCollector = append(arrayJoinCollector, ArrayJoinReq{
					DynamicArrayExpr:  req.DynamicArrayExpr,
					DynamicItemAlias:  req.DynamicItemAlias,
					JSONItemAlias:     req.JSONItemAlias,
					Path:              req.Path,
					ScalarAccessHints: req.ScalarAccessHints,
				})
			}
		}

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
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

// buildScalarQuery builds a query for scalar panel type
func (b *logQueryStatementBuilder) buildScalarQuery(
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

	// Plan ARRAY JOINs for JSON GROUP BY paths (centralized planning)
	arrayJoinCollector, needsUnionScalar := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, joinPlanModeAuto)
	if needsUnionScalar {
		buildScalarBranch := func(mode joinPlanMode) (*qbtypes.Statement, error) {
			branchCollector, _ := b.planArrayJoinsForGroupBy(ctx, query.GroupBy, mode)
			sbBranch := sqlbuilder.NewSelectBuilder()
			// group by dims
			var allGroupByArgs []any
			for _, gb := range query.GroupBy {
				expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonBodyPrefix, b.jsonKeyToKey)
				if err != nil {
					return nil, err
				}
				colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
				allGroupByArgs = append(allGroupByArgs, args...)
				sbBranch.SelectMore(colExpr)
			}
			// aggs
			rateInterval := (end - start) / querybuilder.NsToSeconds
			allAggChArgs := []any{}
			if len(query.Aggregations) > 0 {
				for idx := range query.Aggregations {
					aggExpr := query.Aggregations[idx]
					rewritten, chArgs, err := b.aggExprRewriter.Rewrite(ctx, aggExpr.Expression, rateInterval, keys)
					if err != nil {
						return nil, err
					}
					allAggChArgs = append(allAggChArgs, chArgs...)
					sbBranch.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
				}
			}
			fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
			if len(branchCollector) > 0 {
				joins := make([]string, 0, len(branchCollector))
				for _, req := range branchCollector {
					jsonAlias := req.JSONItemAlias
					if jsonAlias == "" {
						jsonAlias = req.DynamicItemAlias + "_json"
					}
					joins = append(joins, fmt.Sprintf("ARRAY JOIN dynamicElement(%s, 'JSON') AS %s", req.DynamicArrayExpr, jsonAlias))
				}
				fromBase = fromBase + " " + strings.Join(joins, ", ")
			}
			sbBranch.From(fromBase)
			preparedWhereClause, err := b.addFilterCondition(ctx, sbBranch, start, end, query, keys, variables)
			if err != nil {
				return nil, err
			}
			sbBranch.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
			if query.Having != nil && query.Having.Expression != "" {
				rewriter := querybuilder.NewHavingExpressionRewriter()
				rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
				sbBranch.Having(rewrittenExpr)
			}
			for _, orderBy := range query.Order {
				idx, ok := aggOrderBy(orderBy, query)
				if ok {
					sbBranch.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
				} else {
					sbBranch.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
				}
			}
			if len(query.Order) == 0 {
				sbBranch.OrderBy("__result_0 DESC")
			}
			if query.Limit > 0 {
				sbBranch.Limit(query.Limit)
			}
			combinedArgs := append(allGroupByArgs, allAggChArgs...)
			mainSQL, mainArgs := sbBranch.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)
			stmt := &qbtypes.Statement{Query: mainSQL, Args: mainArgs}
			if preparedWhereClause != nil {
				stmt.Warnings = preparedWhereClause.Warnings
				stmt.WarningsDocURL = preparedWhereClause.WarningsDocURL
			}
			return stmt, nil
		}
		left, err := buildScalarBranch(joinPlanModeArrayJSON)
		if err != nil {
			return nil, err
		}
		right, err := buildScalarBranch(joinPlanModeArrayDynamicFiltered)
		if err != nil {
			return nil, err
		}
		unionSQL := fmt.Sprintf("(%s) UNION ALL (%s)", left.Query, right.Query)
		unionArgs := append(left.Args, right.Args...)
		return &qbtypes.Statement{Query: unionSQL, Args: unionArgs, Warnings: left.Warnings, WarningsDocURL: left.WarningsDocURL}, nil
	}

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	var allGroupByArgs []any

	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, b.jsonBodyPrefix, b.jsonKeyToKey)
		if err != nil {
			return nil, err
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(colExpr)
	}

	// for scalar queries, the rate would be end-start
	rateInterval := (end - start) / querybuilder.NsToSeconds

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			aggExpr := query.Aggregations[idx]
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(
				ctx, aggExpr.Expression,
				rateInterval,
				keys,
			)
			if err != nil {
				return nil, err
			}
			allAggChArgs = append(allAggChArgs, chArgs...)
			sb.SelectMore(fmt.Sprintf("%s AS __result_%d", rewritten, idx))
		}
	}

	// From table (inject ARRAY JOINs if collected)
	fromBase := fmt.Sprintf("%s.%s", DBName, LogsV2TableName)
	fromBase = fromBase + arrayJoinClause(arrayJoinCollector)
	sb.From(fromBase)

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)

	if err != nil {
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
		sb.Having(rewrittenExpr)
	}

	// Add order by
	for _, orderBy := range query.Order {
		idx, ok := aggOrderBy(orderBy, query)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
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

	combinedArgs := append(allGroupByArgs, allAggChArgs...)

	if preparedWhereClause != nil {
		if len(preparedWhereClause.Extras.CTEs) > 0 {
			cteFragments = append(cteFragments, strings.Join(preparedWhereClause.Extras.CTEs, ", "))
		}
		for _, req := range preparedWhereClause.Extras.ArrayJoins {
			arrayJoinCollector = append(arrayJoinCollector, ArrayJoinReq{
				DynamicArrayExpr:  req.DynamicArrayExpr,
				DynamicItemAlias:  req.DynamicItemAlias,
				JSONItemAlias:     req.JSONItemAlias,
				Path:              req.Path,
				ScalarAccessHints: req.ScalarAccessHints,
			})
		}
	}
	// NOTE: ARRAY JOIN emission will be integrated in a follow-up using raw SQL injection at FROM.

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

// buildFilterCondition builds SQL condition from filter expression
func (b *logQueryStatementBuilder) addFilterCondition(
	_ context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*querybuilder.PreparedWhereClause, error) {

	var preparedWhereClause *querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		// add filter expression
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Logger:             b.logger,
			FieldMapper:        b.fm,
			ConditionBuilder:   b.cb,
			FieldKeys:          keys,
			SkipResourceFilter: true,
			FullTextColumn:     b.fullTextColumn,
			JsonBodyPrefix:     b.jsonBodyPrefix,
			JsonKeyToKey:       b.jsonKeyToKey,
			Variables:          variables,
		})

		if err != nil {
			return nil, err
		}
	}

	if preparedWhereClause != nil {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}

	// add time filter
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
		if k.Key.Name == agg.Alias ||
			k.Key.Name == agg.Expression ||
			k.Key.Name == fmt.Sprintf("%d", i) {
			return i, true
		}
	}
	return 0, false
}

func (b *logQueryStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (cteSQL string, cteArgs []any, err error) {

	stmt, err := b.buildResourceFilterCTE(ctx, query, start, end, variables)
	if err != nil {
		return "", nil, err
	}

	sb.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")

	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args, nil
}

func (b *logQueryStatementBuilder) buildResourceFilterCTE(
	ctx context.Context,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	return b.resourceFilterStmtBuilder.Build(
		ctx,
		start,
		end,
		qbtypes.RequestTypeRaw,
		query,
		variables,
	)
}

// planArrayJoinsForGroupBy centralizes planning of ARRAY JOINs for JSON group-by keys.
// It interprets ':' as array hops and constructs DynamicArrayExpr per hop using body_v2 as base.
// Typing: default to Array(Dynamic) base; JSON-only narrowing happens in ARRAY JOIN via dynamicElement(...,'JSON').
type joinPlanMode int

const (
	joinPlanModeAuto joinPlanMode = iota
	joinPlanModeArrayJSON
	joinPlanModeArrayDynamicFiltered
)

// planArrayJoinsForGroupBy returns the planned joins and whether UNION ALL is required.
func (b *logQueryStatementBuilder) planArrayJoinsForGroupBy(ctx context.Context, groupBys []qbtypes.GroupByKey, mode joinPlanMode) ([]ArrayJoinReq, bool) {
	collector := make([]ArrayJoinReq, 0)
	needsUnion := false
	for _, gb := range groupBys {
		name := gb.TelemetryFieldKey.Name
		if !strings.HasPrefix(name, BodyJSONStringSearchPrefix) {
			continue
		}
		path := strings.TrimPrefix(name, BodyJSONStringSearchPrefix)
		// Only plan when array hops are present
		if !strings.Contains(path, ":") {
			continue
		}
		parts := strings.Split(path, ":")
		// All but the last token are array hops; the final may contain dot-rest
		arraySegs := parts[:len(parts)-1]

		var prevJSONAlias string
		for i, seg := range arraySegs {
			dynAlias := fmt.Sprintf("dynamic_item_%d", i)
			jsonAlias := fmt.Sprintf("json_item_%d", i)

			var base string
			if i == 0 {
				base = "body_v2." + seg
			} else {
				base = fmt.Sprintf("%s.%s", prevJSONAlias, seg)
			}

			// Type-driven base selection using distributed_path_types via resolver
			// If Array(JSON) exists => join directly on Array(JSON)
			// Else if Array(Dynamic) exists => filter to JSON then join
			// If resolver unavailable, default to Array(Dynamic)
			dynamicArrayExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, telemetrytypes.ArrayDynamic.StringValue())
			if b.jsonResolver != nil {
				// resolve types for this hop key
				typePlan, err := b.jsonResolver.ResolveJSONFieldTypes(ctx, seg)
				if err == nil && typePlan != nil {
					hasArrayJSON := false
					hasArrayDynamic := false
					for _, t := range typePlan.Types {
						if strings.EqualFold(t, telemetrytypes.ArrayJSON.StringValue()) {
							hasArrayJSON = true
						}
						if strings.EqualFold(t, telemetrytypes.ArrayDynamic.StringValue()) {
							hasArrayDynamic = true
						}
					}
					if mode == joinPlanModeAuto {
						if hasArrayJSON && hasArrayDynamic {
							needsUnion = true
							// In auto mode we don't decide, leave collector filling below according to default (ArrayDynamic filtered)
						}
						if hasArrayJSON {
							dynamicArrayExpr = fmt.Sprintf("dynamicElement(%s, '%s')", base, telemetrytypes.ArrayJSON.StringValue())
						} else if hasArrayDynamic {
							dynamicArrayExpr = fmt.Sprintf("arrayFilter(x -> dynamicType(x) = 'JSON', dynamicElement(%s, '%s'))", base, telemetrytypes.ArrayDynamic.StringValue())
						}
					} else if mode == joinPlanModeArrayJSON {
						// Force Array(JSON) path
						dynamicArrayExpr = fmt.Sprintf("dynamicElement(%s, '%s')", base, telemetrytypes.ArrayJSON.StringValue())
					} else if mode == joinPlanModeArrayDynamicFiltered {
						// Force Array(Dynamic) filtered path
						dynamicArrayExpr = fmt.Sprintf("arrayFilter(x -> dynamicType(x) = 'JSON', dynamicElement(%s, '%s'))", base, telemetrytypes.ArrayDynamic.StringValue())
					}
				}
			}

			collector = append(collector, ArrayJoinReq{
				DynamicArrayExpr:  dynamicArrayExpr,
				DynamicItemAlias:  dynAlias,
				JSONItemAlias:     jsonAlias,
				Path:              strings.Join(parts[:i+1], ":"),
				ScalarAccessHints: nil,
			})

			prevJSONAlias = jsonAlias
		}
	}
	return collector, needsUnion
}
