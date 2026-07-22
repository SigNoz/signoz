package telemetrytraces

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryresourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrUnsupportedAggregation = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported aggregation")
)

type traceQueryStatementBuilder struct {
	logger                         *slog.Logger
	metadataStore                  telemetrytypes.MetadataStore
	fm                             qbtypes.FieldMapper
	cb                             qbtypes.ConditionBuilder
	resourceFilterResolver         *telemetryresourcefilter.ResourceFingerprintResolver[qbtypes.TraceAggregation]
	aggExprRewriter                qbtypes.AggExprRewriter
	skipResourceFingerprintEnabled bool
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*traceQueryStatementBuilder)(nil)

func NewTraceQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	aggExprRewriter qbtypes.AggExprRewriter,
	telemetryStore telemetrystore.TelemetryStore,
	flagger flagger.Flagger,
	skipResourceFingerprintEnable bool,
	skipResourceFingerprintThreshold uint64,
) *traceQueryStatementBuilder {
	tracesSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrytraces")

	resourceFilterResolver := telemetryresourcefilter.NewResolver[qbtypes.TraceAggregation](
		settings,
		DBName,
		TracesResourceV3TableName,
		telemetrytypes.SignalTraces,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		nil,
		flagger,
		telemetryStore,
		skipResourceFingerprintThreshold,
	)

	return &traceQueryStatementBuilder{
		logger:                         tracesSettings.Logger(),
		metadataStore:                  metadataStore,
		fm:                             fieldMapper,
		cb:                             conditionBuilder,
		resourceFilterResolver:         resourceFilterResolver,
		aggExprRewriter:                aggExprRewriter,
		skipResourceFingerprintEnabled: skipResourceFingerprintEnable,
	}
}

