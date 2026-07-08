package telemetryai

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrUnsupportedRequestType = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type for source=ai")
)

// scopedTraceStatementBuilder builds a trace list scoped to a span-selection
// category. Topology is fixed; selection (BaseConditionProvider) and columns
// (ProjectionProvider) are pluggable, so a new category is a new pair of
// providers, not new topology.
type scopedTraceStatementBuilder struct {
	logger           *slog.Logger
	metadataStore    telemetrytypes.MetadataStore
	fm               qbtypes.FieldMapper
	cb               qbtypes.ConditionBuilder
	baseCond         BaseConditionProvider
	projection       ProjectionProvider
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*scopedTraceStatementBuilder)(nil)

// NewScopedTraceStatementBuilder wires the generic trace-list builder. The trace
// builder is reused for the span-list (raw) path.
func NewScopedTraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	baseCond BaseConditionProvider,
	projection ProjectionProvider,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
) *scopedTraceStatementBuilder {
	aiSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryai")
	return &scopedTraceStatementBuilder{
		logger:           aiSettings.Logger(),
		metadataStore:    metadataStore,
		fm:               fieldMapper,
		cb:               conditionBuilder,
		baseCond:         baseCond,
		projection:       projection,
		traceStmtBuilder: traceStmtBuilder,
	}
}

// NewAITraceStatementBuilder is the scoped builder with the gen_ai gate + AI projection.
func NewAITraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	baseCond BaseConditionProvider,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
) *scopedTraceStatementBuilder {
	return NewScopedTraceStatementBuilder(settings, metadataStore, fieldMapper, conditionBuilder, baseCond, NewGenAIProjectionProvider(), traceStmtBuilder)
}

func (b *scopedTraceStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	switch requestType {
	case qbtypes.RequestTypeTrace:
		return b.buildTraceListQuery(ctx, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), query, variables)
	case qbtypes.RequestTypeRaw:
		return b.buildDelegated(ctx, start, end, requestType, query, variables)
	default:
		return nil, ErrUnsupportedRequestType
	}
}

// buildDelegated ANDs the base gate into the user filter and delegates to the
// standard trace builder (the span-list / raw path).
func (b *scopedTraceStatementBuilder) buildDelegated(
	ctx context.Context,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	gate := b.baseCond.FilterExpression()
	expr := gate
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		expr = fmt.Sprintf("(%s) AND (%s)", gate, query.Filter.Expression)
	}

	// shallow copy; only Filter is replaced, caller's query untouched
	gated := query
	gated.Filter = &qbtypes.Filter{Expression: expr}

	return b.traceStmtBuilder.Build(ctx, start, end, requestType, gated, variables)
}

