package scopedtracesstatementbuilder

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/statementbuilder/tracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	qbvariables "github.com/SigNoz/signoz/pkg/variables"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrUnsupportedRequestType = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type for the scoped trace builder")
)

// scopedTraceStatementBuilder builds a trace list scoped to one span category
// (e.g. gen_ai spans); the TraceScope decides which spans are in scope and which
// per-trace columns to compute.
type scopedTraceStatementBuilder struct {
	logger                    *slog.Logger
	metadataStore             telemetrytypes.MetadataStore
	fm                        qbtypes.FieldMapper
	cb                        qbtypes.ConditionBuilder
	scope                     TraceScope
	traceStmtBuilder          qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*scopedTraceStatementBuilder)(nil)

// NewFactory returns a provider factory for a scoped trace statement builder. The
// package is domain-neutral: the caller supplies the factory name and the TraceScope
// (see aistatementbuilder for the gen_ai scope).
func NewFactory(
	name factory.Name,
	scope TraceScope,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.TraceAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		name,
		func(ctx context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.TraceAggregation], error) {
			traceStmtBuilder, err := tracesstatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
			if err != nil {
				return nil, err
			}
			fm := tracestelemetryschema.NewFieldMapper()
			cb := tracestelemetryschema.NewConditionBuilder(fm)
			return NewScopedTraceStatementBuilder(settings, metadataStore, fm, cb, scope, traceStmtBuilder, fl), nil
		},
	)
}

// NewScopedTraceStatementBuilder wires the generic trace-list builder;
// traceStmtBuilder is the delegate for the span-list path.
func NewScopedTraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	scope TraceScope,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	fl flagger.Flagger,
) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	scopedSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/statementbuilder/scopedtracesstatementbuilder")

	resourceFilterStmtBuilder := resourcefilter.New[qbtypes.TraceAggregation](
		settings,
		tracestelemetryschema.DBName,
		tracestelemetryschema.TracesResourceV3TableName,
		telemetrytypes.SignalTraces,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		nil,
		fl,
	)

	return &scopedTraceStatementBuilder{
		logger:                    scopedSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fieldMapper,
		cb:                        conditionBuilder,
		scope:                     scope,
		traceStmtBuilder:          traceStmtBuilder,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
	}
}

func (b *scopedTraceStatementBuilder) Build(
	ctx context.Context,
	orgID valuer.UUID,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	switch requestType {
	case qbtypes.RequestTypeTrace:
		return b.buildTraceListQuery(ctx, orgID, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), query, variables)
	case qbtypes.RequestTypeRaw:
		return b.buildDelegated(ctx, orgID, start, end, requestType, query, variables)
	default:
		return nil, ErrUnsupportedRequestType
	}
}

// buildDelegated ANDs the base gate into the user filter and delegates to the
// standard trace builder (the span-list / raw path).
func (b *scopedTraceStatementBuilder) buildDelegated(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	gate := b.scope.FilterExpression
	expr := gate
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		expr = fmt.Sprintf("(%s) AND (%s)", gate, query.Filter.Expression)
	}

	// shallow copy; only Filter is replaced, caller's query untouched
	gated := query
	gated.Filter = &qbtypes.Filter{Expression: expr}

	return b.traceStmtBuilder.Build(ctx, orgID, start, end, requestType, gated, variables)
}