// Build builds a SQL query for traces based on the given parameters.
func (b *traceQueryStatementBuilder) Build(
	ctx context.Context,
	orgID valuer.UUID,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)

	isSelectFieldsEmpty := false
	if requestType == qbtypes.RequestTypeRaw {
		isSelectFieldsEmpty = len(query.SelectFields) == 0
		// we are expanding here to ensure that all the conflicts are taken care in adjustKeys
		// i.e if there is a conflict we strip away context of the key in adjustKeys
		query = b.expandRawSelectFields(query)
	}

	// We modify SelectFields above (injecting default fields), and those default
	// fields can carry keys that need evolutions, so fetch keys after that.
	keySelectors := getKeySelectors(query)

	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, keySelectors)
	if err != nil {
		return nil, err
	}

	for _, action := range adjustTraceKeys(keys, &query, requestType) {
		// TODO: change to debug level once we are confident about the behavior
		b.logger.InfoContext(ctx, "key adjustment action", slog.String("action", action))
	}
	// Create SQL builder
	q := sqlbuilder.NewSelectBuilder()

	switch requestType {
	case qbtypes.RequestTypeRaw:
		return b.buildListQuery(ctx, orgID, q, query, start, end, keys, variables, isSelectFieldsEmpty)
	case qbtypes.RequestTypeTimeSeries:
		return b.buildTimeSeriesQuery(ctx, orgID, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		return b.buildScalarQuery(ctx, orgID, q, query, start, end, keys, variables, false, false)
	case qbtypes.RequestTypeTrace:
		return b.buildTraceQuery(ctx, orgID, q, query, start, end, keys, variables)
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

// mergeDeprecatedTraceKeys prepends deprecated intrinsic/calculated trace field
// definitions to the keys map. We do this during statement building, not at
// metadata fetch time, because:
//  1. Filter expressions that reference deprecated columns must continue to
//     resolve — otherwise they fail with "key not found".
//  2. Doing it at metadata fetch time would also surface deprecated keys in
//     autocomplete suggestions, which we don't want.
//  3. We prepend (not append) so the intrinsic/calculated entry wins ordering
//     in the multi_if SQL expression.
func mergeDeprecatedTraceKeys(keys map[string][]*telemetrytypes.TelemetryFieldKey) {
	for fieldKeyName, fieldKey := range IntrinsicFieldsDeprecated {
		keys[fieldKeyName] = append([]*telemetrytypes.TelemetryFieldKey{&fieldKey}, keys[fieldKeyName]...)
	}
	for fieldKeyName, fieldKey := range CalculatedFieldsDeprecated {
		keys[fieldKeyName] = append([]*telemetrytypes.TelemetryFieldKey{&fieldKey}, keys[fieldKeyName]...)
	}
}

func adjustTraceKeys(keys map[string][]*telemetrytypes.TelemetryFieldKey, query *qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], requestType qbtypes.RequestType) []string {

	mergeDeprecatedTraceKeys(keys)

	// Adjust keys for alias expressions in aggregations
	actions := querybuilder.AdjustKeysForAliasExpressions(query, requestType)

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

	actions = append(actions, querybuilder.AdjustDuplicateKeys(query)...)

	/*
		Now adjust each key to have correct context and data type
		Here we try to make intelligent guesses which work for all users (not just majority)
		Reason for doing this is to not create an unexpected behavior for users
	*/
	for idx := range query.SelectFields {
		actions = append(actions, adjustTraceKey(&query.SelectFields[idx], keys)...)
	}
	for idx := range query.GroupBy {
		actions = append(actions, adjustTraceKey(&query.GroupBy[idx].TelemetryFieldKey, keys)...)
	}
	for idx := range query.Order {
		actions = append(actions, adjustTraceKey(&query.Order[idx].Key.TelemetryFieldKey, keys)...)
	}

	return actions
}

// adjustTraceKey resolves a single TelemetryFieldKey against the keys map.
func adjustTraceKey(key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) []string {

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

// buildListQuery builds a query for list panel type.
func (b *traceQueryStatementBuilder) buildListQuery(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
	isSelectFieldsEmpty bool,
) (*qbtypes.Statement, error) {

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	for i, field := range query.SelectFields {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &field, telemetrytypes.FieldDataTypeUnspecified, keys)
		if err != nil {
			return nil, err
		}
		sb.SelectMore(fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(expr), selectColumnAlias(i, field.Name)))
	}

	if isSelectFieldsEmpty {
		for _, col := range ContextualSpanColumns {
			sb.SelectMore(col)
		}
	}

	// From table
	sb.From(fmt.Sprintf("%s.%s", DBName, SpanIndexV3TableName))

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)
	if err != nil {
		return nil, err
	}

	// Add order by
	for _, orderBy := range query.Order {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &orderBy.Key.TelemetryFieldKey, telemetrytypes.FieldDataTypeUnspecified, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", sqlbuilder.Escape(expr), orderBy.Direction.StringValue()))
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
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       preparedWhereClause.Warnings,
		WarningsDocURL: preparedWhereClause.WarningsDocURL,
	}

	return stmt, nil
}

func (b *traceQueryStatementBuilder) buildTraceQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, distSB, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, distSB, start, end, query, keys, variables, skipResourceFilter)
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
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       preparedWhereClause.Warnings,
		WarningsDocURL: preparedWhereClause.WarningsDocURL,
	}

	return stmt, nil
}

