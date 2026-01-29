package telemetrytraces

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"
)

var (
	ErrUnsupportedAggregation = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported aggregation")
)

type traceQueryStatementBuilder struct {
	logger                    *slog.Logger
	metadataStore             telemetrytypes.MetadataStore
	fm                        qbtypes.FieldMapper
	cb                        qbtypes.ConditionBuilder
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	aggExprRewriter           qbtypes.AggExprRewriter
	telemetryStore            telemetrystore.TelemetryStore
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*traceQueryStatementBuilder)(nil)

func NewTraceQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	aggExprRewriter qbtypes.AggExprRewriter,
	telemetryStore telemetrystore.TelemetryStore,
) *traceQueryStatementBuilder {
	tracesSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrytraces")
	return &traceQueryStatementBuilder{
		logger:                    tracesSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fieldMapper,
		cb:                        conditionBuilder,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
		aggExprRewriter:           aggExprRewriter,
		telemetryStore:            telemetryStore,
	}
}

// Build builds a SQL query for traces based on the given parameters
func (b *traceQueryStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
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

	// Check if filter contains trace_id(s) and optimize time range if needed
	if query.Filter != nil && query.Filter.Expression != "" && b.telemetryStore != nil {
		traceIDs, found := ExtractTraceIDsFromFilter(query.Filter.Expression)
		if found && len(traceIDs) > 0 {
			finder := NewTraceTimeRangeFinder(b.telemetryStore)

			traceStart, traceEnd, ok := finder.GetTraceTimeRangeMulti(ctx, traceIDs)
			if !ok {
				b.logger.DebugContext(ctx, "failed to get trace time range", "trace_ids", traceIDs)
			} else if traceStart > 0 && traceEnd > 0 {
				start = uint64(traceStart)
				end = uint64(traceEnd)
				b.logger.DebugContext(ctx, "optimized time range for traces", "trace_ids", traceIDs, "start", start, "end", end)
			}
		}
	}

	// Create SQL builder
	q := sqlbuilder.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, q, query, start, end, keys, variables, false, false)
	case qbtypes.RequestTypeTrace:
		return b.buildTraceQuery(ctx, q, query, start, end, keys, variables)
	}

	return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type: %s", requestType)
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) []*telemetrytypes.FieldKeySelector {
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
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  groupBy.FieldContext,
			FieldDataType: groupBy.FieldDataType,
		})
	}

	for idx := range query.SelectFields {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          query.SelectFields[idx].Name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  query.SelectFields[idx].FieldContext,
			FieldDataType: query.SelectFields[idx].FieldDataType,
		})
	}

	for idx := range query.Order {
		keySelectors = append(keySelectors, &telemetrytypes.FieldKeySelector{
			Name:          query.Order[idx].Key.Name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  query.Order[idx].Key.FieldContext,
			FieldDataType: query.Order[idx].Key.FieldDataType,
		})
	}

	for idx := range keySelectors {
		keySelectors[idx].Signal = telemetrytypes.SignalTraces
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	return keySelectors
}

func (b *traceQueryStatementBuilder) adjustKeys(ctx context.Context, keys map[string][]*telemetrytypes.TelemetryFieldKey, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], requestType qbtypes.RequestType) qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation] {

	// add deprecated fields only during statement building
	// why?
	// 1. to not fail filter expression that use deprecated cols
	// 2. this could have been moved to metadata fetching itself, however, that
	// would mean, they also show up in suggestions we we don't want to do
	for fieldKeyName, fieldKey := range IntrinsicFieldsDeprecated {
		if _, ok := keys[fieldKeyName]; !ok {
			keys[fieldKeyName] = []*telemetrytypes.TelemetryFieldKey{&fieldKey}
		} else {
			keys[fieldKeyName] = append(keys[fieldKeyName], &fieldKey)
		}
	}
	for fieldKeyName, fieldKey := range CalculatedFieldsDeprecated {
		if _, ok := keys[fieldKeyName]; !ok {
			keys[fieldKeyName] = []*telemetrytypes.TelemetryFieldKey{&fieldKey}
		} else {
			keys[fieldKeyName] = append(keys[fieldKeyName], &fieldKey)
		}
	}

	// Adjust keys for alias expressions in aggregations
	actions := querybuilder.AdjustKeysForAliasExpressions(&query, requestType)

	/*
		Check if user is using multiple contexts or data types for same field name
		Idea is to use a super set of keys that can satisfy all the usages

		For example, lets consider model_id exists in both attributes and resources
		And user is trying to use `attribute.model_id` and `model_id`.

		In this case, we'll remove the context from `attribute.model_id`
		and make it just `model_id` and remove the duplicate entry.

		Same goes with data types.
		Consider user is using http.status_code:number and http.status_code
		In this case, we'll remove the data type from http.status_code:number
		and make it just http.status_code and remove the duplicate entry.
	*/

	actions = append(actions, querybuilder.AdjustDuplicateKeys(&query)...)

	/*
		Now adjust each key to have correct context and data type
		Here we try to make intelligent guesses which work for all users (not just majority)
		Reason for doing this is to not create an unexpected behavior for users
	*/
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
		// TODO: change to debug level once we are confident about the behavior
		b.logger.InfoContext(ctx, "key adjustment action", "action", action)
	}

	return query
}

