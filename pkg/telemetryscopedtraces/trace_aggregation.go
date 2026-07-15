package telemetryscopedtraces

import (
	"context"
	"fmt"
	"sort"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// This file implements scalar / time-series for source=ai.
//
// Aggregations come in two domains, chosen per expression by the `trace.` prefix:
//   - span-level (bare keys): aggregate over individual gen_ai spans. Delegated to the
//     standard trace builder with the gate ANDed in; a trace-level filter part becomes
//     a __trace_scope qualification (see buildDelegated).
//   - trace-level (`trace.` prefix): aggregate over window-clipped per-trace values
//     (avg(trace.output_tokens) = average per trace). Runs the native pipeline below.
//
// Native pipeline (buildTraceAggregationQuery):
//
//	__qualified   traces whose window-clipped aggregates satisfy the trace-level
//	   │          filter — whole-window values, so a trace qualifies once. Only
//	   ▼          present when the filter has a trace-level part.
//	__ai_traces   per-trace values: windowed, mask-pruned GROUP BY trace_id
//	   │          (+ time bucket for time series → per-bucket clipping, + group-by
//	   ▼          columns), spans filtered by gate AND span-level filter; rows with
//	main          no LLM activity are dropped (activity gate). Outer aggregation over
//	              the per-trace rows → __result_i.

// traceAggregation is one aggregation rewritten to run over the per-trace scan.
type traceAggregation struct {
	expr   string              // rewritten SQL over the per-trace column aliases
	used   map[string]struct{} // per-trace aliases referenced
	isRate bool
}

// buildAggregation routes scalar/time-series requests by aggregation domain.
func (b *scopedTraceStatementBuilder) buildAggregation(
	ctx context.Context,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	traceAggs, err := b.classifyAggregations(query.Aggregations)
	if err != nil {
		return nil, err
	}
	if err := b.validateGroupByAndOrder(requestType, query); err != nil {
		return nil, err
	}
	if len(traceAggs) == 0 {
		return b.buildDelegated(ctx, start, end, requestType, query, variables)
	}
	return b.buildTraceAggregationQuery(ctx, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), requestType, query, variables, traceAggs)
}

// classifyAggregations splits the aggregations into span-domain (delegated) vs
// trace-domain (over per-trace values). Returns the rewritten trace-domain
// aggregations, nil when all are span-domain; mixing the two domains is rejected.
func (b *scopedTraceStatementBuilder) classifyAggregations(aggs []qbtypes.TraceAggregation) ([]traceAggregation, error) {
	traceCols := b.orderableColumnSet()
	var out []traceAggregation
	spanCount := 0
	for _, agg := range aggs {
		ta, isTrace, err := rewriteTraceAggregation(agg.Expression, traceCols)
		if err != nil {
			return nil, err
		}
		if isTrace {
			out = append(out, *ta)
		} else {
			spanCount++
		}
	}
	if len(out) > 0 && spanCount > 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"span-level and trace-level (trace.) aggregations cannot be mixed in one query")
	}
	return out, nil
}

// orderableColumnSet is the gen_ai-scoped per-trace column set (static, from the
// provider) usable in trace-level aggregations and filters.
func (b *scopedTraceStatementBuilder) orderableColumnSet() map[string]struct{} {
	set := make(map[string]struct{})
	for _, c := range b.columnProvider.Columns() {
		if c.Orderable {
			set[c.Alias] = struct{}{}
		}
	}
	return set
}

// validateGroupByAndOrder rejects trace-level (trace.) per-trace columns used as a
// group-by key or an order key with a targeted error, instead of the generic "field
// not found" the field mapper would raise. An order key that names an aggregation
// (alias / expression / index) is exempt — that is the way to order by a trace-level
// aggregation's result.
func (b *scopedTraceStatementBuilder) validateGroupByAndOrder(requestType qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) error {
	aliases := b.aggregateAliasSet()
	for _, gb := range query.GroupBy {
		if isTraceLevelKey(gb.Name, gb.FieldContext, aliases) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"grouping by trace-level aggregate %q is not supported; group by span attributes instead (e.g. gen_ai.request.model, service.name)", gb.Name)
		}
	}
	for _, o := range query.Order {
		if _, isAgg := traceAggOrderIndex(o, query); isAgg {
			continue
		}
		if !isTraceLevelKey(o.Key.Name, o.Key.FieldContext, aliases) {
			continue
		}
		if requestType == qbtypes.RequestTypeRaw {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"ordering the span list by trace-level aggregate %q is not supported; order by span columns instead (e.g. timestamp, duration_nano)", o.Key.Name)
		}
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"ordering by trace-level aggregate %q is not supported; order by the aggregation itself (its alias or expression) or a group-by key", o.Key.Name)
	}
	return nil
}

