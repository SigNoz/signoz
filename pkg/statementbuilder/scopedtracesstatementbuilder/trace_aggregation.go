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

// The per-trace values these aggregations read are window-clipped and span-filtered,
// unlike the list's enrichment pass over every span of the whole trace, so the same
// column reads differently in each.

// traceAggregation is one aggregation rewritten to run over the per-trace scan.
type traceAggregation struct {
	expr   string              // rewritten SQL over the per-trace column aliases
	used   map[string]struct{} // per-trace aliases referenced
	isRate bool
}

// buildAggregation routes by aggregation domain: bare keys delegate to the standard
// trace builder, trace.-prefixed aggregates run over the per-trace scan.
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
	if err := b.validateGroupBy(query); err != nil {
		return nil, err
	}
	if len(traceAggs) == 0 {
		return b.buildDelegatedAggregation(ctx, orgID, start, end, requestType, query, variables)
	}
	return b.buildTraceAggregationQuery(ctx, orgID, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), requestType, query, variables, traceAggs)
}

// classifyAggregations returns the rewritten trace-domain aggregations, nil when all
// are span-domain; mixing the two domains is rejected.
func (b *scopedTraceStatementBuilder) classifyAggregations(aggs []qbtypes.TraceAggregation) ([]traceAggregation, error) {
	// permission, not recognition: unknown names are reported against exactly this set
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

// orderableColumnSet is what a trace-level aggregation may use;
// recognising a key as trace-level is aggregateAliasSet's job.
func (b *scopedTraceStatementBuilder) orderableColumnSet() map[string]struct{} {
	set := make(map[string]struct{})
	for _, c := range b.scope.Columns {
		if c.Orderable {
			set[c.Alias] = struct{}{}
		}
	}
	return set
}

// filterableColumnSet is what a trace-level filter predicate may use.
func (b *scopedTraceStatementBuilder) filterableColumnSet() map[string]struct{} {
	set := make(map[string]struct{})
	for _, c := range b.scope.Columns {
		if c.Filterable {
			set[c.Alias] = struct{}{}
		}
	}
	return set
}

// validateGroupBy rejects trace-level columns as group-by keys with a targeted error
// (not the field mapper's generic "field not found"). Order keys need no check here:
// request validation only admits group keys and aggregation aliases/expressions.
func (b *scopedTraceStatementBuilder) validateGroupBy(query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) error {
	// recognition, not permission: a display-only alias must be named here to be rejected
	// rather than reaching the field mapper as a span attribute
	aliases := b.aggregateAliasSet()
	for _, gb := range query.GroupBy {
		key := gb.TelemetryFieldKey
		key.Normalize()
		// a bare name may be a span column sharing the alias (duration_nano, timestamp)
		if key.FieldContext != telemetrytypes.FieldContextTrace {
			continue
		}
		if _, ok := aliases[key.Name]; ok {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"grouping by trace-level aggregate %q is not supported; group by span attributes instead (e.g. service.name)", gb.Name)
		}
	}
	return nil
}

// rewriteTraceAggregation rewrites an aggregation over trace.-prefixed columns to run
// on the per-trace scan (trace.output_tokens → output_tokens, functions mapped via
// AggreFuncMap); a pure span-level expression returns isTrace=false for the delegate.
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
	// the interval divides the rendered expression as a whole, so a second aggregation
	// alongside the rate would be divided too
	if v.isRate && v.aggCount > 1 {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"aggregation %q combines a rate with another aggregation; the rate interval would divide both, so give each its own aggregation", expr)
	}
	return &traceAggregation{expr: chparser.Format(sel.SelectItems[0]), used: v.used, isRate: v.isRate}, true, nil
}