func (b *traceQueryStatementBuilder) buildTimeSeriesQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	// Keep original column expressions so we can build the tuple
	fieldNames := make([]string, 0, len(query.GroupBy))
	for i, gb := range query.GroupBy {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &gb.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, err
		}
		fieldAlias := groupByColumnAlias(i, gb.Name)
		sb.SelectMore(fmt.Sprintf("toString(%s) AS `%s`", sqlbuilder.Escape(expr), fieldAlias))
		fieldNames = append(fieldNames, fmt.Sprintf("`%s`", fieldAlias))
	}

	// Aggregations
	allAggChArgs := make([]any, 0)
	for i, agg := range query.Aggregations {
		rewritten, chArgs, err := b.aggExprRewriter.Rewrite(
			ctx, orgID, start, end, agg.Expression,
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
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)
	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 && len(query.GroupBy) > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, orgID, cteSB, query, start, end, keys, variables, true, true)
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
		sb.GroupBy(fieldNames...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}

		if len(query.Order) != 0 {
			for _, orderBy := range query.Order {
				_, ok := aggOrderBy(orderBy, query)
				if !ok {
					orderCol := orderBy.Key.Name
					if alias, ok := groupByOrderAlias(orderBy.Key.Name, query.GroupBy); ok {
						orderCol = alias
					}
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderCol, orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}

		combinedArgs := allAggChArgs
		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)

	} else {
		sb.GroupBy("ts")
		sb.GroupBy(fieldNames...)
		if query.Having != nil && query.Having.Expression != "" {
			rewriter := querybuilder.NewHavingExpressionRewriter()
			rewrittenExpr, err := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
			if err != nil {
				return nil, err
			}
			sb.Having(rewrittenExpr)
		}

		if len(query.Order) != 0 {
			for _, orderBy := range query.Order {
				_, ok := aggOrderBy(orderBy, query)
				if !ok {
					orderCol := orderBy.Key.Name
					if alias, ok := groupByOrderAlias(orderBy.Key.Name, query.GroupBy); ok {
						orderCol = alias
					}
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderCol, orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}

		combinedArgs := allAggChArgs
		mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

		// Stitch it all together:  WITH … SELECT …
		finalSQL = querybuilder.CombineCTEs(cteFragments) + mainSQL
		finalArgs = querybuilder.PrependArgs(cteArgs, mainArgs)
	}

	stmt := &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       preparedWhereClause.Warnings,
		WarningsDocURL: preparedWhereClause.WarningsDocURL,
	}

	return stmt, nil
}

// buildScalarQuery builds a query for scalar panel type.
func (b *traceQueryStatementBuilder) buildScalarQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	fieldNames := make([]string, 0, len(query.GroupBy))
	for i, gb := range query.GroupBy {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &gb.TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, err
		}
		fieldAlias := groupByColumnAlias(i, gb.Name)
		sb.SelectMore(fmt.Sprintf("toString(%s) AS `%s`", sqlbuilder.Escape(expr), fieldAlias))
		fieldNames = append(fieldNames, fmt.Sprintf("`%s`", fieldAlias))
	}

	// for scalar queries, the rate would be end-start
	rateInterval := (end - start) / querybuilder.NsToSeconds

	// Add aggregation
	if len(query.Aggregations) > 0 {
		for idx := range query.Aggregations {
			aggExpr := query.Aggregations[idx]
			rewritten, chArgs, err := b.aggExprRewriter.Rewrite(
				ctx, orgID, start, end, aggExpr.Expression,
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
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)
	if err != nil {
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy(fieldNames...)

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" && !skipHaving {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr, err := rewriter.RewriteForTraces(query.Having.Expression, query.Aggregations)
		if err != nil {
			return nil, err
		}
		sb.Having(rewrittenExpr)
	}

	// Add order by
	for _, orderBy := range query.Order {
		idx, ok := aggOrderBy(orderBy, query)
		if ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			orderCol := orderBy.Key.Name
			if alias, ok := groupByOrderAlias(orderBy.Key.Name, query.GroupBy); ok {
				orderCol = alias
			}
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderCol, orderBy.Direction.StringValue()))
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

	combinedArgs := allAggChArgs

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse, combinedArgs...)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	stmt := &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       preparedWhereClause.Warnings,
		WarningsDocURL: preparedWhereClause.WarningsDocURL,
	}

	return stmt, nil
}