// isTraceLevelKey reports whether a group-by / order key explicitly names a
// trace-level per-trace aggregate (trace./tracefield. prefix or trace field context).
// Bare names pass through: they may legitimately be span columns that share a name
// with an aggregate alias (duration_nano, timestamp).
func isTraceLevelKey(name string, fieldContext telemetrytypes.FieldContext, aliases map[string]struct{}) bool {
	stripped := strings.TrimPrefix(strings.TrimPrefix(name, "tracefield."), "trace.")
	if _, ok := aliases[stripped]; !ok {
		return false
	}
	return stripped != name || fieldContext == telemetrytypes.FieldContextTrace
}

// rewriteTraceAggregation parses one aggregation expression. When it references
// trace.-prefixed per-trace columns it returns the expression rewritten to run over
// the per-trace scan (trace.output_tokens → output_tokens, arithmetic between
// trace. columns allowed, function names mapped via AggreFuncMap) with isTrace=true;
// a pure span-level expression returns isTrace=false and is left for the delegate.
func rewriteTraceAggregation(expr string, traceCols map[string]struct{}) (*traceAggregation, bool, error) {
	p := chparser.NewParser("SELECT " + expr)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, false, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to parse aggregation expression %q", expr)
	}
	if len(stmts) == 0 {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid aggregation expression %q", expr)
	}
	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok || len(sel.SelectItems) == 0 {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid aggregation expression %q", expr)
	}

	v := &traceAggVisitor{traceCols: traceCols, used: make(map[string]struct{})}
	if err := sel.SelectItems[0].Accept(v); err != nil {
		return nil, false, err
	}
	if !v.hasTrace {
		return nil, false, nil
	}
	if v.hasSpan {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"aggregation %q mixes trace-level (trace.) and span-level columns; use one domain per aggregation", expr)
	}
	return &traceAggregation{expr: sel.SelectItems[0].String(), used: v.used, isRate: v.isRate}, true, nil
}

// traceAggVisitor walks the aggregation AST, classifying column references and
// rewriting trace.-prefixed ones (bare paths, backquoted identifiers, and either
// nested in arithmetic) to the per-trace column aliases in place. It keeps an
// ancestor stack (Enter/Leave) to tell a column identifier from a path segment,
// function name, or alias, and to reject trace. columns inside *If combinators.
type traceAggVisitor struct {
	chparser.DefaultASTVisitor
	traceCols map[string]struct{}
	used      map[string]struct{}
	stack     []chparser.Expr
	hasTrace  bool
	hasSpan   bool
	isRate    bool
}

func (v *traceAggVisitor) Enter(expr chparser.Expr) { v.stack = append(v.stack, expr) }
func (v *traceAggVisitor) Leave(expr chparser.Expr) { v.stack = v.stack[:len(v.stack)-1] }

// parent is the node enclosing the one currently being visited (the visited node
// itself is the stack top).
func (v *traceAggVisitor) parent() chparser.Expr {
	if len(v.stack) < 2 {
		return nil
	}
	return v.stack[len(v.stack)-2]
}

// enclosingCombinator returns the name of a surrounding *If-combinator function, if any.
func (v *traceAggVisitor) enclosingCombinator() (string, bool) {
	for _, e := range v.stack {
		fn, ok := e.(*chparser.FunctionExpr)
		if !ok {
			continue
		}
		if agg, known := querybuilder.AggreFuncMap[valuer.NewString(strings.ToLower(fn.Name.Name))]; known && agg.FuncCombinator {
			return fn.Name.Name, true
		}
	}
	return "", false
}

// VisitPath classifies a dotted reference (trace.output_tokens); trace-level ones are
// rewritten in place to the bare per-trace alias.
func (v *traceAggVisitor) VisitPath(p *chparser.Path) error {
	col, isTrace := traceColumnRef(p.String())
	if !isTrace {
		v.hasSpan = true
		return nil
	}
	if err := v.acceptTraceColumn(p.String(), col); err != nil {
		return err
	}
	p.Fields = p.Fields[len(p.Fields)-1:]
	p.Fields[0].Name = col
	return nil
}