// traceAggVisitor classifies column references and rewrites trace.-prefixed ones in
// place; the ancestor stack tells a column identifier from a path segment, function
// name, or alias, and rejects trace. columns inside *If combinators.
type traceAggVisitor struct {
	chparser.DefaultASTVisitor
	traceCols map[string]struct{}
	used      map[string]struct{}
	stack     []chparser.Expr
	aggCount  int
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

// enclosingAggregate walks the ancestor stack; AggreFuncMap holds only aggregates and
// VisitFunctionExpr rejects any name missing from it, so a known name is enough.
func (v *traceAggVisitor) enclosingAggregate() bool {
	for _, e := range v.stack {
		fn, ok := e.(*chparser.FunctionExpr)
		if !ok {
			continue
		}
		if _, known := querybuilder.AggreFuncMap[valuer.NewString(strings.ToLower(fn.Name.Name))]; known {
			return true
		}
	}
	return false
}

// VisitPath classifies a dotted reference (trace.output_tokens); trace-level ones are
// rewritten in place to the bare per-trace alias.
func (v *traceAggVisitor) VisitPath(p *chparser.Path) error {
	col, isTrace := traceColumnFromPath(p)
	if !isTrace {
		v.hasSpan = true
		return nil
	}
	if err := v.acceptTraceColumn(chparser.Format(p), col); err != nil {
		return err
	}
	p.Fields = p.Fields[len(p.Fields)-1:]
	p.Fields[0].Name = col
	return nil
}

// VisitIdent classifies a plain identifier (a backquoted `trace.output_tokens` is
// trace-level); path segments, function names, and aliases are structural, not columns.
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
	key := telemetrytypes.GetFieldKeyFromKeyText(i.Name)
	if key.FieldContext != telemetrytypes.FieldContextTrace || key.Name == "" {
		v.hasSpan = true
		return nil
	}
	if err := v.acceptTraceColumn(i.Name, key.Name); err != nil {
		return err
	}
	i.Name = key.Name
	return nil
}

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
	// ungrouped, a bare per-trace column would make the outer SELECT emit one row per
	// trace instead of one aggregated row
	if !v.enclosingAggregate() {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level column %q must be inside an aggregation function (e.g. avg(%s))", ref, ref)
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
	v.aggCount++
	if aggFunc.Rate {
		v.isRate = true
	}
	return nil
}

// traceColumnFromPath returns the per-trace column a dotted reference names
// (trace.output_tokens -> output_tokens, trace.a.b -> a.b).
func traceColumnFromPath(p *chparser.Path) (string, bool) {
	key := telemetrytypes.GetFieldKeyFromKeyText(chparser.Format(p))
	if key.FieldContext != telemetrytypes.FieldContextTrace || key.Name == "" {
		return "", false
	}
	return key.Name, true
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

// buildQualifiedStatement selects the trace ids whose window-clipped aggregates satisfy
// the trace-level filter. The second statement (nil without resource conditions) is the
// __resource_filter CTE the scope's predicate references; the embedder emits it exactly
// once, shared with its own resource filter. start/end are ns; both statements are nil
// when variable resolution dropped every condition.
func (b *scopedTraceStatementBuilder) buildQualifiedStatement(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	traceExpr string,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, *qbtypes.Statement, error) {
	keys, err := b.fetchKeys(ctx, orgID)
	if err != nil {
		return nil, nil, err
	}
	sb := sqlbuilder.NewSelectBuilder()
	maskExpr, resolved, err := b.resolveFor(ctx, orgID, start, end, keys, sb)
	if err != nil {
		return nil, nil, err
	}
	having, err := b.resolveTraceHaving(ctx, traceExpr, variables, sb)
	if err != nil {
		return nil, nil, err
	}
	if having == nil {
		return nil, nil, nil
	}
	// nil when the filter has no resource-attribute conditions
	resourceStmt, err := b.resourceFilterStmtBuilder.Build(ctx, orgID, start, end, qbtypes.RequestTypeRaw, query, variables)
	if err != nil {
		return nil, nil, err
	}
	var resourcePred string
	if resourceStmt != nil {
		resourcePred = "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)"
	}
	sql, args := b.buildPerTraceScan(sb, start, end, resolved, maskExpr, perTraceScanOpts{
		needed:       having.used,
		havingPred:   having.pred,
		resourcePred: resourcePred,
	})
	return &qbtypes.Statement{Query: sql, Args: args}, resourceStmt, nil
}

// groupColumn holds a resolved, arg-free span-attribute expression.
type groupColumn struct {
	alias string
	expr  string
}

// groupByColumnAlias prefixes the i-th group-by dimension so the alias cannot shadow the
// span column its expression reads; the querier (stripKeyAlias) strips it back off.
func groupByColumnAlias(i int, name string) string {
	return fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, name)
}