// buildTraceListQuery is the map for the whole file. It resolves the columns, then
// wires the CTE pipeline that was benchmarked (see ai-qb-handoff.md): a single
// windowed pass picks the top-N traces, then a bucket-pruned pass enriches only those.
// The helpers appear in this file in the order they run here.
//
//	RESOLVE (turn keys/columns into SQL, field-mapper aware)
//	  fetchKeys        → metadata for the keys we reference
//	  resolveMask      → the "is a gen_ai span" predicate  (OR of EXISTS)  [existsExpr]
//	  resolveColumns   → per-trace column SQL: intrinsics + resolved aggregates
//	  resolveListOrders→ which resolved columns to ORDER BY
//	  splitFilter      → span-level predicate + trace-level HAVING expression
//
//	BUILD (compose the CTE pipeline)
//	  matched   [buildMatchedCTE]   ONE windowed, mask-pruned GROUP BY trace_id pass over
//	     │                          the span index that applies the gate (+ span filter as
//	     │                          countIf existence), the trace-level HAVING, ORDER BY and
//	     │                          LIMIT/OFFSET in a single scan → top-N trace_ids + their
//	     │                          gen_ai-scoped ranking metrics. No giant gate id-set.
//	     ▼
//	  ranked    [buildRankedCTE]    per-trace [start,end] bounds for those N traces, read
//	     │                          from the small distributed_trace_summary table.
//	     ▼
//	  buckets   [buildBucketsCTE]   the exact ts_bucket_start values those N traces touch,
//	     │                          so the enrichment scan is primary-key pruned.
//	     ▼
//	  enrichment[buildEnrichmentSelect]  all per-trace columns for the N traces, scanning
//	                                     only their buckets (full trace, not window-clipped).
//
// Only gen_ai-scoped aggregates (tokens, llm activity, llm_call_count) are computable in
// the mask-pruned `matched` pass, so only those are orderable / usable in the aggregate
// filter. All-span columns (span_count, duration_nano, …) are output-only.
//
// start/end are nanoseconds.
func (b *scopedTraceStatementBuilder) buildTraceListQuery(
	ctx context.Context,
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

	// Resolve the gate keys + columns once; every attribute access below goes through
	// the field mapper (materialization/evolution aware), never a hardcoded map lookup.
	keys, err := b.fetchKeys(ctx)
	if err != nil {
		return nil, err
	}
	maskExpr, maskArgs, err := b.resolveMask(ctx, start, end, keys)
	if err != nil {
		return nil, err
	}
	resolved, err := b.resolveColumns(ctx, start, end, keys, maskExpr, maskArgs)
	if err != nil {
		return nil, err
	}
	orders, err := b.resolveListOrders(query.Order, resolved)
	if err != nil {
		return nil, err
	}
	orderableSet := orderableAliasSet(resolved)

	// Split the user filter: span-level predicate + trace-level HAVING expression.
	fp, err := b.splitFilter(ctx, query, b.aggregateAliasSet(), orderableSet, start, end, variables)
	if err != nil {
		return nil, err
	}

	// matched → ranked → buckets → enrichment
	matchedFrag, matchedArgs, err := b.buildMatchedCTE(start, end, startBucket, endBucket, resolved, orders, orderableSet, maskExpr, maskArgs, fp, limit, query.Offset)
	if err != nil {
		return nil, err
	}
	rankedFrag, rankedArgs := b.buildRankedCTE(start, end)
	bucketsFrag := buildBucketsCTE()
	mainSQL, mainArgs := b.buildEnrichmentSelect(resolved, orders)

	cteFragments := []string{matchedFrag, rankedFrag, bucketsFrag}
	cteArgs := [][]any{matchedArgs, rankedArgs, nil}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       fp.warnings,
		WarningsDocURL: fp.warningsURL,
	}, nil
}

// ---------------------------------------------------------------------------
// RESOLVE — turn keys/columns into field-mapper-aware SQL
// ---------------------------------------------------------------------------

func (b *scopedTraceStatementBuilder) fetchKeys(ctx context.Context) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	fields := b.resolverFieldKeys()
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(fields))
	for _, k := range fields {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:         k.Name,
			Signal:       k.Signal,
			FieldContext: k.FieldContext,
		})
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
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
	for _, k := range b.baseCond.FieldKeys() {
		add(k)
	}
	for _, c := range b.projection.Columns() {
		if c.Attr != nil {
			add(c.Attr.ValueKey)
			add(c.Attr.ExistsKey)
		}
	}
	return out
}

// resolveMask builds the per-span in-scope mask: OR of resolved EXISTS predicates
// over the base condition's field keys.
func (b *scopedTraceStatementBuilder) resolveMask(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	fieldKeys := b.baseCond.FieldKeys()
	parts := make([]string, 0, len(fieldKeys))
	var args []any
	for _, key := range fieldKeys {
		e, a, err := b.existsExpr(ctx, start, end, keys, key)
		if err != nil {
			return "", nil, err
		}
		parts = append(parts, e)
		args = append(args, a...)
	}
	return "(" + strings.Join(parts, " OR ") + ")", args, nil
}

// existsExpr resolves a field-mapper-aware EXISTS predicate for key (materialized
// column when present, else the map). Escaped once so it round-trips when embedded
// in an outer builder.
func (b *scopedTraceStatementBuilder) existsExpr(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, key *telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	resolvedKey := key
	cands := keys[key.Name]
	if len(cands) == 0 {
		cands = []*telemetrytypes.TelemetryFieldKey{key}
	} else {
		resolvedKey = cands[0]
	}
	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := b.cb.ConditionFor(ctx, start, end, resolvedKey, cands, qbtypes.FilterOperatorExists, nil, sb)
	if err != nil {
		return "", nil, err
	}
	sb.Where(conds[0])
	expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	expr = strings.TrimPrefix(expr, "WHERE ")
	return sqlbuilder.Escape(expr), args, nil
}

// resolvedColumn is a projection column whose attribute access has been resolved to
// SQL via the field mapper. expr is escaped once, ready to embed in an outer SELECT.
type resolvedColumn struct {
	alias     string
	expr      string
	args      []any
	orderable bool
}