// VisitIdent classifies a plain identifier: a backquoted `trace.output_tokens` is a
// trace-level reference (rewritten in place); any other column identifier is
// span-level. Path segments, function names, and aliases are structural, not columns.
func (v *traceAggVisitor) VisitIdent(i *chparser.Ident) error {
	switch parent := v.parent().(type) {
	case *chparser.Path:
		return nil // segments are classified whole by VisitPath
	case *chparser.FunctionExpr:
		if parent.Name == i {
			return nil
		}
	case *chparser.ColumnExpr:
		if parent.Alias == i {
			return nil
		}
	}
	col, isTrace := traceColumnRef(i.Name)
	if !isTrace {
		v.hasSpan = true
		return nil
	}
	if err := v.acceptTraceColumn(i.Name, col); err != nil {
		return err
	}
	i.Name = col
	return nil
}

// acceptTraceColumn validates one trace-level column reference and records it.
func (v *traceAggVisitor) acceptTraceColumn(ref, col string) error {
	if name, in := v.enclosingCombinator(); in {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"%q over trace-level (trace.) columns is not supported; put the trace-level condition in the filter expression instead", name)
	}
	// trace_id is always selected by the per-trace scan (count(trace.trace_id)
	// counts traces); everything else must be a gen_ai-scoped column.
	if col != "trace_id" {
		if _, known := v.traceCols[col]; !known {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"unknown trace-level aggregation column %q; usable columns: %s", ref, strings.Join(sortedAliases(v.traceCols), ", "))
		}
		v.used[col] = struct{}{}
	}
	v.hasTrace = true
	return nil
}

// VisitFunctionExpr validates and maps the function name. Children were already
// visited (post-order), so classification is complete for this subtree.
func (v *traceAggVisitor) VisitFunctionExpr(fn *chparser.FunctionExpr) error {
	name := strings.ToLower(fn.Name.Name)
	aggFunc, ok := querybuilder.AggreFuncMap[valuer.NewString(name)]
	if !ok {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unrecognized function: %s", name)
	}
	if fn.Params != nil && fn.Params.Items != nil && len(fn.Params.Items.Items) > 0 && aggFunc.FuncCombinator {
		// combinator predicates over span columns stay span-level (countIf(has_error=true))
		v.hasSpan = true
		return nil
	}
	fn.Name.Name = aggFunc.FuncName
	if aggFunc.Rate {
		v.isRate = true
	}
	return nil
}

// traceColumnRef reports whether text is a pure trace.-prefixed column reference
// (trace.output_tokens / tracefield.output_tokens) and returns the bare column name.
func traceColumnRef(text string) (string, bool) {
	text = strings.TrimSpace(text)
	var rest string
	if r, ok := strings.CutPrefix(text, "trace."); ok {
		rest = r
	} else if r, ok := strings.CutPrefix(text, "tracefield."); ok {
		rest = r
	} else {
		return "", false
	}
	if rest == "" || strings.ContainsAny(rest, " ()'\"`,+-*/<>=!") {
		return "", false
	}
	return rest, true
}

func sortedAliases(set map[string]struct{}) []string {
	out := make([]string, 0, len(set))
	for a := range set {
		out = append(out, a)
	}
	sort.Strings(out)
	return out
}

// ---------------------------------------------------------------------------
// Qualification + per-trace scan
// ---------------------------------------------------------------------------

// buildQualifiedStatement builds the qualification statement — trace ids whose
// window-clipped per-trace aggregates satisfy the resolved trace-level filter — used
// as the delegate's __trace_scope and the native pipeline's __qualified. When the
// query's filter references resource attributes, the scan is pruned to matching
// resource fingerprints (inlined, since the caller embeds this statement standalone),
// matching the trace list's matched pass. start/end are ns.
func (b *scopedTraceStatementBuilder) buildQualifiedStatement(
	ctx context.Context,
	start, end uint64,
	having *traceHaving,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
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
	var resourcePred string
	var resourceArgs []any
	if stmt, _, err := b.resolveResourceFilterStmt(ctx, query, start, end, variables); err != nil {
		return nil, err
	} else if stmt != nil {
		resourcePred = fmt.Sprintf("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM (%s))", sqlbuilder.Escape(stmt.Query))
		resourceArgs = stmt.Args
	}
	sql, args, err := b.qualifiedScanSQL(start, end, having, resolved, maskExpr, maskArgs, resourcePred, resourceArgs)
	if err != nil {
		return nil, err
	}
	return &qbtypes.Statement{Query: sql, Args: args}, nil
}

