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
	keys, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	// Create SQL builder
	q := sqlbuilder.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, q, query, start, end, keys, false, variables)
	}

	return nil, fmt.Errorf("unsupported request type: %s", requestType)
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
	}

	return keySelectors
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

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// Select default columns
	sb.Select(
		"timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string",
	)

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
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

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
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
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString)
		if err != nil {
			return nil, err
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(sqlbuilder.Escape(colExpr))
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

	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
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
		sb.Where(fmt.Sprintf("%s IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(fieldNames, ", ")))

		// Group by all dimensions
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			// Rewrite having expression to use SQL column names
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
			sb.Having(rewrittenExpr)
		}

		combinedArgs := append(allGroupByArgs, allAggChArgs...)

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)

	} else {
		sb.GroupBy("ALL")
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
			sb.Having(rewrittenExpr)
		}

		combinedArgs := append(allGroupByArgs, allAggChArgs...)

		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)
	}

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
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

	if frag, args, err := b.maybeAttachResourceFilter(ctx, sb, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	var allGroupByArgs []any

	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString)
		if err != nil {
			return nil, err
		}
		colExpr := fmt.Sprintf("toString(%s) AS `%s`", expr, gb.TelemetryFieldKey.Name)
		allGroupByArgs = append(allGroupByArgs, args...)
		sb.SelectMore(sqlbuilder.Escape(colExpr))
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

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, LogsV2TableName))

	// Add filter conditions
	warnings, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy("ALL")

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

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:    finalSQL,
		Args:     finalArgs,
		Warnings: warnings,
	}, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *logQueryStatementBuilder) addFilterCondition(
	_ context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) ([]string, error) {

	var filterWhereClause *sqlbuilder.WhereClause
	var warnings []string
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		// add filter expression
		filterWhereClause, warnings, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
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

	if filterWhereClause != nil {
		sb.AddWhereClause(filterWhereClause)
	}

	// add time filter
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	sb.Where(sb.GE("timestamp", fmt.Sprintf("%d", start)), sb.L("timestamp", fmt.Sprintf("%d", end)), sb.GE("ts_bucket_start", startBucket), sb.LE("ts_bucket_start", endBucket))

	return warnings, nil
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

	sb.Where("resource_fingerprint IN (SELECT fingerprint FROM __resource_filter)")

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
