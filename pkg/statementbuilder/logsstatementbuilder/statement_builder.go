package logsstatementbuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const bodySearchDefaultWarning = "body searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"

func bodyAliasExpression(bodyJSONEnabled bool) string {
	if !bodyJSONEnabled {
		return logstelemetryschema.LogsV2BodyColumn
	}

	return fmt.Sprintf("%s as body", logstelemetryschema.LogsV2BodyV2Column)
}

type logQueryStatementBuilder struct {
	logger                         *slog.Logger
	metadataStore                  telemetrytypes.MetadataStore
	fm                             qbtypes.FieldMapper
	cb                             qbtypes.ConditionBuilder
	resourceFilterResolver         *resourcefilter.ResourceFingerprintResolver[qbtypes.LogAggregation]
	aggExprRewriter                qbtypes.AggExprRewriter
	fl                             flagger.Flagger
	skipResourceFingerprintEnabled bool

	fullTextColumn            *telemetrytypes.TelemetryFieldKey
	searchMaxScanRows         int64
	searchMaxScanRowsJSONBody int64
}

var _ qbtypes.StatementBuilder[qbtypes.LogAggregation] = (*logQueryStatementBuilder)(nil)

// NewFactory returns a provider factory for the logs statement builder. Its New
// internalizes the FieldMapper, ConditionBuilder, and AggExprRewriter, and reads
// SkipResourceFingerprint and the search() scan budgets from the config.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.LogAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("logs"),
		func(_ context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.LogAggregation], error) {
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(settings, logstelemetryschema.DefaultFullTextColumn, fm, cb, fl)
			return NewLogQueryStatementBuilder(
				settings, metadataStore, fm, cb, aggExprRewriter, logstelemetryschema.DefaultFullTextColumn,
				fl, telemetryStore, cfg,
			), nil
		},
	)
}

func NewLogQueryStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	aggExprRewriter qbtypes.AggExprRewriter,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fl flagger.Flagger,
	telemetryStore telemetrystore.TelemetryStore,
	cfg statementbuilder.Config,
) *logQueryStatementBuilder {
	logsSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema")

	resourceFilterResolver := resourcefilter.NewResolver[qbtypes.LogAggregation](
		settings,
		logstelemetryschema.DBName,
		logstelemetryschema.LogsResourceV2TableName,
		telemetrytypes.SignalLogs,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		fullTextColumn,
		fl,
		telemetryStore,
		cfg.SkipResourceFingerprint.Threshold,
	)

	b := &logQueryStatementBuilder{
		logger:                         logsSettings.Logger(),
		metadataStore:                  metadataStore,
		fm:                             fieldMapper,
		cb:                             conditionBuilder,
		resourceFilterResolver:         resourceFilterResolver,
		aggExprRewriter:                aggExprRewriter,
		fl:                             fl,
		skipResourceFingerprintEnabled: cfg.SkipResourceFingerprint.Enabled,
		searchMaxScanRows:              cfg.SearchMaxScanRows,
		searchMaxScanRowsJSONBody:      cfg.SearchMaxScanRowsJSONBody,
		fullTextColumn:                 fullTextColumn,
	}
	return b
}

// Build builds a SQL query for logs based on the given parameters.
func (b *logQueryStatementBuilder) Build(
	ctx context.Context,
	orgID valuer.UUID,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)
	bodyJSONEnabled := b.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	keySelectors, warnings := getKeySelectors(query, bodyJSONEnabled)
	keySelectors = querybuilder.ExpandKeySelectorsForFamilies(ctx, orgID, b.fl, keySelectors)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, keySelectors)
	if err != nil {
		return nil, err
	}

	query = b.adjustKeys(ctx, keys, query, requestType)

	// Create SQL builder
	q := sqlbuilder.NewSelectBuilder()

	var stmt *qbtypes.Statement
	switch requestType {
	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeRawStream:
		stmt, err = b.buildListQuery(ctx, orgID, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeTimeSeries:
		stmt, err = b.buildTimeSeriesQuery(ctx, orgID, q, query, start, end, keys, variables)
	case qbtypes.RequestTypeScalar:
		stmt, err = b.buildScalarQuery(ctx, orgID, q, query, start, end, keys, false, variables)
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type: %s", requestType)
	}

	if err != nil {
		return nil, err
	}

	stmt.Warnings = append(stmt.Warnings, warnings...)
	// Surface the guard's advisory to the user alongside the other warnings.
	if stmt.CostGuard != nil && stmt.CostGuard.Warning != "" {
		stmt.Warnings = append(stmt.Warnings, stmt.CostGuard.Warning)
	}
	return stmt, nil
}