// qualifiedScanSQL renders the qualification scan given already-resolved columns.
func (b *scopedTraceStatementBuilder) qualifiedScanSQL(start, end uint64, having *traceHaving, resolved []resolvedColumn, maskExpr string, maskArgs []any, resourcePred string, resourceArgs []any) (string, []any, error) {
	return b.buildPerTraceScan(start, end, resolved, maskExpr, maskArgs, perTraceScanOpts{
		needed:           having.used,
		havingExpr:       having.pred,
		havingArgs:       having.args,
		resourcePred:     resourcePred,
		resourcePredArgs: resourceArgs,
	})
}

// groupColumn is a resolved span-attribute group-by column.
type groupColumn struct {
	name string
	expr string
	args []any
}

// perTraceScanOpts parametrize one windowed, mask-pruned GROUP BY trace_id scan.
type perTraceScanOpts struct {
	stepSeconds      int64 // >0 → bucket per-trace values by time (ts column)
	groupCols        []groupColumn
	needed           map[string]struct{} // per-trace aliases to select
	spanPred         string              // resolved span-level filter, ANDed per span
	spanPredArgs     []any
	resourcePred     string // resource-fingerprint prune (CTE reference or inline subquery)
	resourcePredArgs []any
	qualified        bool   // constrain to __qualified
	havingExpr       string // resolved HAVING predicate over the selected aliases
	havingArgs       []any
	activityExpr     string // aggregate expr that must be > 0 for a row to survive (LLM-activity gate)
	activityArgs     []any
}