// resolveColumns turns the projection's declarative columns into SQL, resolving all
// attribute access through the field mapper.
func (b *scopedTraceStatementBuilder) resolveColumns(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, maskExpr string, maskArgs []any) ([]resolvedColumn, error) {
	cols := b.projection.Columns()
	out := make([]resolvedColumn, 0, len(cols))
	for _, c := range cols {
		rc := resolvedColumn{alias: c.Alias, orderable: c.Orderable}

		if c.Attr == nil {
			// intrinsic: escape once (no-op unless it references a $$ column).
			rc.expr = sqlbuilder.Escape(c.Intrinsic)
			out = append(out, rc)
			continue
		}

		a := c.Attr
		switch {
		case a.Func == "count" && a.ExistsKey != nil:
			cond, cargs, err := b.existsExpr(ctx, start, end, keys, a.ExistsKey)
			if err != nil {
				return nil, err
			}
			rc.expr = fmt.Sprintf("countIf(%s)", cond)
			rc.args = cargs
		default:
			var vexpr string
			var vargs []any
			if a.ValueKey != nil {
				e, ar, err := querybuilder.CollisionHandledFinalExpr(ctx, start, end, a.ValueKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeFloat64, nil, false)
				if err != nil {
					return nil, err
				}
				vexpr, vargs = e, ar
			} else {
				vexpr = a.ValueExpr
			}
			if a.Scoped {
				rc.expr = fmt.Sprintf("%sIf(%s, %s)", a.Func, vexpr, maskExpr)
				rc.args = append(append([]any{}, vargs...), maskArgs...)
			} else {
				rc.expr = fmt.Sprintf("%s(%s)", a.Func, vexpr)
				rc.args = vargs
			}
		}
		out = append(out, rc)
	}
	return out, nil
}

// listOrder resolves a sort key to an aggregate-column alias + direction. Both the
// matched CTE and the enrichment select that alias, so both ORDER BY it.
type listOrder struct {
	alias     string
	direction string
}

// resolveListOrders maps order keys to the resolved orderable columns; non-orderable
// columns are rejected. Defaults to the projection's default order.
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
		return []listOrder{{alias: b.projection.DefaultOrderAlias(), direction: "DESC"}}, nil
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

// filterParts is the split of the user filter into a resolved span-level predicate
// (used both to widen the matched WHERE prune and as a countIf existence in HAVING)
// and a trace-level HAVING expression.
type filterParts struct {
	spanPred      string
	spanArgs      []any
	hasSpanFilter bool
	havingExpr    string
	warnings      []string
	warningsURL   string
}

// splitFilter partitions query.Filter into a span-level predicate and a trace-level
// HAVING expression; an explicit query.Having is ANDed onto the latter. The trace-level
// expression is validated against the aggregates computable in the matched pass.
func (b *scopedTraceStatementBuilder) splitFilter(ctx context.Context, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], classifySet, orderableSet map[string]struct{}, start, end uint64, variables map[string]qbtypes.VariableItem) (filterParts, error) {
	var fp filterParts
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, classifySet)
		if err != nil {
			return fp, err
		}
		fp.havingExpr = traceExpr
		if strings.TrimSpace(spanExpr) != "" {
			pred, args, warnings, url, err := b.resolveSpanPredicate(ctx, start, end, spanExpr, variables)
			if err != nil {
				return fp, err
			}
			fp.spanPred, fp.spanArgs, fp.hasSpanFilter = pred, args, true
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
	if err := validateAggregateFilter(fp.havingExpr, orderableSet); err != nil {
		return fp, err
	}
	return fp, nil
}

// resolveSpanPredicate resolves a span-level filter expression to a bare boolean SQL
// predicate (escaped) + args via the field mapper.
func (b *scopedTraceStatementBuilder) resolveSpanPredicate(ctx context.Context, start, end uint64, expr string, variables map[string]qbtypes.VariableItem) (string, []any, []string, string, error) {
	selectors := querybuilder.QueryStringToKeysSelectors(expr)
	for i := range selectors {
		selectors[i].Signal = telemetrytypes.SignalTraces
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return "", nil, nil, "", err
	}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           b.logger,
		FieldMapper:      b.fm,
		ConditionBuilder: b.cb,
		FieldKeys:        keys,
		Variables:        variables,
		StartNs:          start,
		EndNs:            end,
	})
	if err != nil {
		return "", nil, nil, "", err
	}
	if prepared.IsEmpty() {
		return "", nil, nil, "", nil
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("1")
	sb.AddWhereClause(prepared.WhereClause)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	pred := sql[strings.Index(sql, "WHERE ")+len("WHERE "):]
	return sqlbuilder.Escape(pred), args, prepared.Warnings, prepared.WarningsDocURL, nil
}

