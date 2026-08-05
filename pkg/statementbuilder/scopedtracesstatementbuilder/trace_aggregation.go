package scopedtracesstatementbuilder

import (
	"context"
	"fmt"
	"sort"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// This file implements scalar / time-series for scoped-trace queries
// (builder_ai_query being the current consumer).
//
// Aggregations come in two domains, chosen per expression by the `trace.` prefix:
//   - span-level (bare keys): aggregate over individual in-scope spans. Delegated to the
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
//	__scoped_traces   per-trace values: windowed, mask-pruned GROUP BY trace_id
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
	orgID valuer.UUID,
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
		return b.buildDelegated(ctx, orgID, start, end, requestType, query, variables)
	}
	return b.buildTraceAggregationQuery(ctx, orgID, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), requestType, query, variables, traceAggs)
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

// orderableColumnSet is the scope's per-trace column set (static) usable in
// trace-level aggregations and filters.
func (b *scopedTraceStatementBuilder) orderableColumnSet() map[string]struct{} {
	set := make(map[string]struct{})
	for _, c := range b.scope.Columns {
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
				"grouping by trace-level aggregate %q is not supported; group by span attributes instead (e.g. service.name)", gb.Name)
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
	return &traceAggregation{expr: chparser.Format(sel.SelectItems[0]), used: v.used, isRate: v.isRate}, true, nil
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
	ref := chparser.Format(p)
	col, isTrace := traceColumnRef(ref)
	if !isTrace {
		v.hasSpan = true
		return nil
	}
	if err := v.acceptTraceColumn(ref, col); err != nil {
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
	// counts traces); everything else must be a scope column.
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
// window-clipped per-trace aggregates satisfy the trace-level filter — used as the
// delegate's __trace_scope. When the query's filter references resource attributes,
// the scan is pruned to matching resource fingerprints (inlined, since the caller
// embeds this statement standalone). start/end are ns. Returns nil when every
// trace-level condition was dropped by variable resolution.
func (b *scopedTraceStatementBuilder) buildQualifiedStatement(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	traceExpr string,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	keys, err := b.fetchKeys(ctx, orgID)
	if err != nil {
		return nil, err
	}
	sb := sqlbuilder.NewSelectBuilder()
	maskExpr, resolved, err := b.resolveFor(ctx, orgID, start, end, keys, sb)
	if err != nil {
		return nil, err
	}
	having, err := b.resolveTraceHaving(ctx, traceExpr, variables, sb)
	if err != nil {
		return nil, err
	}
	if having == nil {
		return nil, nil
	}
	var resourcePred string
	// nil when the filter has no resource-attribute conditions
	if stmt, err := b.resourceFilterStmtBuilder.Build(ctx, orgID, start, end, qbtypes.RequestTypeRaw, query, variables); err != nil {
		return nil, err
	} else if stmt != nil {
		inlined, err := embedExpr(sb, stmt.Query, stmt.Args)
		if err != nil {
			return nil, err
		}
		resourcePred = fmt.Sprintf("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM (%s))", inlined)
	}
	sql, args := b.buildPerTraceScan(sb, start, end, resolved, maskExpr, perTraceScanOpts{
		needed:       having.used,
		havingPred:   having.pred,
		resourcePred: resourcePred,
	})
	return &qbtypes.Statement{Query: sql, Args: args}, nil
}

// embedExpr inlines a pre-built statement into sb, replacing each `?` placeholder
// with a builder Var so the args are tracked in appearance order. A count mismatch
// would silently shift args into the wrong slots — error out instead.
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

// groupColumn is a resolved span-attribute group-by column (arg-free expression).
type groupColumn struct {
	name string
	expr string
}

// perTraceScanOpts parametrize one windowed, mask-pruned GROUP BY trace_id scan.
// All expressions are already resolved against the scan's builder.
type perTraceScanOpts struct {
	stepSeconds  int64 // >0 → bucket per-trace values by time (ts column)
	groupCols    []groupColumn
	needed       map[string]struct{} // per-trace aliases to select
	spanPred     string              // resolved span-level filter, ANDed per span
	resourcePred string              // resource-fingerprint prune (CTE reference or inline subquery)
	qualified    bool                // constrain to __qualified
	havingPred   string              // resolved HAVING predicate over the selected aliases
	activityExpr string              // aggregate expr that must be > 0 for a row to survive
}

// buildPerTraceScan renders the scan: window + gate mask (+ span filter, resource
// prune, qualification), grouped by trace_id (+ ts bucket, group-by columns).
func (b *scopedTraceStatementBuilder) buildPerTraceScan(sb *sqlbuilder.SelectBuilder, start, end uint64, resolved []resolvedColumn, maskExpr string, o perTraceScanOpts) (string, []any) {
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	selects := []string{"trace_id"}
	if o.stepSeconds > 0 {
		selects = append(selects, fmt.Sprintf("toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts", o.stepSeconds))
	}
	for _, gc := range o.groupCols {
		selects = append(selects, fmt.Sprintf("toString(%s) AS `%s`", gc.expr, gc.name))
	}
	for _, rc := range resolved {
		if _, ok := o.needed[rc.alias]; !ok {
			continue
		}
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(fmt.Sprintf("%s.%s", tracestelemetryschema.DBName, tracestelemetryschema.SpanIndexV3TableName))

	where := []string{
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
		maskExpr,
	}
	if strings.TrimSpace(o.spanPred) != "" {
		where = append(where, o.spanPred)
	}
	if o.resourcePred != "" {
		where = append(where, o.resourcePred)
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
		having = append(having, "("+o.activityExpr+") > 0")
	}
	if strings.TrimSpace(o.havingPred) != "" {
		having = append(having, o.havingPred)
	}
	if len(having) > 0 {
		sb.Having(strings.Join(having, " AND "))
	}
	return sb.BuildWithFlavor(sqlbuilder.ClickHouse)
}

// resolveGroupColumns resolves span-attribute group-by keys through the field mapper
// (metadata-aware), for selection inside the per-trace scan.
func (b *scopedTraceStatementBuilder) resolveGroupColumns(ctx context.Context, orgID valuer.UUID, start, end uint64, groupBy []qbtypes.GroupByKey) ([]groupColumn, error) {
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
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, orgID, selectors)
	if err != nil {
		return nil, err
	}
	out := make([]groupColumn, 0, len(groupBy))
	for i := range groupBy {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &groupBy[i].TelemetryFieldKey, telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, err
		}
		out = append(out, groupColumn{name: groupBy[i].Name, expr: sqlbuilder.Escape(expr)})
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Native trace-domain aggregation query
// ---------------------------------------------------------------------------

// scanContext is one per-scan resolution: a fresh builder with the mask, columns,
// span predicate, and optionally the trace-level HAVING resolved against it.
type scanContext struct {
	sb       *sqlbuilder.SelectBuilder
	maskExpr string
	resolved []resolvedColumn
	spanPred string
	having   *traceHaving
	warnings []string
	warnURL  string
}

// newScanContext resolves everything a per-trace scan embeds against a fresh builder.
func (b *scopedTraceStatementBuilder) newScanContext(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	spanExpr, traceExpr string,
	variables map[string]qbtypes.VariableItem,
) (*scanContext, error) {
	sc := &scanContext{sb: sqlbuilder.NewSelectBuilder()}
	var err error
	sc.maskExpr, sc.resolved, err = b.resolveFor(ctx, orgID, start, end, keys, sc.sb)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(spanExpr) != "" {
		pred, warns, url, err := b.resolveSpanPredicate(ctx, orgID, start, end, spanExpr, variables, sc.sb)
		if err != nil {
			return nil, err
		}
		sc.spanPred, sc.warnings, sc.warnURL = pred, warns, url
	}
	if strings.TrimSpace(traceExpr) != "" {
		sc.having, err = b.resolveTraceHaving(ctx, traceExpr, variables, sc.sb)
		if err != nil {
			return nil, err
		}
	}
	return sc, nil
}

// buildTraceAggregationQuery builds the native pipeline (see the file comment).
// start/end are ns.
func (b *scopedTraceStatementBuilder) buildTraceAggregationQuery(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
	traceAggs []traceAggregation,
) (*qbtypes.Statement, error) {
	keys, err := b.fetchKeys(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var spanExpr, traceExpr string
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err = querybuilder.SplitFilterForAggregates(query.Filter.Expression, b.aggregateAliasSet())
		if err != nil {
			return nil, err
		}
	}

	resourceFrag, resourceArgs, resourcePred, err := b.maybeAttachResourceFilter(ctx, orgID, query, start, end, variables)
	if err != nil {
		return nil, err
	}

	var cteFragments []string
	var cteArgs [][]any
	if resourceFrag != "" {
		cteFragments = append(cteFragments, resourceFrag)
		cteArgs = append(cteArgs, resourceArgs)
	}

	// __qualified: its own scan resolution, HAVING = the trace-level filter part
	qualified := false
	if strings.TrimSpace(traceExpr) != "" {
		qsc, err := b.newScanContext(ctx, orgID, start, end, keys, "", traceExpr, variables)
		if err != nil {
			return nil, err
		}
		if qsc.having != nil {
			qsql, qargs := b.buildPerTraceScan(qsc.sb, start, end, qsc.resolved, qsc.maskExpr, perTraceScanOpts{
				needed:       qsc.having.used,
				havingPred:   qsc.having.pred,
				resourcePred: resourcePred,
			})
			cteFragments = append(cteFragments, fmt.Sprintf("__qualified AS (%s)", qsql))
			cteArgs = append(cteArgs, qargs)
			qualified = true
		}
	}

	groupCols, err := b.resolveGroupColumns(ctx, orgID, start, end, query.GroupBy)
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
	sb.From("__scoped_traces")

	// grouped, limited time series → rank groups on whole-window per-trace values
	// (exact for non-composable aggregates) and constrain the main query to the top-N.
	if requestType == qbtypes.RequestTypeTimeSeries && query.Limit > 0 && len(groupCols) > 0 {
		tsc, err := b.newScanContext(ctx, orgID, start, end, keys, spanExpr, "", variables)
		if err != nil {
			return nil, err
		}
		totalSQL, totalArgs := b.buildPerTraceScan(tsc.sb, start, end, tsc.resolved, tsc.maskExpr, perTraceScanOpts{
			groupCols:    groupCols,
			needed:       needed,
			spanPred:     tsc.spanPred,
			resourcePred: resourcePred,
			qualified:    qualified,
			activityExpr: activityGate(b.scope, tsc.resolved),
		})
		cteFragments = append(cteFragments, fmt.Sprintf("__scoped_traces_total AS (%s)", totalSQL))
		cteArgs = append(cteArgs, totalArgs)

		limitSQL, limitArgs := outerLimitSQL(query, traceAggs, groupNames, (end-start)/querybuilder.NsToSeconds)
		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", limitSQL))
		cteArgs = append(cteArgs, limitArgs)

		tuple := "(" + strings.Join(groupNames, ", ") + ")"
		sb.Where(fmt.Sprintf("%s IN (SELECT %s FROM __limit_cte)", tuple, strings.Join(groupNames, ", ")))
	}

	msc, err := b.newScanContext(ctx, orgID, start, end, keys, spanExpr, "", variables)
	if err != nil {
		return nil, err
	}
	perTraceSQL, perTraceArgs := b.buildPerTraceScan(msc.sb, start, end, msc.resolved, msc.maskExpr, perTraceScanOpts{
		stepSeconds:  stepSeconds,
		groupCols:    groupCols,
		needed:       needed,
		spanPred:     msc.spanPred,
		resourcePred: resourcePred,
		qualified:    qualified,
		// LLM-activity gate: per-trace rows with no in-scope activity in their
		// window/bucket slice are dropped, so e.g. count(trace.trace_id) and
		// avg(trace.output_tokens) agree on the set of traces they see.
		activityExpr: activityGate(b.scope, msc.resolved),
	})
	cteFragments = append(cteFragments, fmt.Sprintf("__scoped_traces AS (%s)", perTraceSQL))
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
		sb.Having(sqlbuilder.Escape(rewritten))
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
		Warnings:       msc.warnings,
		WarningsDocURL: msc.warnURL,
	}, nil
}

// activityGate resolves the scope's activity-gate column to its aggregate expression;
// empty when the scope declares none.
func activityGate(scope TraceScope, resolved []resolvedColumn) string {
	if scope.ActivityGateAlias == "" {
		return ""
	}
	for _, rc := range resolved {
		if rc.alias == scope.ActivityGateAlias {
			return rc.expr
		}
	}
	return ""
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
	sb.From("__scoped_traces_total")
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