// buildTraceListQuery wires the CTE pipeline (start/end are nanoseconds):
// matched (windowed, mask-pruned top-N trace_ids) → ranked (their [start,end] from
// the summary table) → buckets (ts_bucket_start prune) → enrichment (every per-trace
// column over each trace's full extent). Only Orderable columns are computable in the
// matched pass, so only they can be ordered or filtered on.
func (b *scopedTraceStatementBuilder) buildTraceListQuery(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}

	// Condition args bind into the builder an expression is embedded in, so the
	// matched and enrichment passes each resolve against their own builder.
	keys, err := b.fetchKeys(ctx, orgID)
	if err != nil {
		return nil, err
	}
	matchedSB := sqlbuilder.NewSelectBuilder()
	maskExpr, resolved, err := b.resolveFor(ctx, orgID, start, end, keys, matchedSB)
	if err != nil {
		return nil, err
	}
	enrichSB := sqlbuilder.NewSelectBuilder()
	_, enrichResolved, err := b.resolveFor(ctx, orgID, start, end, keys, enrichSB)
	if err != nil {
		return nil, err
	}
	orders, err := b.resolveListOrders(query.Order, resolved)
	if err != nil {
		return nil, err
	}
	orderableSet := orderableAliasSet(resolved)

	resourceFrag, resourceArgs, resourcePred, err := b.maybeAttachResourceFilter(ctx, orgID, query, start, end, variables)
	if err != nil {
		return nil, err
	}

	fp, err := b.splitFilter(ctx, orgID, query, b.aggregateAliasSet(), orderableSet, start, end, variables, matchedSB)
	if err != nil {
		return nil, err
	}

	matchedFrag, matchedArgs, err := b.buildMatchedCTE(matchedSB, start, end, startBucket, endBucket, resolved, orders, orderableSet, maskExpr, fp, resourcePred, limit, query.Offset)
	if err != nil {
		return nil, err
	}
	rankedFrag, rankedArgs := b.buildRankedCTE(start, end)

	adj := querybuilder.BucketAdjustment // 30-min bucket width in seconds
	bucketsFrag := fmt.Sprintf("buckets AS (SELECT DISTINCT b AS ts_bucket FROM ranked "+
		"ARRAY JOIN range("+
		"toUInt64(intDiv(toUnixTimestamp(t_start), %d) * %d - %d), "+
		"toUInt64(intDiv(toUnixTimestamp(t_end), %d) * %d + %d), "+
		"%d) AS b)", adj, adj, adj, adj, adj, adj, adj)

	mainSQL, mainArgs := b.buildEnrichmentSelect(enrichSB, enrichResolved, orders)

	cteFragments := []string{matchedFrag, rankedFrag, bucketsFrag}
	cteArgs := [][]any{matchedArgs, rankedArgs, nil}

	// __resource_filter must precede `matched`, which references it.
	if resourceFrag != "" {
		cteFragments = append([]string{resourceFrag}, cteFragments...)
		cteArgs = append([][]any{resourceArgs}, cteArgs...)
	}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       fp.warnings,
		WarningsDocURL: fp.warningsURL,
	}, nil
}

// maybeAttachResourceFilter builds the __resource_filter CTE and the fingerprint
// predicate narrowing the span scan; empty fragments when the filter has no resource
// conditions. Deliberately no skip-fingerprint fallback: falling back would leave the
// resource conditions in the OR'd span-filter bucket and change trace membership.
func (b *scopedTraceStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	orgID valuer.UUID,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (cteFrag string, cteArgs []any, fingerprintPred string, err error) {
	stmt, err := b.resourceFilterStmtBuilder.Build(
		ctx, orgID, start, end, qbtypes.RequestTypeRaw, query, variables,
	)
	if err != nil {
		return "", nil, "", err
	}
	if stmt == nil {
		return "", nil, "", nil
	}
	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args,
		"resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)", nil
}

func (b *scopedTraceStatementBuilder) fetchKeys(ctx context.Context, orgID valuer.UUID) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	fields := b.resolverFieldKeys()
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(fields))
	for _, k := range fields {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:              k.Name,
			Signal:            k.Signal,
			FieldContext:      k.FieldContext,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		})
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, selectors)
	return keys, err
}

func (b *scopedTraceStatementBuilder) resolverFieldKeys() []*telemetrytypes.TelemetryFieldKey {
	seen := make(map[string]struct{})
	var out []*telemetrytypes.TelemetryFieldKey
	add := func(k *telemetrytypes.TelemetryFieldKey) {
		if k == nil {
			return
		}
		if _, dup := seen[k.Name]; dup {
			return
		}
		seen[k.Name] = struct{}{}
		out = append(out, k)
	}
	for _, k := range b.scope.FieldKeys {
		add(k)
	}
	for _, c := range b.scope.Columns {
		for _, k := range c.Expr.keys {
			add(k)
		}
	}
	return out
}

// resolveFor renders the gate mask and every scope column with condition args bound
// into sb.
func (b *scopedTraceStatementBuilder) resolveFor(ctx context.Context, orgID valuer.UUID, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, sb *sqlbuilder.SelectBuilder) (string, []resolvedColumn, error) {
	cols := newColumnResolver(b.fm, keys)
	preds := newPredicateResolver(b.cb, keys, sb)
	maskExpr, err := b.resolveMask(ctx, orgID, start, end, preds)
	if err != nil {
		return "", nil, err
	}
	preds.maskExpr = maskExpr
	resolved, err := b.resolveColumns(ctx, orgID, start, end, cols, preds)
	if err != nil {
		return "", nil, err
	}
	return maskExpr, resolved, nil
}