// ---------------------------------------------------------------------------
// BUILD — compose the CTE pipeline (matched → ranked → buckets → enrichment)
// ---------------------------------------------------------------------------

// buildMatchedCTE builds `matched`: a single windowed GROUP BY trace_id pass that
// picks the top-N traces. The WHERE prunes to gen_ai spans (widened with the span-level
// predicate when present); HAVING enforces the gate (countIf(mask) > 0), the span-level
// filter as an existence check, and the trace-level aggregate filter; ORDER BY + LIMIT
// select the winners. Only gen_ai-scoped aggregates are computable here, and only those
// actually referenced by ORDER BY / the aggregate filter are selected (the rest are
// computed once, later, in the enrichment scan) — this keeps the hot ranking pass lean.
func (b *scopedTraceStatementBuilder) buildMatchedCTE(start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder, orderableSet map[string]struct{}, maskExpr string, maskArgs []any, fp filterParts, limit, offset int) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// SELECT trace_id + only the aggregates ORDER BY / HAVING reference (as aliases).
	needed := neededMatchedAliases(orders, fp.havingExpr, orderableSet)
	selects := []string{"trace_id"}
	for _, rc := range resolved {
		if _, ok := needed[rc.alias]; !ok {
			continue
		}
		selects = append(selects, embedExpr(sb, rc.expr, rc.args)+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(spanTable())

	// WHERE: window + coarse prune to gen_ai spans (widened so span-filter spans are
	// visible for the countIf existence check below).
	win := windowWhere(sb, start, end, startBucket, endBucket)
	prune := "(" + embedExpr(sb, maskExpr, maskArgs)
	if fp.hasSpanFilter {
		prune += " OR " + embedExpr(sb, fp.spanPred, fp.spanArgs)
	}
	prune += ")"
	sb.Where(append(win, prune)...)
	sb.GroupBy("trace_id")

	// HAVING: the gate + span-existence checks are only needed once the WHERE has been
	// widened by a span filter; otherwise WHERE = mask already enforces the gate.
	var having []string
	if fp.hasSpanFilter {
		having = append(having, "countIf("+embedExpr(sb, maskExpr, maskArgs)+") > 0")
		having = append(having, "countIf("+embedExpr(sb, fp.spanPred, fp.spanArgs)+") > 0")
	}
	if strings.TrimSpace(fp.havingExpr) != "" {
		hv, err := b.buildHaving(fp.havingExpr, orderableSet)
		if err != nil {
			return "", nil, err
		}
		if hv != "" {
			having = append(having, hv)
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

// buildRankedCTE builds `ranked`: per-trace [start,end] bounds for the matched traces,
// read from the small trace-summary table (used to derive the bucket prune).
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

// buildBucketsCTE builds `buckets`: the exact ts_bucket_start values the matched traces
// span, so the enrichment scan is pruned to those primary-key buckets. No args.
func buildBucketsCTE() string {
	adj := querybuilder.BucketAdjustment // 30-min bucket width in seconds
	return fmt.Sprintf("buckets AS (SELECT DISTINCT b AS ts_bucket FROM ranked "+
		"ARRAY JOIN range("+
		"toUInt64(intDiv(toUnixTimestamp(t_start), %d) * %d - %d), "+
		"toUInt64(intDiv(toUnixTimestamp(t_end), %d) * %d + %d), "+
		"%d) AS b)", adj, adj, adj, adj, adj, adj, adj)
}

// buildEnrichmentSelect builds the final SELECT: all per-trace columns for the matched
// traces, scanning only their buckets (full trace, not window-clipped). SELECT-expr
// args lead; the WHERE / ORDER BY carry none.
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

// buildHaving rewrites a trace-level HAVING expression against the aggregate column
// aliases computable in the matched pass; bare, trace., and tracefield. forms all map
// to the selected alias.
func (b *scopedTraceStatementBuilder) buildHaving(havingExpr string, orderableSet map[string]struct{}) (string, error) {
	columnMap := make(map[string]string, len(orderableSet)*3)
	for a := range orderableSet {
		columnMap[a] = quoteAlias(a)
		columnMap["trace."+a] = quoteAlias(a)
		columnMap["tracefield."+a] = quoteAlias(a)
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

// aggregateAliasSet is the set of all trace-level (computed) column aliases, used to
// classify which filter keys are trace-level vs span-level.
func (b *scopedTraceStatementBuilder) aggregateAliasSet() map[string]struct{} {
	set := make(map[string]struct{}, len(b.projection.AggregateAliases()))
	for _, a := range b.projection.AggregateAliases() {
		set[a] = struct{}{}
	}
	return set
}

// orderableAliasSet is the subset of aggregate aliases computable in the matched pass
// (gen_ai-scoped): the only ones usable for ORDER BY and the aggregate filter.
func orderableAliasSet(resolved []resolvedColumn) map[string]struct{} {
	set := make(map[string]struct{})
	for _, rc := range resolved {
		if rc.orderable {
			set[rc.alias] = struct{}{}
		}
	}
	return set
}

// neededMatchedAliases is the minimal set of aggregate aliases the matched pass must
// select: those referenced by ORDER BY plus those referenced in the aggregate HAVING
// (bare / trace. / tracefield. forms). Anything else is left to the enrichment scan.
func neededMatchedAliases(orders []listOrder, havingExpr string, orderableSet map[string]struct{}) map[string]struct{} {
	needed := make(map[string]struct{})
	for _, o := range orders {
		needed[o.alias] = struct{}{}
	}
	for _, sel := range querybuilder.QueryStringToKeysSelectors(havingExpr) {
		name := strings.TrimPrefix(strings.TrimPrefix(sel.Name, "trace."), "tracefield.")
		if _, ok := orderableSet[name]; ok {
			needed[name] = struct{}{}
		}
	}
	return needed
}

// validateAggregateFilter rejects a trace-level filter that references an aggregate not
// computable in the matched pass (e.g. span_count, duration_nano), with a clear message.
func validateAggregateFilter(havingExpr string, orderableSet map[string]struct{}) error {
	if strings.TrimSpace(havingExpr) == "" {
		return nil
	}
	allowed := make([]string, 0, len(orderableSet))
	for a := range orderableSet {
		allowed = append(allowed, a)
	}
	for _, sel := range querybuilder.QueryStringToKeysSelectors(havingExpr) {
		name := strings.TrimPrefix(strings.TrimPrefix(sel.Name, "trace."), "tracefield.")
		if _, ok := orderableSet[name]; !ok {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"aggregate %q cannot be used in an AI trace-list filter; filterable aggregates: %s", name, strings.Join(allowed, ", "))
		}
	}
	return nil
}

// embedExpr inlines a resolved (escaped) expr carrying `?` placeholders into sb by
// replacing each `?` with a builder Var, so go-sqlbuilder tracks the args in appearance
// order and un-escapes the expr at Build time.
func embedExpr(sb *sqlbuilder.SelectBuilder, expr string, args []any) string {
	var out strings.Builder
	ai := 0
	for i := 0; i < len(expr); i++ {
		if expr[i] == '?' && ai < len(args) {
			out.WriteString(sb.Var(args[ai]))
			ai++
			continue
		}
		out.WriteByte(expr[i])
	}
	return out.String()
}

// windowWhere binds the shared time-window predicates to sb and returns them, so a
// caller can add its own predicate in the same Where call.
func windowWhere(sb *sqlbuilder.SelectBuilder, start, end, startBucket, endBucket uint64) []string {
	return []string{
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	}
}

// orderClause renders the ORDER BY terms (by column alias) + the trace_id tiebreak.
func orderClause(orders []listOrder) []string {
	out := make([]string, 0, len(orders)+1)
	for _, o := range orders {
		out = append(out, fmt.Sprintf("%s %s", quoteAlias(o.alias), o.direction))
	}
	return append(out, "trace_id DESC")
}

// selectAllColumns renders `expr AS alias` for every resolved column and returns their
// field-mapper args in select order.
func selectAllColumns(resolved []resolvedColumn) ([]string, []any) {
	selects := []string{"trace_id"}
	var args []any
	for _, rc := range resolved {
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
		args = append(args, rc.args...)
	}
	return selects, args
}

// quoteAlias backticks an alias that carries characters special to the SQL builder.
func quoteAlias(alias string) string {
	if strings.ContainsAny(alias, ".$`") {
		return "`" + alias + "`"
	}
	return alias
}