func (b *traceQueryStatementBuilder) adjustKey(key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) []string {

	// for recording actions taken
	actions := []string{}
	/*
		Check if this key is an intrinsic or calculated field

		For example: trace_id (intrinsic), response_status_code (calculated).
	*/
	var isIntrinsicOrCalculatedField bool
	var intrinsicOrCalculatedField telemetrytypes.TelemetryFieldKey
	if _, ok := IntrinsicFields[key.Name]; ok {
		isIntrinsicOrCalculatedField = true
		intrinsicOrCalculatedField = IntrinsicFields[key.Name]
	} else if _, ok := CalculatedFields[key.Name]; ok {
		isIntrinsicOrCalculatedField = true
		intrinsicOrCalculatedField = CalculatedFields[key.Name]
	} else if _, ok := IntrinsicFieldsDeprecated[key.Name]; ok {
		isIntrinsicOrCalculatedField = true
		intrinsicOrCalculatedField = IntrinsicFieldsDeprecated[key.Name]
	} else if _, ok := CalculatedFieldsDeprecated[key.Name]; ok {
		isIntrinsicOrCalculatedField = true
		intrinsicOrCalculatedField = CalculatedFieldsDeprecated[key.Name]
	}

	if isIntrinsicOrCalculatedField {
		actions = append(actions, querybuilder.AdjustKey(key, keys, &intrinsicOrCalculatedField)...)
	} else {
		actions = append(actions, querybuilder.AdjustKey(key, keys, nil)...)
	}

	return actions
}

