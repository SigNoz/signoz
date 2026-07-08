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
// builder is reused for scalar/timeseries panels (single-pass over gated spans).
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
	keys, err := b.gateKeys(ctx)
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
	havingSet := b.havingAliasSet()

	var (
		cteFragments []string
		cteArgs      [][]any
	)

	// __ai_gate_ids: trace_ids with >=1 in-scope span.
	gateFrag, gateArgs, err := b.buildGateCTE(ctx, start, end, startBucket, endBucket, keys, variables)
	if err != nil {
		return nil, err
	}
	cteFragments = append(cteFragments, gateFrag)
	cteArgs = append(cteArgs, gateArgs)

	// Split the user filter: span-level predicates -> __ai_filter_ids (WHERE over
	// spans); trace-level predicates -> HAVING on the ranking CTE.
	fp, err := b.splitFilter(ctx, query, havingSet, start, end, startBucket, endBucket, variables)
	if err != nil {
		return nil, err
	}
	if fp.filterCTE != "" {
		cteFragments = append(cteFragments, fp.filterCTE)
		cteArgs = append(cteArgs, fp.filterArgs)
	}

	// __ai_trace_ids: qualifying traces ranked, HAVING-filtered, paginated.
	rankFrag, rankArgs, err := b.buildRankingCTE(start, end, startBucket, endBucket, resolved, orders, havingSet, fp.havingExpr, fp.hasSpanFilter, limit, query.Offset)
	if err != nil {
		return nil, err
	}
	cteFragments = append(cteFragments, rankFrag)
	cteArgs = append(cteArgs, rankArgs)

	// enrichment: all per-trace columns for the selected trace_ids, same window.
	mainSQL, mainArgs := b.buildEnrichmentSelect(start, end, startBucket, endBucket, resolved, orders)

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       fp.warnings,
		WarningsDocURL: fp.warningsURL,
	}, nil
}

// havingAliasSet is the set of aggregate (trace-level / HAVING) column aliases.
func (b *scopedTraceStatementBuilder) havingAliasSet() map[string]struct{} {
	set := make(map[string]struct{}, len(b.projection.HavingAliases()))
	for _, a := range b.projection.HavingAliases() {
		set[a] = struct{}{}
	}
	return set
}

// spanTable is the fully-qualified span index table.
func spanTable() string {
	return fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
}

// windowWhere binds the shared time-window predicates to sb and returns them, so a
// caller can add its own trace_id IN (...) predicate in the same Where call.
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

// selectResolvedColumns renders `expr AS alias` for the resolved columns (all, or
// aggregatesOnly) and returns their field-mapper args in select order.
func selectResolvedColumns(resolved []resolvedColumn, aggregatesOnly bool, havingSet map[string]struct{}) ([]string, []any) {
	selects := []string{"trace_id"}
	var args []any
	for _, rc := range resolved {
		if aggregatesOnly {
			if _, ok := havingSet[rc.alias]; !ok {
				continue
			}
		}
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
		args = append(args, rc.args...)
	}
	return selects, args
}

// buildGateCTE builds __ai_gate_ids: distinct (GROUP BY) trace_ids with >=1 in-scope
// span, resolved via the visitor (materialization aware).
func (b *scopedTraceStatementBuilder) buildGateCTE(ctx context.Context, start, end, startBucket, endBucket uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, variables map[string]qbtypes.VariableItem) (string, []any, error) {
	prepared, err := querybuilder.PrepareWhereClause(b.baseCond.FilterExpression(), querybuilder.FilterExprVisitorOpts{
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
		return "", nil, err
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id")
	sb.From(spanTable())
	if !prepared.IsEmpty() {
		sb.AddWhereClause(prepared.WhereClause)
	}
	sb.Where(windowWhere(sb, start, end, startBucket, endBucket)...)
	sb.GroupBy("trace_id")
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__ai_gate_ids AS (%s)", sql), args, nil
}

// filterParts is the split of the user filter into a span-level CTE and a trace-level
// HAVING expression.
type filterParts struct {
	filterCTE     string
	filterArgs    []any
	havingExpr    string
	hasSpanFilter bool
	warnings      []string
	warningsURL   string
}

// splitFilter partitions query.Filter into __ai_filter_ids (span-level WHERE) and a
// trace-level HAVING expression; an explicit query.Having is ANDed onto the latter.
func (b *scopedTraceStatementBuilder) splitFilter(ctx context.Context, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], havingSet map[string]struct{}, start, end, startBucket, endBucket uint64, variables map[string]qbtypes.VariableItem) (filterParts, error) {
	var fp filterParts
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, havingSet)
		if err != nil {
			return fp, err
		}
		fp.havingExpr = traceExpr
		if strings.TrimSpace(spanExpr) != "" {
			frag, args, warnings, warningsURL, err := b.buildFilterIDsCTE(ctx, start, end, startBucket, endBucket, spanExpr, variables)
			if err != nil {
				return fp, err
			}
			fp.filterCTE, fp.filterArgs, fp.warnings, fp.warningsURL, fp.hasSpanFilter = frag, args, warnings, warningsURL, true
		}
	}
	if query.Having != nil && strings.TrimSpace(query.Having.Expression) != "" {
		if fp.havingExpr != "" {
			fp.havingExpr = fmt.Sprintf("(%s) AND (%s)", fp.havingExpr, query.Having.Expression)
		} else {
			fp.havingExpr = query.Having.Expression
		}
	}
	return fp, nil
}