// orderColumn is the SQL identifier a non-aggregation order key sorts by: the
// positional alias when the key names a group-by dimension, else the key itself.
func orderColumn(orderKey string, groupBy []qbtypes.GroupByKey) string {
	for i := range groupBy {
		if groupBy[i].Name == orderKey {
			return groupByColumnAlias(i, groupBy[i].Name)
		}
	}
	return orderKey
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
	limitPred    string              // top-N group prune (GLOBAL IN __limit_cte)
	havingPred   string              // resolved HAVING predicate over the selected aliases
}

func (b *scopedTraceStatementBuilder) buildPerTraceScan(sb *sqlbuilder.SelectBuilder, start, end uint64, resolved []resolvedColumn, maskExpr string, o perTraceScanOpts) (string, []any) {
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	selects := []string{"trace_id"}
	if o.stepSeconds > 0 {
		selects = append(selects, fmt.Sprintf("toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts", o.stepSeconds))
	}
	for _, gc := range o.groupCols {
		selects = append(selects, fmt.Sprintf("toString(%s) AS `%s`", gc.expr, gc.alias))
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
	if o.limitPred != "" {
		where = append(where, o.limitPred)
	}
	sb.Where(where...)

	groupBy := []string{"trace_id"}
	if o.stepSeconds > 0 {
		groupBy = append(groupBy, "ts")
	}
	for _, gc := range o.groupCols {
		groupBy = append(groupBy, "`"+gc.alias+"`")
	}
	sb.GroupBy(groupBy...)
	if strings.TrimSpace(o.havingPred) != "" {
		sb.Having(o.havingPred)
	}
	return sb.BuildWithFlavor(sqlbuilder.ClickHouse)
}

// groupBySelectors are the metadata selectors for the group-by keys, for batching
// into a single GetKeysMulti fetch.
func groupBySelectors(groupBy []qbtypes.GroupByKey) []*telemetrytypes.FieldKeySelector {
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
	return selectors
}

// resolveGroupColumns resolves group-by keys through the field mapper for selection
// inside the per-trace scan; keys must cover the group-by selectors.
func (b *scopedTraceStatementBuilder) resolveGroupColumns(ctx context.Context, orgID valuer.UUID, start, end uint64, groupBy []qbtypes.GroupByKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) ([]groupColumn, error) {
	if len(groupBy) == 0 {
		return nil, nil
	}
	out := make([]groupColumn, 0, len(groupBy))
	for i := range groupBy {
		expr, err := b.fm.ColumnExpressionFor(ctx, orgID, start, end, &groupBy[i].TelemetryFieldKey, querybuilder.MatchingLogicalFields(ctx, orgID, b.fl, telemetrytypes.SignalTraces, nil, &groupBy[i].TelemetryFieldKey, keys), telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, err
		}
		out = append(out, groupColumn{alias: groupByColumnAlias(i, groupBy[i].Name), expr: sqlbuilder.Escape(expr)})
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
		pred, warns, url, err := b.resolveSpanPredicate(ctx, orgID, start, end, spanExpr, keys, variables, sc.sb)
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

// buildTraceAggregationQuery aggregates over the per-trace scan: __qualified (when the
// filter has a trace-level part) → __scoped_traces → outer aggregation. start/end are ns.
func (b *scopedTraceStatementBuilder) buildTraceAggregationQuery(
	ctx context.Context,
	orgID valuer.UUID,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
	traceAggs []traceAggregation,
) (*qbtypes.Statement, error) {
	var spanExpr, traceExpr string
	var err error
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		// the broad set so a condition on a display-only alias still lands in the
		// trace-level part, where resolveTraceHaving rejects it by name
		spanExpr, traceExpr, err = querybuilder.SplitFilterForAggregates(query.Filter.Expression, b.aggregateAliasSet())
		if err != nil {
			return nil, err
		}
	}

	keys, err := b.fetchKeys(ctx, orgID, append(spanFilterSelectors(spanExpr), groupBySelectors(query.GroupBy)...)...)
	if err != nil {
		return nil, err
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

	groupCols, err := b.resolveGroupColumns(ctx, orgID, start, end, query.GroupBy, keys)
	if err != nil {
		return nil, err
	}
	groupNames := make([]string, 0, len(groupCols))
	for _, gc := range groupCols {
		groupNames = append(groupNames, "`"+gc.alias+"`")
	}

	needed := make(map[string]struct{})
	for _, ta := range traceAggs {
		for a := range ta.used {
			needed[a] = struct{}{}
		}
	}

	// a window or step under one second would truncate to a zero divisor
	windowSeconds := max((end-start)/querybuilder.NsToSeconds, 1)
	stepSeconds := int64(0)
	rateInterval := windowSeconds
	if requestType == qbtypes.RequestTypeTimeSeries {
		stepSeconds = int64(query.StepInterval.Seconds())
		rateInterval = max(uint64(stepSeconds), 1)
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
	// (exact for non-composable aggregates) and prune the main scan to the top-N.
	limitPred := ""
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
		})
		cteFragments = append(cteFragments, fmt.Sprintf("__scoped_traces_total AS (%s)", totalSQL))
		cteArgs = append(cteArgs, totalArgs)

		limitSQL, limitArgs := outerLimitSQL(query, traceAggs, groupNames, windowSeconds)
		cteFragments = append(cteFragments, fmt.Sprintf("__limit_cte AS (%s)", limitSQL))
		cteArgs = append(cteArgs, limitArgs)

		exprs := make([]string, 0, len(groupCols))
		for _, gc := range groupCols {
			exprs = append(exprs, "toString("+gc.expr+")")
		}
		limitPred = fmt.Sprintf("(%s) GLOBAL IN (SELECT %s FROM __limit_cte)",
			strings.Join(exprs, ", "), strings.Join(groupNames, ", "))
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
		limitPred:    limitPred,
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
					sb.OrderBy(fmt.Sprintf("`%s` %s", orderColumn(orderBy.Key.Name, query.GroupBy), orderBy.Direction.StringValue()))
				}
			}
			sb.OrderBy("ts desc")
		}
	} else {
		for _, orderBy := range query.Order {
			if idx, ok := traceAggOrderIndex(orderBy, query); ok {
				sb.OrderBy(fmt.Sprintf("__result_%d %s", idx, orderBy.Direction.StringValue()))
			} else {
				sb.OrderBy(fmt.Sprintf("`%s` %s", orderColumn(orderBy.Key.Name, query.GroupBy), orderBy.Direction.StringValue()))
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

// rendered divides a rate aggregation by the interval (step for time series, window
// length for scalar); the divisor applies to the whole expression, which holds only
// because a rate must be the sole aggregation.
func (ta traceAggregation) rendered(rateInterval uint64) string {
	if ta.isRate {
		return fmt.Sprintf("%s/%d", ta.expr, rateInterval)
	}
	return ta.expr
}

// outerLimitSQL ranks groups on whole-window per-trace values, so a non-composable
// aggregate (avg) ranks exactly rather than over bucketed rows.
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
			sb.OrderBy(fmt.Sprintf("`%s` %s", orderColumn(orderBy.Key.Name, query.GroupBy), orderBy.Direction.StringValue()))
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