// costGuardFor pairs the search() advisory with the budget for the body path taken —
// body_v2 has its own, lower one. nil when the statement needs no guard.
func (b *logQueryStatementBuilder) costGuardFor(ctx context.Context, orgID valuer.UUID, required bool) *qbtypes.CostGuard {
	if !required {
		return nil
	}
	maxScanRows := b.searchMaxScanRows
	if b.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		maxScanRows = b.searchMaxScanRowsJSONBody
	}
	return &qbtypes.CostGuard{Warning: querybuilder.SearchWarning, MaxScanRows: maxScanRows}
}

func getKeySelectors(query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], bodyJSONEnabled bool) ([]*telemetrytypes.FieldKeySelector, []string) {
	var keySelectors []*telemetrytypes.FieldKeySelector
	var warnings []string

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
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	// When the new JSON body experience is enabled, warn the user if they use the bare
	// "body" key in the filter — queries on plain "body" default to body.message:string.
	// TODO(Piyush): Setup better for coming FTS support.
	if bodyJSONEnabled {
		for _, sel := range keySelectors {
			if sel.Name == logstelemetryschema.LogsV2BodyColumn {
				warnings = append(warnings, bodySearchDefaultWarning)
				break
			}
		}
	}

	return keySelectors, warnings
}

func (b *logQueryStatementBuilder) adjustKeys(ctx context.Context, keys map[string][]*telemetrytypes.TelemetryFieldKey, query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], requestType qbtypes.RequestType) qbtypes.QueryBuilderQuery[qbtypes.LogAggregation] {

	// Always ensure timestamp and id are present in keys map
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

	/*
		Adjust keys for alias expressions in aggregations
	*/
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
		b.logger.DebugContext(ctx, "key adjustment action", slog.String("action", action))
	}

	return query
}

func (b *logQueryStatementBuilder) adjustKey(key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) []string {
	// First check if it matches with any intrinsic fields
	var intrinsicOrCalculatedField telemetrytypes.TelemetryFieldKey
	if _, ok := logstelemetryschema.IntrinsicFields[key.Name]; ok {
		intrinsicOrCalculatedField = logstelemetryschema.IntrinsicFields[key.Name]
		return querybuilder.AdjustKey(key, keys, &intrinsicOrCalculatedField)
	}

	return querybuilder.AdjustKey(key, keys, nil)
}

// buildListQuery builds a query for list panel type.
func (b *logQueryStatementBuilder) buildListQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// Select timestamp and id by default
	sb.Select(logstelemetryschema.LogsV2TimestampColumn)
	sb.SelectMore(logstelemetryschema.LogsV2IDColumn)
	if len(query.SelectFields) == 0 {
		// Select all default columns
		sb.SelectMore(logstelemetryschema.LogsV2TraceIDColumn)
		sb.SelectMore(logstelemetryschema.LogsV2SpanIDColumn)
		sb.SelectMore(logstelemetryschema.LogsV2TraceFlagsColumn)
		sb.SelectMore(logstelemetryschema.LogsV2SeverityTextColumn)
		sb.SelectMore(logstelemetryschema.LogsV2SeverityNumberColumn)
		sb.SelectMore(logstelemetryschema.LogsV2ScopeNameColumn)
		sb.SelectMore(logstelemetryschema.LogsV2ScopeVersionColumn)
		sb.SelectMore(bodyAliasExpression(b.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))))
		sb.SelectMore(logstelemetryschema.LogsV2AttributesStringColumn)
		sb.SelectMore(logstelemetryschema.LogsV2AttributesNumberColumn)
		sb.SelectMore(logstelemetryschema.LogsV2AttributesBoolColumn)
		sb.SelectMore(logstelemetryschema.LogsV2ResourcesStringColumn)
		sb.SelectMore(logstelemetryschema.LogsV2ScopeStringColumn)

	} else {
		// Select specified columns
		for index := range query.SelectFields {
			if query.SelectFields[index].Name == logstelemetryschema.LogsV2TimestampColumn || query.SelectFields[index].Name == logstelemetryschema.LogsV2IDColumn {
				continue
			}

			// get column expression for the field - use array index directly to avoid pointer to loop variable
			colExpr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &query.SelectFields[index], telemetrytypes.FieldDataTypeUnspecified, keys)
			if err != nil {
				return nil, err
			}
			sb.SelectMore(fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colExpr), selectColumnAlias(index, query.SelectFields[index].Name)))
		}
	}

	sb.From(fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName))
	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)

	if err != nil {
		return nil, err
	}

	// Add order by
	for _, orderBy := range query.Order {

		colExpr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &orderBy.Key.TelemetryFieldKey, telemetrytypes.FieldDataTypeUnspecified, keys)
		if err != nil {
			return nil, err
		}
		sb.OrderBy(fmt.Sprintf("%s %s", sqlbuilder.Escape(colExpr), orderBy.Direction.StringValue()))
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
		CostGuard:      b.costGuardFor(ctx, orgID, preparedWhereClause.RequiresCostGuard),
	}

	return stmt, nil
}