// resolveMask builds the per-span in-scope mask: OR of the gate keys' EXISTS predicates.
func (b *scopedTraceStatementBuilder) resolveMask(ctx context.Context, orgID valuer.UUID, start, end uint64, preds *predicateResolver) (string, error) {
	fieldKeys := b.scope.FieldKeys
	parts := make([]string, 0, len(fieldKeys))
	for _, key := range fieldKeys {
		e, err := preds.ExistsFor(ctx, orgID, start, end, key)
		if err != nil {
			return "", err
		}
		parts = append(parts, e)
	}
	return "(" + strings.Join(parts, " OR ") + ")", nil
}

type resolvedColumn struct {
	alias     string
	expr      string
	orderable bool
}

func (b *scopedTraceStatementBuilder) resolveColumns(ctx context.Context, orgID valuer.UUID, start, end uint64, cols *columnResolver, preds *predicateResolver) ([]resolvedColumn, error) {
	out := make([]resolvedColumn, 0, len(b.scope.Columns))
	for _, c := range b.scope.Columns {
		expr, err := c.Expr.render(ctx, orgID, start, end, cols, preds)
		if err != nil {
			return nil, err
		}
		out = append(out, resolvedColumn{alias: c.Alias, expr: expr, orderable: c.Orderable})
	}
	return out, nil
}

type listOrder struct {
	alias     string
	direction string
}

// resolveListOrders maps order keys to resolved orderable columns; non-orderable
// columns are rejected.
func (b *scopedTraceStatementBuilder) resolveListOrders(order []qbtypes.OrderBy, resolved []resolvedColumn) ([]listOrder, error) {
	byAlias := make(map[string]resolvedColumn, len(resolved))
	orderable := make([]string, 0, len(resolved))
	for _, rc := range resolved {
		byAlias[rc.alias] = rc
		if rc.orderable {
			orderable = append(orderable, rc.alias)
		}
	}

	if len(order) == 0 {
		return []listOrder{{alias: b.scope.DefaultOrderAlias, direction: "DESC"}}, nil
	}

	orders := make([]listOrder, 0, len(order))
	for _, o := range order {
		direction := "DESC"
		if o.Direction == qbtypes.OrderDirectionAsc {
			direction = "ASC"
		}
		rc, ok := byAlias[o.Key.Name]
		if !ok || !rc.orderable {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"unsupported order key %q for the trace list; orderable keys: %s", o.Key.Name, strings.Join(orderable, ", "))
		}
		orders = append(orders, listOrder{alias: rc.alias, direction: direction})
	}
	return orders, nil
}

// filterParts is the user filter split into a span-level predicate and a trace-level
// HAVING expression.
type filterParts struct {
	spanPred      string
	hasSpanFilter bool
	havingExpr    string
	warnings      []string
	warningsURL   string
}

// splitFilter splits query.Filter into a span-level predicate (args bound into sb)
// and a trace-level HAVING (explicit query.Having ANDed on), then validates the
// trace-level part against the matched-pass aggregates.
func (b *scopedTraceStatementBuilder) splitFilter(ctx context.Context, orgID valuer.UUID, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], classifySet, orderableSet map[string]struct{}, start, end uint64, variables map[string]qbtypes.VariableItem, sb *sqlbuilder.SelectBuilder) (filterParts, error) {
	var fp filterParts
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, classifySet)
		if err != nil {
			return fp, err
		}
		fp.havingExpr = traceExpr
		if strings.TrimSpace(spanExpr) != "" {
			pred, warnings, url, err := b.resolveSpanPredicate(ctx, orgID, start, end, spanExpr, variables, sb)
			if err != nil {
				return fp, err
			}
			// pred is empty when all span-level keys were resource attributes
			// already handled by __resource_filter
			if strings.TrimSpace(pred) != "" {
				fp.spanPred, fp.hasSpanFilter = pred, true
			}
			fp.warnings, fp.warningsURL = warnings, url
		}
	}
	if query.Having != nil && strings.TrimSpace(query.Having.Expression) != "" {
		if fp.havingExpr != "" {
			fp.havingExpr = fmt.Sprintf("(%s) AND (%s)", fp.havingExpr, query.Having.Expression)
		} else {
			fp.havingExpr = query.Having.Expression
		}
	}
	// the HAVING is a plain text rewrite, so substitute variables here
	if strings.TrimSpace(fp.havingExpr) != "" && len(variables) > 0 {
		replaced, err := qbvariables.ReplaceVariablesInExpression(fp.havingExpr, variables)
		if err != nil {
			return fp, err
		}
		fp.havingExpr = replaced
	}
	if err := validateAggregateFilter(fp.havingExpr, orderableSet); err != nil {
		return fp, err
	}
	return fp, nil
}