// buildFilterCondition builds SQL condition from filter expression.
func (b *traceQueryStatementBuilder) addFilterCondition(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
	skipResourceFilter bool,
) (querybuilder.PreparedWhereClause, error) {

	var preparedWhereClause querybuilder.PreparedWhereClause
	var err error

	if query.Filter != nil && query.Filter.Expression != "" {
		// add filter expression
		preparedWhereClause, err = querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:            ctx,
			OrgID:              orgID,
			Logger:             b.logger,
			FieldMapper:        b.fm,
			ConditionBuilder:   b.cb,
			FieldKeys:          keys,
			SkipResourceFilter: skipResourceFilter,
			Variables:          variables,
			StartNs:            start,
			EndNs:              end,
		})

		if err != nil {
			return preparedWhereClause, err
		}
	}

	if !preparedWhereClause.IsEmpty() {
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

// groupByColumnAlias returns the positional SQL alias for the i-th group-by dimension;
// the querier (consume.go stripKeyAlias) strips the prefix to recover the field name.
func groupByColumnAlias(i int, name string) string {
	return fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, name)
}

// selectColumnAlias returns the positional SQL alias for the i-th raw select field. Like
// groupByColumnAlias, the prefix is stripped by the querier.
func selectColumnAlias(i int, name string) string {
	return fmt.Sprintf("__SELECT_KEY_%d_%s", i, name)
}

// groupByOrderAlias returns the group-by column alias to order by when orderKey names a
// group-by dimension (matching how the SELECT aliases it), else ("", false).
func groupByOrderAlias(orderKey string, groupBy []qbtypes.GroupByKey) (string, bool) {
	for i := range groupBy {
		if groupBy[i].Name == orderKey {
			return groupByColumnAlias(i, groupBy[i].Name), true
		}
	}
	return "", false
}

func (b *traceQueryStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (cteSQL string, cteArgs []any, skipResourceFilter bool, err error) {

	if b.skipResourceFingerprintEnabled {
		decision, err := b.resourceFilterResolver.Resolve(ctx, orgID, query, start, end, variables)
		if err != nil {
			return "", nil, true, err
		}
		switch decision {
		case qbtypes.ResourceFilterResolveKindNoOp:
			return "", nil, true, nil
		case qbtypes.ResourceFilterResolveKindFallback:
			return "", nil, false, nil
		}
	}

	stmt, err := b.resourceFilterResolver.StatementBuilder().Build(
		ctx, orgID, start, end, qbtypes.RequestTypeRaw, query, variables,
	)
	if err != nil {
		return "", nil, true, err
	}
	if stmt == nil {
		return "", nil, true, nil
	}
	sb.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args, true, nil
}

// expandRawSelectFields populates SelectFields for raw (list view) queries.
// It must be called before adjustKeys so that normalization runs over the full set.
func (b *traceQueryStatementBuilder) expandRawSelectFields(query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation] {
	if len(query.SelectFields) == 0 {
		selectFields := make([]telemetrytypes.TelemetryFieldKey, 0, len(IntrinsicSpanFields)+len(CalculatedSpanFields))
		selectFields = append(selectFields, IntrinsicSpanFields...)
		selectFields = append(selectFields, CalculatedSpanFields...)
		query.SelectFields = selectFields
		return query
	}

	selectFields := []telemetrytypes.TelemetryFieldKey{
		{Name: SpanTimestampColumn, FieldContext: telemetrytypes.FieldContextSpan},
		{Name: SpanTraceIDColumn, FieldContext: telemetrytypes.FieldContextSpan},
		{Name: SpanSpanIDColumn, FieldContext: telemetrytypes.FieldContextSpan},
	}
	for _, field := range query.SelectFields {
		// TODO(tvats): If a user specifies attribute.timestamp in the select fields, this loop will basically ignore it, as we already added a field by default. This can be fixed once we close https://github.com/SigNoz/engineering-pod/issues/3693
		if field.Name == SpanTimestampColumn || field.Name == SpanTraceIDColumn || field.Name == SpanSpanIDColumn {
			continue
		}
		selectFields = append(selectFields, field)
	}
	query.SelectFields = selectFields
	return query
}