func (b *logQueryStatementBuilder) buildTimeSeriesQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	sb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts",
		int64(query.StepInterval.Seconds()),
	))

	// Keep original column expressions so we can build the tuple
	bodyJSONEnabled := b.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))
	fieldNames := make([]string, 0, len(query.GroupBy))
	for i, gb := range query.GroupBy {
		if !bodyJSONEnabled && (strings.Contains(gb.Name, telemetrytypes.ArraySep) || strings.Contains(gb.Name, telemetrytypes.ArrayAnyIndex)) {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "Group by/Aggregation isn't available for the Array Paths: %s", gb.Name)
		}
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

	// Add FROM clause
	sb.From(fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName))

	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)

	if err != nil {
		return nil, err
	}

	var finalSQL string
	var finalArgs []any

	if query.Limit > 0 && len(query.GroupBy) > 0 {
		// build the scalar “top/bottom-N” query in its own builder.
		cteSB := sqlbuilder.NewSelectBuilder()
		cteStmt, err := b.buildScalarQuery(ctx, orgID, cteSB, query, start, end, keys, true, variables)
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
			// Rewrite having expression to use SQL column names
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
		CostGuard:      b.costGuardFor(ctx, orgID, preparedWhereClause.RequiresCostGuard),
	}

	return stmt, nil
}

// buildScalarQuery builds a query for scalar panel type.
func (b *logQueryStatementBuilder) buildScalarQuery(
	ctx context.Context,
	orgID valuer.UUID,
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

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" && !skipResourceCTE {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	allAggChArgs := []any{}

	bodyJSONEnabled := b.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))
	fieldNames := make([]string, 0, len(query.GroupBy))
	for i, gb := range query.GroupBy {
		if !bodyJSONEnabled && (strings.Contains(gb.Name, telemetrytypes.ArraySep) || strings.Contains(gb.Name, telemetrytypes.ArrayAnyIndex)) {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "Group by/Aggregation isn't available for the Array Paths: %s", gb.Name)
		}
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

	sb.From(fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName))

	// Add filter conditions
	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)

	if err != nil {
		return nil, err
	}

	// Group by dimensions
	sb.GroupBy(fieldNames...)

	// Add having clause if needed
	if query.Having != nil && query.Having.Expression != "" {
		rewriter := querybuilder.NewHavingExpressionRewriter()
		rewrittenExpr, err := rewriter.RewriteForLogs(query.Having.Expression, query.Aggregations)
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
		CostGuard:      b.costGuardFor(ctx, orgID, preparedWhereClause.RequiresCostGuard),
	}

	return stmt, nil
}

// buildFilterCondition builds SQL condition from filter expression.
func (b *logQueryStatementBuilder) addFilterCondition(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
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
			FullTextColumn:     b.fullTextColumn,
			Variables:          variables,
			StartNs:            start,
			EndNs:              end,
			Flagger:            b.fl,
			Signal:             telemetrytypes.SignalLogs,
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

func groupByColumnAlias(i int, name string) string {
	return fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, name)
}

func selectColumnAlias(i int, name string) string {
	return fmt.Sprintf("__SELECT_KEY_%d_%s", i, name)
}

func groupByOrderAlias(orderKey string, groupBy []qbtypes.GroupByKey) (string, bool) {
	for i := range groupBy {
		if groupBy[i].Name == orderKey {
			return groupByColumnAlias(i, groupBy[i].Name), true
		}
	}
	return "", false
}

func (b *logQueryStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
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