// buildPerTraceScan renders the scan: window + gate mask (+ span filter, resource
// prune, qualification), grouped by trace_id (+ ts bucket, group-by columns).
func (b *scopedTraceStatementBuilder) buildPerTraceScan(start, end uint64, resolved []resolvedColumn, maskExpr string, maskArgs []any, o perTraceScanOpts) (string, []any, error) {
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()
	selects := []string{"trace_id"}
	if o.stepSeconds > 0 {
		selects = append(selects, fmt.Sprintf("toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts", o.stepSeconds))
	}
	for _, gc := range o.groupCols {
		gcExpr, err := embedExpr(sb, gc.expr, gc.args)
		if err != nil {
			return "", nil, err
		}
		selects = append(selects, fmt.Sprintf("toString(%s) AS `%s`", gcExpr, gc.name))
	}
	for _, rc := range resolved {
		if _, ok := o.needed[rc.alias]; !ok {
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

	where := windowWhere(sb, start, end, startBucket, endBucket)
	mask, err := embedExpr(sb, maskExpr, maskArgs)
	if err != nil {
		return "", nil, err
	}
	where = append(where, mask)
	if strings.TrimSpace(o.spanPred) != "" {
		pred, err := embedExpr(sb, o.spanPred, o.spanPredArgs)
		if err != nil {
			return "", nil, err
		}
		where = append(where, pred)
	}
	if o.resourcePred != "" {
		pred, err := embedExpr(sb, o.resourcePred, o.resourcePredArgs)
		if err != nil {
			return "", nil, err
		}
		where = append(where, pred)
	}
	if o.qualified {
		where = append(where, "trace_id GLOBAL IN (SELECT trace_id FROM __qualified)")
	}
	sb.Where(where...)

	groupBy := []string{"trace_id"}
	if o.stepSeconds > 0 {
		groupBy = append(groupBy, "ts")
	}
	for _, gc := range o.groupCols {
		groupBy = append(groupBy, "`"+gc.name+"`")
	}
	sb.GroupBy(groupBy...)
	var having []string
	if strings.TrimSpace(o.activityExpr) != "" {
		activity, err := embedExpr(sb, o.activityExpr, o.activityArgs)
		if err != nil {
			return "", nil, err
		}
		having = append(having, "("+activity+") > 0")
	}
	if strings.TrimSpace(o.havingExpr) != "" {
		hv, err := embedExpr(sb, o.havingExpr, o.havingArgs)
		if err != nil {
			return "", nil, err
		}
		having = append(having, hv)
	}
	if len(having) > 0 {
		sb.Having(strings.Join(having, " AND "))
	}
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, args, nil
}

// resolveGroupColumns resolves span-attribute group-by keys through the field mapper
// (metadata-aware), for selection inside the per-trace scan.
func (b *scopedTraceStatementBuilder) resolveGroupColumns(ctx context.Context, start, end uint64, groupBy []qbtypes.GroupByKey) ([]groupColumn, error) {
	if len(groupBy) == 0 {
		return nil, nil
	}
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(groupBy))
	for i := range groupBy {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:              groupBy[i].Name,
			Signal:            telemetrytypes.SignalTraces,
			FieldContext:      groupBy[i].FieldContext,
			FieldDataType:     groupBy[i].FieldDataType,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		})
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return nil, err
	}
	out := make([]groupColumn, 0, len(groupBy))
	for i := range groupBy {
		expr, args, err := querybuilder.CollisionHandledFinalExpr(ctx, start, end, &groupBy[i].TelemetryFieldKey, b.fm, b.cb, keys, telemetrytypes.FieldDataTypeString, nil, false)
		if err != nil {
			return nil, err
		}
		out = append(out, groupColumn{name: groupBy[i].Name, expr: expr, args: args})
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Native trace-domain aggregation query
// ---------------------------------------------------------------------------

// buildTraceAggregationQuery builds the native pipeline (see the file comment).
// start/end are ns.
func (b *scopedTraceStatementBuilder) buildTraceAggregationQuery(
	ctx context.Context,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
	traceAggs []traceAggregation,
) (*qbtypes.Statement, error) {
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

	spanExpr, traceHavingPart, err := b.splitUserFilter(ctx, query, variables)
	if err != nil {
		return nil, err
	}

	resourceFrag, resourceArgs, resourcePred, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, query, start, end, variables)
	if err != nil {
		return nil, err
	}

	var warnings []string
	var warningsURL string
	var spanPred string
	var spanPredArgs []any
	if strings.TrimSpace(spanExpr) != "" {
		pred, args, warns, url, err := b.resolveSpanPredicate(ctx, start, end, spanExpr, skipResourceFilter, variables)
		if err != nil {
			return nil, err
		}
		spanPred, spanPredArgs, warnings, warningsURL = pred, args, warns, url
	}

	var cteFragments []string
	var cteArgs [][]any
	if resourceFrag != "" {
		cteFragments = append(cteFragments, resourceFrag)
		cteArgs = append(cteArgs, resourceArgs)
	}

	qualified := traceHavingPart != nil
	if qualified {
		qsql, qargs, err := b.qualifiedScanSQL(start, end, traceHavingPart, resolved, maskExpr, maskArgs, resourcePred, nil)
		if err != nil {
			return nil, err
		}
		cteFragments = append(cteFragments, fmt.Sprintf("__qualified AS (%s)", qsql))
		cteArgs = append(cteArgs, qargs)
	}

	groupCols, err := b.resolveGroupColumns(ctx, start, end, query.GroupBy)
	if err != nil {
		return nil, err
	}
	groupNames := make([]string, 0, len(groupCols))
	for _, gc := range groupCols {
		groupNames = append(groupNames, "`"+gc.name+"`")
	}

	needed := make(map[string]struct{})
	for _, ta := range traceAggs {
		for a := range ta.used {
			needed[a] = struct{}{}
		}
	}

	stepSeconds := int64(0)
	rateInterval := (end - start) / querybuilder.NsToSeconds
	if requestType == qbtypes.RequestTypeTimeSeries {
		stepSeconds = int64(query.StepInterval.Seconds())
		rateInterval = uint64(stepSeconds)
	}

	// LLM-activity gate: per-trace rows with no LLM span in their window/bucket slice
	// are dropped, so e.g. count(trace.trace_id) and avg(trace.output_tokens) agree on
	// the set of traces they see.
	activityExpr, activityArgs := activityGate(b.columnProvider, resolved)

	scanOpts := perTraceScanOpts{
		stepSeconds:  stepSeconds,
		groupCols:    groupCols,
		needed:       needed,
		spanPred:     spanPred,
		spanPredArgs: spanPredArgs,
		resourcePred: resourcePred,
		qualified:    qualified,
		activityExpr: activityExpr,
		activityArgs: activityArgs,
	}

	// outer aggregation over the per-trace rows
	sb := sqlbuilder.NewSelectBuilder()
	selects := []string{}
	if stepSeconds > 0 {
		selects = append(selects, "ts")
	}
	selects = append(selects, groupNames...)
	for i, ta := range traceAggs {
		selects = append(selects, fmt.Sprintf("%s AS __result_%d", ta.rendered(rateInterval), i))
	}
	sb.Select(selects...)
	sb.From("__ai_traces")

	// grouped, limited time series → rank groups on whole-window per-trace values
	// (exact for non-composable aggregates) and constrain the main query to the top-N.
	if requestType == qbtypes.RequestTypeTimeSeries && query.Limit > 0 && len(groupCols) > 0 {
		totalOpts := scanOpts
		totalOpts.stepSeconds = 0
		totalSQL, totalArgs, err := b.buildPerTraceScan(start, end, resolved, maskExpr, maskArgs, totalOpts)
		if err != nil {
			return nil, err
		}
		cteFragments = append(cteFragments, fmt.Sprintf("__ai_traces_total AS (%s)", totalSQL))
		cteArgs = append(cteArgs, totalArgs)

		limitSQL, limitArgs := outerLimitSQL(query, traceAggs, groupNames, (end-start)/querybuilder.NsToSeconds)
		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", limitSQL))
		cteArgs = append(cteArgs, limitArgs)

		tuple := "(" + strings.Join(groupNames, ", ") + ")"
		sb.Where(fmt.Sprintf("%s IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(groupNames, ", ")))
	}

	perTraceSQL, perTraceArgs, err := b.buildPerTraceScan(start, end, resolved, maskExpr, maskArgs, scanOpts)
	if err != nil {
		return nil, err
	}
	cteFragments = append(cteFragments, fmt.Sprintf("__ai_traces AS (%s)", perTraceSQL))
	cteArgs = append(cteArgs, perTraceArgs)

	groupBys := []string{}
	if stepSeconds > 0 {
		groupBys = append(groupBys, "ts")
	}
	groupBys = append(groupBys, groupNames...)
	if len(groupBys) > 0 {
		sb.GroupBy(groupBys...)
	}

	if query.Having != nil && strings.TrimSpace(query.Having.Expression) != "" {
		rewritten, err := querybuilder.NewHavingExpressionRewriter().RewriteForTraces(query.Having.Expression, query.Aggregations)
		if err != nil {
			return nil, err
		}
		sb.Having(rewritten)
	}

	if requestType == qbtypes.RequestTypeTimeSeries {
		if len(query.Order) != 0 {
			for _, orderBy := range query.Order {
				if _, ok := traceAggOrderIndex(orderBy, query); !ok {
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}
	} else {
		for _, orderBy := range query.Order {
			if idx, ok := traceAggOrderIndex(orderBy, query); ok {
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
	}

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       warnings,
		WarningsDocURL: warningsURL,
	}, nil
}

// activityGate resolves the provider's activity-gate column (llm_call_count for
// gen_ai) to its aggregate expression; empty when the provider declares none.
func activityGate(provider ColumnProvider, resolved []resolvedColumn) (string, []any) {
	alias := provider.ActivityGateAlias()
	if alias == "" {
		return "", nil
	}
	for _, rc := range resolved {
		if rc.alias == alias {
			return rc.expr, rc.args
		}
	}
	return "", nil
}

// rendered returns the outer aggregation SQL, dividing rate aggregations by the
// interval (step for time series, window length for scalar).
func (ta traceAggregation) rendered(rateInterval uint64) string {
	if ta.isRate {
		return fmt.Sprintf("%s/%d", ta.expr, rateInterval)
	}
	return ta.expr
}

// outerLimitSQL renders the top-N group selection for a grouped, limited time
// series: the outer aggregations over whole-window per-trace values, ranked and
// limited.
func outerLimitSQL(query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], traceAggs []traceAggregation, groupNames []string, windowSeconds uint64) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	selects := append([]string{}, groupNames...)
	for i, ta := range traceAggs {
		selects = append(selects, fmt.Sprintf("%s AS __result_%d", ta.rendered(windowSeconds), i))
	}
	sb.Select(selects...)
	sb.From("__ai_traces_total")
	sb.GroupBy(groupNames...)
	for _, orderBy := range query.Order {
		if idx, ok := traceAggOrderIndex(orderBy, query); ok {
			sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
		} else {
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderBy.Key.Name, orderBy.Direction.StringValue()))
		}
	}
	if len(query.Order) == 0 {
		sb.OrderBy("__result_0 DESC")
	}
	sb.Limit(query.Limit)
	return sb.BuildWithFlavor(sqlbuilder.ClickHouse)
}

// traceAggOrderIndex reports whether an order key refers to the i-th aggregation
// (by alias, expression, or index), mirroring the trace builder.
func traceAggOrderIndex(k qbtypes.OrderBy, q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) (int, bool) {
	for i, agg := range q.Aggregations {
		if k.Key.Name == agg.Alias ||
			k.Key.Name == agg.Expression ||
			k.Key.Name == fmt.Sprintf("%d", i) {
			return i, true
		}
	}
	return 0, false
}