// buildRankingCTE builds __ai_trace_ids: aggregate columns selected as aliases (so
// ORDER BY / HAVING reference them), grouped by trace_id, HAVING-filtered, ranked, and
// paginated. Field-mapper (SELECT) args lead the WHERE/LIMIT args.
func (b *scopedTraceStatementBuilder) buildRankingCTE(start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder, havingSet map[string]struct{}, havingExpr string, hasSpanFilter bool, limit, offset int) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()
	selects, selectArgs := selectResolvedColumns(resolved, true, havingSet)
	sb.Select(selects...)
	sb.From(spanTable())

	where := append(windowWhere(sb, start, end, startBucket, endBucket), "trace_id GLOBAL IN (SELECT trace_id FROM __ai_gate_ids)")
	if hasSpanFilter {
		where = append(where, "trace_id GLOBAL IN (SELECT trace_id FROM __ai_filter_ids)")
	}
	sb.Where(where...)
	sb.GroupBy("trace_id")

	if strings.TrimSpace(havingExpr) != "" {
		havingSQL, err := b.buildHaving(havingExpr, havingSet)
		if err != nil {
			return "", nil, err
		}
		if havingSQL != "" {
			sb.Having(havingSQL)
		}
	}

	sb.OrderBy(orderClause(orders)...)
	sb.Limit(limit)
	if offset > 0 {
		sb.Offset(offset)
	}

	sql, builtArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__ai_trace_ids AS (%s)", sql), append(append([]any{}, selectArgs...), builtArgs...), nil
}

// buildHaving rewrites a trace-level HAVING expression against the aggregate column
// aliases; bare, trace., and tracefield. forms all map to the selected alias.
func (b *scopedTraceStatementBuilder) buildHaving(havingExpr string, havingSet map[string]struct{}) (string, error) {
	columnMap := make(map[string]string, len(havingSet)*3)
	for a := range havingSet {
		columnMap[a] = quoteAlias(a)
		columnMap["trace."+a] = quoteAlias(a)
		columnMap["tracefield."+a] = quoteAlias(a)
	}
	return querybuilder.NewHavingExpressionRewriter().Rewrite(havingExpr, columnMap)
}

// buildEnrichmentSelect builds the final SELECT: all per-trace columns for the
// trace_ids chosen by the ranking CTE, over the same window. SELECT-expr args lead the
// WHERE args.
func (b *scopedTraceStatementBuilder) buildEnrichmentSelect(start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	selects, selectArgs := selectResolvedColumns(resolved, false, nil)
	sb.Select(selects...)
	sb.From(spanTable())
	sb.Where(append(windowWhere(sb, start, end, startBucket, endBucket), "trace_id GLOBAL IN (SELECT trace_id FROM __ai_trace_ids)")...)
	sb.GroupBy("trace_id")
	sb.OrderBy(orderClause(orders)...)
	sql, builtArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, append(append([]any{}, selectArgs...), builtArgs...)
}

// listOrder resolves a sort key to an aggregate-column alias + direction. Both the
// ranking CTE and the enrichment select that alias, so both ORDER BY it.
type listOrder struct {
	alias     string
	direction string
}

// quoteAlias backticks an alias that carries characters special to the SQL builder.
func quoteAlias(alias string) string {
	if strings.ContainsAny(alias, ".$`") {
		return "`" + alias + "`"
	}
	return alias
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

// buildFilterIDsCTE builds `__ai_filter_ids`: trace_ids with >=1 span matching
// the user filter, kept independent of the gate. Returns filter-prep warnings.
func (b *scopedTraceStatementBuilder) buildFilterIDsCTE(
	ctx context.Context,
	start, end, startBucket, endBucket uint64,
	expr string,
	variables map[string]qbtypes.VariableItem,
) (string, []any, []string, string, error) {

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

	sb := sqlbuilder.NewSelectBuilder()
	// GROUP BY (not DISTINCT) to dedupe trace_ids — parallelizes across cores.
	sb.Select("trace_id")
	sb.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	if !prepared.IsEmpty() {
		sb.AddWhereClause(prepared.WhereClause)
	}
	sb.Where(
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)
	sb.GroupBy("trace_id")

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("__ai_filter_ids AS (%s)", sql), args, prepared.Warnings, prepared.WarningsDocURL, nil
}

// resolvedColumn is a projection column whose attribute access has been resolved to
// SQL via the field mapper. expr is escaped once, ready to embed in an outer SELECT.
type resolvedColumn struct {
	alias     string
	expr      string
	args      []any
	orderable bool
}

// gateKeys fetches metadata for the gate + token attributes so the resolvers are
// materialization/evolution aware. Absence is fine — the resolvers fall back to the
// raw map column, so the query works before any gen_ai data is ingested.
func (b *scopedTraceStatementBuilder) gateKeys(ctx context.Context) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	names := []string{
		telemetrytypes.GenAIRequestModel, telemetrytypes.GenAIToolName, telemetrytypes.GenAIAgentName,
		telemetrytypes.GenAIUsageInputTokens, telemetrytypes.GenAIUsageOutputTokens,
	}
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(names))
	for _, n := range names {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:         n,
			Signal:       telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextAttribute,
		})
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return nil, err
	}
	return keys, nil
}

// existsExpr resolves a field-mapper-aware EXISTS predicate for key (materialized
// column when present, else the map). Escaped once so it round-trips when embedded
// in an outer builder's SELECT.
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
