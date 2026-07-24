package telemetryscopedtraces

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
	"github.com/SigNoz/signoz/pkg/telemetryresourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
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
// (e.g. gen_ai spans). The query shape is fixed; the TraceScope decides which spans
// are in scope and which per-trace columns to compute, so a new category only needs
// a new scope.
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

// NewScopedTraceStatementBuilder wires the generic trace-list builder. The field
// mapper / condition builder are built here, not injected — the list always scans the
// telemetrytraces span index. traceStmtBuilder (the delegate for the span-list path)
// is injected because the provider already has the canonical instance.
func NewScopedTraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	scope TraceScope,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	fl flagger.Flagger,
) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	scopedSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryscopedtraces")

	fm := telemetrytraces.NewFieldMapper()
	cb := telemetrytraces.NewConditionBuilder(fm)

	// Same resource-fingerprint prune as the standard trace builder — the list scans
	// the same span index.
	resourceFilterStmtBuilder := telemetryresourcefilter.New[qbtypes.TraceAggregation](
		settings,
		telemetrytraces.DBName,
		telemetrytraces.TracesResourceV3TableName,
		telemetrytypes.SignalTraces,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		nil,
		fl,
	)

	return &scopedTraceStatementBuilder{
		logger:                    scopedSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fm,
		cb:                        cb,
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

// buildTraceListQuery wires the CTE pipeline: one windowed pass picks the top-N
// traces, then a bucket-pruned pass enriches only those.
// Helpers appear in this file in the order they run. start/end are nanoseconds.
//
//	RESOLVE (keys/columns → SQL via the field mapper)
//	  fetchKeys         metadata for every key we reference
//	  resolveMask       the "span is in scope" predicate (OR of EXISTS)
//	  resolveColumns    per-trace column SQL
//	  resolveListOrders which columns to ORDER BY
//	  splitFilter       span-level predicate + trace-level HAVING
//
//	BUILD
//	  matched    one windowed, mask-pruned GROUP BY trace_id scan fusing gate + span
//	     │       filter + HAVING + ORDER BY + LIMIT/OFFSET → the top-N trace_ids
//	     ▼
//	  ranked     [start,end] bounds of those traces, from the small summary table
//	     ▼
//	  buckets    the ts_bucket_start values they touch, to prune the next scan
//	     ▼
//	  enrichment every per-trace column for those traces over their full extent
//	             (not window-clipped), scanning only their buckets
//
// Only Orderable columns are computable in the mask-pruned matched pass, so only they
// can be ordered or filtered on; all-span columns (span_count, …) are output-only.
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

	// Resolve keys and columns once; all attribute access goes through the field mapper.
	keys, err := b.fetchKeys(ctx, orgID)
	if err != nil {
		return nil, err
	}
	mapper := newFieldMapper(b.fm, b.cb, keys)
	maskExpr, maskArgs, err := b.resolveMask(ctx, orgID, start, end, mapper)
	if err != nil {
		return nil, err
	}
	mapper.maskExpr, mapper.maskArgs = maskExpr, maskArgs
	resolved, err := b.resolveColumns(ctx, orgID, start, end, mapper)
	if err != nil {
		return nil, err
	}
	orders, err := b.resolveListOrders(query.Order, resolved)
	if err != nil {
		return nil, err
	}
	orderableSet := orderableAliasSet(resolved)

	// If the filter references resource attributes, add a __resource_filter CTE and
	// narrow the matched scan by resource_fingerprint; the span predicate drops those
	// keys so they aren't applied twice.
	resourceFrag, resourceArgs, resourcePred, err := b.maybeAttachResourceFilter(ctx, orgID, query, start, end, variables)
	if err != nil {
		return nil, err
	}

	// Split the user filter: span-level predicate + trace-level HAVING expression.
	fp, err := b.splitFilter(ctx, orgID, query, b.aggregateAliasSet(), orderableSet, start, end, variables)
	if err != nil {
		return nil, err
	}

	// matched → ranked → buckets → enrichment
	matchedFrag, matchedArgs, err := b.buildMatchedCTE(start, end, startBucket, endBucket, resolved, orders, orderableSet, maskExpr, maskArgs, fp, resourcePred, limit, query.Offset)
	if err != nil {
		return nil, err
	}
	rankedFrag, rankedArgs := b.buildRankedCTE(start, end)
	bucketsFrag := buildBucketsCTE()
	mainSQL, mainArgs := b.buildEnrichmentSelect(resolved, orders)

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

// maybeAttachResourceFilter builds the __resource_filter CTE (fingerprints matching
// the filter's resource conditions) and the predicate narrowing the span scan by
// resource_fingerprint; with no resource conditions it returns empty fragments.
//
// Unlike the standard trace builder there is deliberately no skip-fingerprint
// fallback: falling back would leave the resource conditions inside the OR'd
// span-filter bucket, which changes trace membership (any span from the resource +
// any gen_ai span, instead of a gen_ai span from the resource). Resource conditions
// always scope the whole matched scan.
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

// ---------------------------------------------------------------------------
// RESOLVE — turn keys/columns into field-mapper-aware SQL
// ---------------------------------------------------------------------------

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

// resolveMask builds the per-span in-scope mask: OR of resolved EXISTS predicates
// over the base condition's field keys.
func (b *scopedTraceStatementBuilder) resolveMask(ctx context.Context, orgID valuer.UUID, start, end uint64, mapper *fieldMapper) (string, []any, error) {
	fieldKeys := b.scope.FieldKeys
	parts := make([]string, 0, len(fieldKeys))
	var args []any
	for _, key := range fieldKeys {
		e, a, err := mapper.ExistsFor(ctx, orgID, start, end, key)
		if err != nil {
			return "", nil, err
		}
		parts = append(parts, e)
		args = append(args, a...)
	}
	return "(" + strings.Join(parts, " OR ") + ")", args, nil
}

// resolvedColumn is a column resolved to SQL via the field mapper; expr is escaped
// once, ready to embed in an outer SELECT.
type resolvedColumn struct {
	alias     string
	expr      string
	args      []any
	orderable bool
}

// resolveColumns turns the declarative columns into SQL through the resolver, so all
// attribute access goes through the field mapper / condition builder.
func (b *scopedTraceStatementBuilder) resolveColumns(ctx context.Context, orgID valuer.UUID, start, end uint64, mapper *fieldMapper) ([]resolvedColumn, error) {
	cols := b.scope.Columns
	out := make([]resolvedColumn, 0, len(cols))
	for _, c := range cols {
		expr, args, err := c.Expr.render(ctx, orgID, start, end, mapper)
		if err != nil {
			return nil, err
		}
		out = append(out, resolvedColumn{alias: c.Alias, expr: expr, args: args, orderable: c.Orderable})
	}
	return out, nil
}

// listOrder is a sort key resolved to a column alias + direction; both the matched
// CTE and the enrichment ORDER BY it.
type listOrder struct {
	alias     string
	direction string
}

// resolveListOrders maps order keys to the resolved orderable columns; non-orderable
// columns are rejected. Defaults to the column provider's default order.
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

// filterParts is the user filter split into a span-level predicate (widens the
// matched WHERE prune and becomes a countIf existence check in HAVING) and a
// trace-level HAVING expression.
type filterParts struct {
	spanPred      string
	spanArgs      []any
	hasSpanFilter bool
	havingExpr    string
	warnings      []string
	warningsURL   string
}

// splitFilter splits query.Filter into a span-level predicate and a trace-level
// HAVING expression (an explicit query.Having is ANDed onto the latter), then
// validates the trace-level part against the matched-pass aggregates.
func (b *scopedTraceStatementBuilder) splitFilter(ctx context.Context, orgID valuer.UUID, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], classifySet, orderableSet map[string]struct{}, start, end uint64, variables map[string]qbtypes.VariableItem) (filterParts, error) {
	var fp filterParts
	// The legacy tracefield. spelling parses identically to trace.; only the
	// user-facing form is supported here.
	if (query.Filter != nil && strings.Contains(query.Filter.Expression, "tracefield.")) ||
		(query.Having != nil && strings.Contains(query.Having.Expression, "tracefield.")) {
		return fp, errors.NewInvalidInputf(errors.CodeInvalidInput, "\"tracefield.\" is not supported; use the \"trace.\" prefix")
	}
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, classifySet)
		if err != nil {
			return fp, err
		}
		fp.havingExpr = traceExpr
		if strings.TrimSpace(spanExpr) != "" {
			pred, args, warnings, url, err := b.resolveSpanPredicate(ctx, orgID, start, end, spanExpr, variables)
			if err != nil {
				return fp, err
			}
			// pred is empty when the span-level keys were all resource attributes
			// already handled by the __resource_filter CTE.
			if strings.TrimSpace(pred) != "" {
				fp.spanPred, fp.spanArgs, fp.hasSpanFilter = pred, args, true
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
	// The span predicate binds variables via PrepareWhereClause; the HAVING is a plain
	// text rewrite, so substitute variables here (list/IN quoting, __all__ drops the
	// condition) before validating.
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
// SQL predicate + args via the field mapper.
func (b *scopedTraceStatementBuilder) resolveSpanPredicate(ctx context.Context, orgID valuer.UUID, start, end uint64, expr string, variables map[string]qbtypes.VariableItem) (string, []any, []string, string, error) {
	selectors := querybuilder.QueryStringToKeysSelectors(expr)
	for i := range selectors {
		selectors[i].Signal = telemetrytypes.SignalTraces
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, selectors)
	if err != nil {
		return "", nil, nil, "", err
	}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           b.logger,
		FieldMapper:      b.fm,
		ConditionBuilder: b.cb,
		FieldKeys:        keys,
		// resource conditions are always handled by the __resource_filter CTE
		SkipResourceFilter: true,
		Variables:          variables,
		StartNs:            start,
		EndNs:              end,
	})
	if err != nil {
		return "", nil, nil, "", err
	}
	if prepared.IsEmpty() {
		return "", nil, nil, "", nil
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.AddWhereClause(prepared.WhereClause)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	pred := sql[strings.Index(sql, "WHERE ")+len("WHERE "):]
	return sqlbuilder.Escape(pred), args, prepared.Warnings, prepared.WarningsDocURL, nil
}

// buildMatchedCTE builds `matched`: the single windowed GROUP BY trace_id scan that
// fuses gate + span filter + HAVING + ORDER BY + LIMIT/OFFSET, selecting only the
// aliases the ORDER BY / HAVING reference.
func (b *scopedTraceStatementBuilder) buildMatchedCTE(start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder, orderableSet map[string]struct{}, maskExpr string, maskArgs []any, fp filterParts, resourcePred string, limit, offset int) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// SELECT trace_id + only the aggregates ORDER BY / HAVING reference (as aliases).
	needed := neededMatchedAliases(orders, fp.havingExpr, orderableSet)
	selects := []string{"trace_id"}
	for _, rc := range resolved {
		if _, ok := needed[rc.alias]; !ok {
			continue
		}
		colExpr, err := embedExpr(sb, rc.expr, rc.args)
		if err != nil {
			return "", nil, err
		}
		selects = append(selects, colExpr+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(spanTable())

	// WHERE: window + prune to in-scope spans, widened by the span filter so its
	// spans survive for the countIf existence check below.
	win := windowWhere(sb, start, end, startBucket, endBucket)
	mask, err := embedExpr(sb, maskExpr, maskArgs)
	if err != nil {
		return "", nil, err
	}
	prune := "(" + mask
	if fp.hasSpanFilter {
		spanPred, err := embedExpr(sb, fp.spanPred, fp.spanArgs)
		if err != nil {
			return "", nil, err
		}
		prune += " OR " + spanPred
	}
	prune += ")"
	where := append(win, prune)
	if resourcePred != "" {
		where = append(where, resourcePred)
	}
	sb.Where(where...)
	sb.GroupBy("trace_id")

	// HAVING: the gate/span existence checks are only needed when the WHERE was
	// widened by a span filter; otherwise the mask alone already enforces the gate.
	var having []string
	if fp.hasSpanFilter {
		havingMask, err := embedExpr(sb, maskExpr, maskArgs)
		if err != nil {
			return "", nil, err
		}
		havingPred, err := embedExpr(sb, fp.spanPred, fp.spanArgs)
		if err != nil {
			return "", nil, err
		}
		having = append(having, "countIf("+havingMask+") > 0")
		having = append(having, "countIf("+havingPred+") > 0")
	}
	if strings.TrimSpace(fp.havingExpr) != "" {
		hv, err := b.buildHaving(fp.havingExpr, orderableSet)
		if err != nil {
			return "", nil, err
		}
		if hv != "" {
			// hv carries user text with values inlined by the rewriter; escape it so a
			// literal $ can't be read as an interpolation marker at Build time. The
			// countIf entries above hold live placeholders and must stay unescaped.
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

// buildRankedCTE builds `ranked`: [start,end] bounds per matched trace, read from the
// small trace-summary table.
func (b *scopedTraceStatementBuilder) buildRankedCTE(start, end uint64) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id", "min(start) AS t_start", "max(end) AS t_end")
	sb.From(summaryTable())
	sb.Where(
		"trace_id GLOBAL IN (SELECT trace_id FROM matched)",
		"end >= fromUnixTimestamp64Nano("+sb.Var(start)+")",
		"start < fromUnixTimestamp64Nano("+sb.Var(end)+")",
	)
	sb.GroupBy("trace_id")
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("ranked AS (%s)", sql), args
}

// buildBucketsCTE builds `buckets`: the ts_bucket_start values the matched traces
// span, so the enrichment scan is primary-key pruned. No args.
func buildBucketsCTE() string {
	adj := querybuilder.BucketAdjustment // 30-min bucket width in seconds
	return fmt.Sprintf("buckets AS (SELECT DISTINCT b AS ts_bucket FROM ranked "+
		"ARRAY JOIN range("+
		"toUInt64(intDiv(toUnixTimestamp(t_start), %d) * %d - %d), "+
		"toUInt64(intDiv(toUnixTimestamp(t_end), %d) * %d + %d), "+
		"%d) AS b)", adj, adj, adj, adj, adj, adj, adj)
}

// buildEnrichmentSelect builds the final SELECT: every per-trace column for the
// matched traces over their full extent, scanning only their buckets.
//
// Accepted discrepancy: matched ranks/paginates on window-clipped values (and, with a
// resource filter, only over fingerprint-matching spans), while this pass recomputes
// and ORDER BYs full-trace values — so a trace with activity outside the window or
// resource can sort differently than it ranked. Page membership is unaffected
// (LIMIT/OFFSET runs only in matched); rows still sort by the values the user sees.
// Ordering by matched's values instead would re-run the matched scan (ClickHouse
// re-executes a CTE per reference) without fixing the visible cross-page artifact.
func (b *scopedTraceStatementBuilder) buildEnrichmentSelect(resolved []resolvedColumn, orders []listOrder) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	selects, selectArgs := selectAllColumns(resolved)
	sb.Select(selects...)
	sb.From(spanTable())
	sb.Where(
		"ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)",
		"trace_id GLOBAL IN (SELECT trace_id FROM ranked)",
	)
	sb.GroupBy("trace_id")
	sb.OrderBy(orderClause(orders)...)
	sql, builtArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, append(append([]any{}, selectArgs...), builtArgs...)
}

// buildHaving rewrites a trace-level HAVING expression to the matched-pass column
// aliases. The rewriter matches raw key text, so the trace. form is mapped alongside
// the bare name (the legacy tracefield. spelling is rejected upfront in splitFilter).
func (b *scopedTraceStatementBuilder) buildHaving(havingExpr string, orderableSet map[string]struct{}) (string, error) {
	columnMap := make(map[string]string, len(orderableSet)*2)
	for a := range orderableSet {
		columnMap[a] = quoteAlias(a)
		columnMap[telemetrytypes.FieldContextTrace.StringValue()+"."+a] = quoteAlias(a)
	}
	return querybuilder.NewHavingExpressionRewriter().Rewrite(havingExpr, columnMap)
}

// ---------------------------------------------------------------------------
// Small shared SQL-builder utilities
// ---------------------------------------------------------------------------

// spanTable is the fully-qualified span index table.
func spanTable() string {
	return fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
}

// summaryTable is the fully-qualified trace-summary table.
func summaryTable() string {
	return fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.TraceSummaryTableName)
}

// aggregateAliasSet is every trace-level column alias, used to classify filter keys
// as trace-level vs span-level. Derived from the scope's columns so a new column
// can't be forgotten; SpanLevel columns are filtered span-level, so skip them.
func (b *scopedTraceStatementBuilder) aggregateAliasSet() map[string]struct{} {
	set := make(map[string]struct{}, len(b.scope.Columns))
	for _, c := range b.scope.Columns {
		if !c.SpanLevel {
			set[c.Alias] = struct{}{}
		}
	}
	return set
}

// orderableAliasSet is the subset of aliases computable in the matched pass — the
// only ones usable in ORDER BY and the aggregate filter.
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
// in ORDER BY plus those in the aggregate HAVING. Everything else is left to the
// enrichment scan.
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

// traceAggregateNames extracts the aggregate names a trace-level HAVING expression
// references. QueryStringToKeysSelectors emits an extra attribute-context fallback
// selector for context-prefixed keys (`trace.x` → attribute "trace.x"); only the
// unspecified- and trace-context selectors name aggregates.
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
// computable in the matched pass (e.g. span_count, trace_duration_nano).
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

// embedExpr inlines a resolved expr into sb, replacing each `?` placeholder with a
// builder Var so the args are tracked in appearance order. Resolved exprs carry
// values only as bound args, so every `?` is a placeholder; a count mismatch would
// silently shift args into the wrong slots — error out instead.
func embedExpr(sb *sqlbuilder.SelectBuilder, expr string, args []any) (string, error) {
	if n := strings.Count(expr, "?"); n != len(args) {
		return "", errors.NewInternalf(errors.CodeInternal,
			"scoped trace builder: %d placeholders != %d args embedding %q", n, len(args), expr)
	}
	var out strings.Builder
	ai := 0
	for i := 0; i < len(expr); i++ {
		if expr[i] == '?' {
			out.WriteString(sb.Var(args[ai]))
			ai++
			continue
		}
		out.WriteByte(expr[i])
	}
	return out.String(), nil
}

// windowWhere binds the time-window predicates to sb and returns them so the caller
// can add its own predicates in the same Where call.
func windowWhere(sb *sqlbuilder.SelectBuilder, start, end, startBucket, endBucket uint64) []string {
	return []string{
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	}
}

// orderClause renders the ORDER BY terms plus the trace_id tiebreak.
func orderClause(orders []listOrder) []string {
	out := make([]string, 0, len(orders)+1)
	for _, o := range orders {
		out = append(out, fmt.Sprintf("%s %s", quoteAlias(o.alias), o.direction))
	}
	return append(out, "trace_id DESC")
}

// selectAllColumns renders `expr AS alias` for every resolved column, args in select
// order.
func selectAllColumns(resolved []resolvedColumn) ([]string, []any) {
	selects := []string{"trace_id"}
	var args []any
	for _, rc := range resolved {
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
		args = append(args, rc.args...)
	}
	return selects, args
}

// quoteAlias backticks an alias containing characters special to the SQL builder.
func quoteAlias(alias string) string {
	if strings.ContainsAny(alias, ".$`") {
		return "`" + alias + "`"
	}
	return alias
}