// resolveSpanPredicate resolves a span-level filter expression to a bare boolean
// predicate, args bound into sb.
func (b *scopedTraceStatementBuilder) resolveSpanPredicate(ctx context.Context, orgID valuer.UUID, start, end uint64, expr string, variables map[string]qbtypes.VariableItem, sb *sqlbuilder.SelectBuilder) (string, []string, string, error) {
	selectors := querybuilder.QueryStringToKeysSelectors(expr)
	for i := range selectors {
		selectors[i].Signal = telemetrytypes.SignalTraces
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, selectors)
	if err != nil {
		return "", nil, "", err
	}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		OrgID:            orgID,
		Logger:           b.logger,
		FieldMapper:      b.fm,
		ConditionBuilder: b.cb,
		FieldKeys:        keys,
		Builder:          sb,
		// resource conditions are handled by __resource_filter
		SkipResourceFilter: true,
		Variables:          variables,
		StartNs:            start,
		EndNs:              end,
	})
	if err != nil {
		return "", nil, "", err
	}
	if prepared.IsEmpty() {
		return "", nil, "", nil
	}
	return prepared.Expr, prepared.Warnings, prepared.WarningsDocURL, nil
}

// buildMatchedCTE builds `matched`: one windowed GROUP BY trace_id scan fusing gate +
// span filter + HAVING + ORDER BY + LIMIT/OFFSET, selecting only the aliases ORDER BY
// / HAVING reference. Expressions carry $n markers bound to sb, so each can appear
// several times and every occurrence resolves to the same arg.
func (b *scopedTraceStatementBuilder) buildMatchedCTE(sb *sqlbuilder.SelectBuilder, start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder, orderableSet map[string]struct{}, maskExpr string, fp filterParts, resourcePred string, limit, offset int) (string, []any, error) {
	needed := neededMatchedAliases(orders, fp.havingExpr, orderableSet)
	selects := []string{"trace_id"}
	for _, rc := range resolved {
		if _, ok := needed[rc.alias]; !ok {
			continue
		}
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(fmt.Sprintf("%s.%s", tracestelemetryschema.DBName, tracestelemetryschema.SpanIndexV3TableName))

	// prune widened by the span filter so its spans survive for the countIf below
	prune := "(" + maskExpr
	if fp.hasSpanFilter {
		prune += " OR " + fp.spanPred
	}
	prune += ")"
	where := []string{
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
		prune,
	}
	if resourcePred != "" {
		where = append(where, resourcePred)
	}
	sb.Where(where...)
	sb.GroupBy("trace_id")

	// gate/span existence checks are only needed when the WHERE was widened;
	// otherwise the mask alone enforces the gate
	var having []string
	if fp.hasSpanFilter {
		having = append(having, "countIf("+maskExpr+") > 0")
		having = append(having, "countIf("+fp.spanPred+") > 0")
	}
	if strings.TrimSpace(fp.havingExpr) != "" {
		// the rewriter matches raw key text, so map the trace. form alongside the bare name
		columnMap := make(map[string]string, len(orderableSet)*2)
		for a := range orderableSet {
			columnMap[a] = quoteAlias(a)
			columnMap[telemetrytypes.FieldContextTrace.StringValue()+"."+a] = quoteAlias(a)
		}
		hv, err := querybuilder.NewHavingExpressionRewriter().Rewrite(fp.havingExpr, columnMap)
		if err != nil {
			return "", nil, err
		}
		if hv != "" {
			// escape user text so a literal $ isn't read as an arg marker; the countIf
			// entries hold live $n markers and must stay unescaped
			having = append(having, sqlbuilder.Escape(hv))
		}
	}
	if len(having) > 0 {
		sb.Having(strings.Join(having, " AND "))
	}

	sb.OrderBy(orderClause(orders)...)
	sb.Limit(limit)
	if offset > 0 {
		sb.Offset(offset)
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("matched AS (%s)", sql), args, nil
}

// buildRankedCTE builds `ranked`: [start,end] bounds per matched trace from the
// trace-summary table.
func (b *scopedTraceStatementBuilder) buildRankedCTE(start, end uint64) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id", "min(start) AS t_start", "max(end) AS t_end")
	sb.From(fmt.Sprintf("%s.%s", tracestelemetryschema.DBName, tracestelemetryschema.TraceSummaryTableName))
	sb.Where(
		"trace_id GLOBAL IN (SELECT trace_id FROM matched)",
		"end >= fromUnixTimestamp64Nano("+sb.Var(start)+")",
		"start < fromUnixTimestamp64Nano("+sb.Var(end)+")",
	)
	sb.GroupBy("trace_id")
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("ranked AS (%s)", sql), args
}

// buildEnrichmentSelect builds the final SELECT: every per-trace column for the
// matched traces over their full extent, scanning only their buckets.
//
// Accepted discrepancy: matched ranks/paginates on window-clipped values while this
// pass ORDER BYs full-trace values, so a trace can sort differently than it ranked;
// page membership is unaffected (LIMIT/OFFSET runs only in matched).
func (b *scopedTraceStatementBuilder) buildEnrichmentSelect(sb *sqlbuilder.SelectBuilder, resolved []resolvedColumn, orders []listOrder) (string, []any) {
	selects := []string{"trace_id"}
	for _, rc := range resolved {
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(fmt.Sprintf("%s.%s", tracestelemetryschema.DBName, tracestelemetryschema.SpanIndexV3TableName))
	sb.Where(
		"ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)",
		"trace_id GLOBAL IN (SELECT trace_id FROM ranked)",
	)
	sb.GroupBy("trace_id")
	sb.OrderBy(orderClause(orders)...)
	return sb.BuildWithFlavor(sqlbuilder.ClickHouse)
}

// aggregateAliasSet is every trace-level column alias, used to classify filter keys;
// SpanLevel columns are filtered span-level, so skip them.
func (b *scopedTraceStatementBuilder) aggregateAliasSet() map[string]struct{} {
	set := make(map[string]struct{}, len(b.scope.Columns))
	for _, c := range b.scope.Columns {
		if !c.SpanLevel {
			set[c.Alias] = struct{}{}
		}
	}
	return set
}

// orderableAliasSet is the subset of aliases computable in the matched pass.
func orderableAliasSet(resolved []resolvedColumn) map[string]struct{} {
	set := make(map[string]struct{})
	for _, rc := range resolved {
		if rc.orderable {
			set[rc.alias] = struct{}{}
		}
	}
	return set
}

// neededMatchedAliases is the minimal alias set the matched pass must select: those
// in ORDER BY plus those in the aggregate HAVING.
func neededMatchedAliases(orders []listOrder, havingExpr string, orderableSet map[string]struct{}) map[string]struct{} {
	needed := make(map[string]struct{})
	for _, o := range orders {
		needed[o.alias] = struct{}{}
	}
	for _, name := range traceAggregateNames(havingExpr) {
		if _, ok := orderableSet[name]; ok {
			needed[name] = struct{}{}
		}
	}
	return needed
}

// traceAggregateNames extracts the aggregate names a trace-level HAVING references;
// only unspecified- and trace-context selectors name aggregates.
func traceAggregateNames(havingExpr string) []string {
	var names []string
	for _, sel := range querybuilder.QueryStringToKeysSelectors(havingExpr) {
		if sel.FieldContext == telemetrytypes.FieldContextUnspecified || sel.FieldContext == telemetrytypes.FieldContextTrace {
			names = append(names, sel.Name)
		}
	}
	return names
}

// validateAggregateFilter rejects a trace-level filter referencing an aggregate not
// computable in the matched pass.
func validateAggregateFilter(havingExpr string, orderableSet map[string]struct{}) error {
	if strings.TrimSpace(havingExpr) == "" {
		return nil
	}
	allowed := make([]string, 0, len(orderableSet))
	for a := range orderableSet {
		allowed = append(allowed, a)
	}
	sort.Strings(allowed)
	for _, name := range traceAggregateNames(havingExpr) {
		if _, ok := orderableSet[name]; !ok {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"aggregate %q cannot be used in the trace-list filter; filterable aggregates: %s", name, strings.Join(allowed, ", "))
		}
	}
	return nil
}

// orderClause renders the ORDER BY terms plus the trace_id tiebreak.
func orderClause(orders []listOrder) []string {
	out := make([]string, 0, len(orders)+1)
	for _, o := range orders {
		out = append(out, fmt.Sprintf("%s %s", quoteAlias(o.alias), o.direction))
	}
	return append(out, "trace_id DESC")
}

// quoteAlias backticks an alias containing characters special to the SQL builder.
func quoteAlias(alias string) string {
	if strings.ContainsAny(alias, ".$`") {
		return "`" + alias + "`"
	}
	return alias
}