// buildListQuery builds a query for list panel type
func (b *traceQueryStatementBuilder) buildListQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
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

	selectedFields := query.SelectFields

	if len(selectedFields) == 0 {
		sortedKeys := maps.Keys(DefaultFields)
		slices.Sort(sortedKeys)
		for _, key := range sortedKeys {
			selectedFields = append(selectedFields, DefaultFields[key])
		}
	}

	selectFieldKeys := []string{}
	for _, field := range selectedFields {
		selectFieldKeys = append(selectFieldKeys, field.Name)
	}

	for _, x := range []string{"timestamp", "span_id", "trace_id"} {
		if !slices.Contains(selectFieldKeys, x) {
			selectedFields = append(selectedFields, DefaultFields[x])
		}
	}

	// TODO: should we deprecate `SelectFields` and return everything from a span like we do for logs?
	for _, field := range selectedFields {
		colExpr, err := b.fm.ColumnExpressionFor(ctx, &field, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(colExpr)
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

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

func (b *traceQueryStatementBuilder) buildTraceQuery(
	ctx context.Context,
	_ *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	distSB := sqlbuilder.NewSelectBuilder()
	distSB.Select("trace_id")
	distSB.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	if frag, args, err := b.maybeAttachResourceFilter(ctx, distSB, query, start, end, variables); err != nil {
		return nil, err
	} else if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, distSB, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	distSQL, distArgs := distSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	cteFragments = append(cteFragments, fmt.Sprintf("__toe AS (%s)", distSQL))
	cteArgs = append(cteArgs, distArgs)

	// Build the inner subquery for root spans
	innerSB := sqlbuilder.NewSelectBuilder()
	innerSB.Select("trace_id", "duration_nano", sqlbuilder.Escape("resource_string_service$$name as `service.name`"), "name")
	innerSB.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	innerSB.Where("parent_span_id = ''")

	// this only helps when there is a filter
	if query.Filter != nil && query.Filter.Expression != "" {
		innerSB.Where("trace_id GLOBAL IN __toe")
	}

	// Add time filter to inner query
	innerSB.Where(
		innerSB.GE("timestamp", fmt.Sprintf("%d", start)),
		innerSB.L("timestamp", fmt.Sprintf("%d", end)),
		innerSB.GE("ts_bucket_start", startBucket),
		innerSB.LE("ts_bucket_start", endBucket))

	// order by duration and limit 1 per trace
	innerSB.OrderBy("duration_nano DESC")
	innerSB.SQL("LIMIT 1 BY trace_id")

	innerSQL, innerArgs := innerSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	cteFragments = append(cteFragments, fmt.Sprintf("__toe_duration_sorted AS (%s)", innerSQL))
	cteArgs = append(cteArgs, innerArgs)

	// main query that joins everything
	mainSB := sqlbuilder.NewSelectBuilder()
	mainSB.Select(
		"__toe_duration_sorted.`service.name` AS `service.name`",
		"__toe_duration_sorted.name AS `name`",
		"count() AS span_count",
		"__toe_duration_sorted.duration_nano AS `duration_nano`",
		"__toe_duration_sorted.trace_id AS `trace_id`",
	)

	// Join the distributed table with the inner subquery
	mainSB.SQL("FROM __toe")
	mainSB.SQL("INNER JOIN __toe_duration_sorted")
	mainSB.SQL("ON __toe.trace_id = __toe_duration_sorted.trace_id")

	// Group by trace-level fields
	mainSB.GroupBy("trace_id", "duration_nano", "name", "`service.name`")

	// order by duration only supported for now
	mainSB.OrderBy("duration_nano DESC")

	// Limit by trace_id to ensure one row per trace
	mainSB.SQL("LIMIT 1 BY trace_id")

	if query.Limit > 0 {
		mainSB.Limit(query.Limit)
	} else {
		mainSB.Limit(100)
	}

	if query.Offset > 0 {
		mainSB.Offset(query.Offset)
	}

	mainSQL, mainArgs := mainSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	// combine it all together:  WITH … SELECT …
	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
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

func (b *traceQueryStatementBuilder) buildTimeSeriesQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
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
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	var allGroupByArgs []any

	// Keep original column expressions so we can build the tuple
	fieldNames := make([]string, 0, len(query.GroupBy))
	for _, gb := range query.GroupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, nil)
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

	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))
	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 && len(query.GroupBy) > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, cteSB, query, start, end, keys, variables, true, true)
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
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
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

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)

	} else {
		sb.GroupBy("ts")
		sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
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
func (b *traceQueryStatementBuilder) buildScalarQuery(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
	skipResourceCTE bool,
	skipHaving bool,
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
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, &gb.TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, nil)
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

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, sb, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" && !skipHaving {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
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
func (b *traceQueryStatementBuilder) addFilterCondition(
	_ context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
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
			Variables:          variables,
		}, start, end)

		if err != nil {
			return nil, err
		}
	}

	if preparedWhereClause != nil {
		sb.AddWhereClause(preparedWhereClause.WhereClause)
	}

	// add time filter
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	sb.Where(sb.GE("timestamp", fmt.Sprintf("%d", start)), sb.L("timestamp", fmt.Sprintf("%d", end)), sb.GE("ts_bucket_start", startBucket), sb.LE("ts_bucket_start", endBucket))

	return preparedWhereClause, nil
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
	variables map[string]qbtypes.VariableItem,
) (cteSQL string, cteArgs []any, err error) {

	stmt, err := b.buildResourceFilterCTE(ctx, query, start, end, variables)
	if err != nil {
		return "", nil, err
	}

	sb.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")

	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args, nil
}

func (b *traceQueryStatementBuilder) buildResourceFilterCTE(
	ctx context.Context,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
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
