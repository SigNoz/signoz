package clickhouseprometheusv2

import (
	"fmt"
	"strings"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql/parser"
)

// The compiler turns PromQL subtrees into single ClickHouse queries built on
// the timeSeries*ToGrid aggregate functions (CH >= 25.6), whose semantics
// were verified against this repo's vendored engine: exact extrapolatedRate
// behavior including counter resets, the counter zero-point clamp, the
// 1.1x-average extrapolation threshold, left-open windows, the >= 2 samples
// rule, stale-marker shadowing, and millisecond grid starts. Sample rows
// never leave ClickHouse: one row per output series comes back, holding the
// whole grid as an array.
//
// Scope (the allowlist): an optional sum/min/max/avg/count by/without
// aggregation over a core unit — a rate/increase/delta/irate/idelta range
// selection, an instant vector selection, or an avg/min/max/sum/count/last
// _over_time window — plus number-literal arithmetic/comparisons and unary
// minus on top. Units inside fixed-resolution subqueries evaluate on the
// subquery's own grid. Everything else either falls back to the engine over
// this package's querier, or — when a transpilable subtree sits under a
// non-transpilable node — runs hybrid: the subtree's grids are computed in
// ClickHouse and substituted into the engine as synthetic series (see
// compiler_exec.go). See doc.go for the fallback list and the reasons behind
// each entry.

// rangeFn is a transpilable range-vector function.
type rangeFn string

const (
	fnRate     rangeFn = "rate"
	fnIncrease rangeFn = "increase"
	fnDelta    rangeFn = "delta"
	fnIRate    rangeFn = "irate"
	fnIDelta   rangeFn = "idelta"
)

var gridFunction = map[rangeFn]string{
	fnRate:     "timeSeriesRateToGrid",
	fnIncrease: "timeSeriesRateToGrid", // increase == rate * range seconds, exactly (same factor algebra)
	fnDelta:    "timeSeriesDeltaToGrid",
	fnIRate:    "timeSeriesInstantRateToGrid",
	fnIDelta:   "timeSeriesInstantDeltaToGrid",
}

// scalarOp is one number-literal arithmetic or comparison applied to a
// compiled vector, evaluated in Go during assembly with the same float64
// operations the engine uses.
type scalarOp struct {
	op           parser.ItemType
	scalar       float64
	scalarOnLeft bool
	returnBool   bool
}

// isComparison reports whether the op is a filtering/bool comparison, which
// preserves the metric name (arithmetic drops it).
func (o scalarOp) isComparison() bool {
	return o.op.IsComparisonOperator()
}

// unitKind is the selector shape at the bottom of a core unit.
type unitKind int

const (
	// unitRange: rate/increase/delta/irate/idelta over a matrix selector.
	unitRange unitKind = iota
	// unitInstant: a plain vector selector resolved per grid point with
	// lookback and stale-marker shadowing.
	unitInstant
	// unitOverTime: avg/min/max/sum/count/last_over_time over a matrix
	// selector (aggregation over the window's samples, stale rows excluded).
	unitOverTime
)

// coreUnit is one transpilable subtree: selector [-> range function] ->
// optional aggregation -> scalar op pipeline.
type coreUnit struct {
	kind     unitKind
	matchers []*labels.Matcher
	offsetMs int64
	fn       rangeFn // unitRange
	overFn   string  // unitOverTime: avg|min|max|sum|count|last
	rangeMs  int64   // unitRange/unitOverTime window

	hasAgg   bool
	aggOp    parser.ItemType // SUM MIN MAX AVG COUNT
	by       bool
	grouping []string

	ops []scalarOp
}

// keepsName reports whether the unit's output series keep their real
// __name__: bare/comparison-filtered instant selectors and last_over_time do
// (it returns the raw sample, name included); range functions, the other
// *_over_time functions, aggregations, arithmetic and bool comparisons all
// drop it — a bool comparison returns 0/1, not the sample, so the engine
// drops the name there too. Units that keep the name cannot be substituted
// as synthetic series in hybrid plans — the synthetic name would replace
// the real one — but transpile fine as full plans, where assembly emits the
// real names.
func (u *coreUnit) keepsName() bool {
	nameKeepingSelector := u.kind == unitInstant || (u.kind == unitOverTime && u.overFn == "last")
	if !nameKeepingSelector || u.hasAgg {
		return false
	}
	for _, op := range u.ops {
		if !op.isComparison() || op.returnBool {
			return false
		}
	}
	return true
}

// gridContext is the evaluation grid a unit computes on. The query grid for
// top-level units; for units inside subqueries, the subquery's own grid:
// epoch-aligned multiples of its resolution covering the subquery window,
// exactly as the engine derives it (engine.go, *parser.SubqueryExpr case).
type gridContext struct {
	startMs int64
	endMs   int64
	stepMs  int64
}

// subqueryGrid derives the inner grid for a subquery evaluated on outer:
// interval S, end = outer end − offset, start = first multiple of S strictly
// greater than outer start − offset − range.
func subqueryGrid(outer gridContext, rangeMs, stepMs, offsetMs int64) gridContext {
	lower := outer.startMs - offsetMs - rangeMs
	start := stepMs * (lower / stepMs)
	if start <= lower {
		start += stepMs
	}
	return gridContext{startMs: start, endMs: outer.endMs - offsetMs, stepMs: stepMs}
}

// transpiledUnit is a coreUnit scheduled for execution, named for hybrid
// substitution, carrying the grid it evaluates on.
type transpiledUnit struct {
	core coreUnit
	name string // __signoz_transpiled_<n>__
	grid gridContext
}

// transpilePlan is the outcome of classifying a query.
type transpilePlan struct {
	units []*transpiledUnit
	grid  gridContext // the query's top-level grid
	// full is set when the entire query is units[0]; otherwise rewritten
	// holds the query with each unit replaced by a synthetic selector, to be
	// evaluated by the engine over a hybrid storage.
	full      bool
	rewritten string
}

const syntheticNamePrefix = "__signoz_transpiled_"

func syntheticName(i int) string {
	return fmt.Sprintf("%s%d__", syntheticNamePrefix, i)
}

// classifyCore matches a subtree against the transpilable core shape.
// stepMs gates second-granularity: the grid functions take whole-second step
// and window parameters (grid *starts* are millisecond-precise).
func classifyCore(node parser.Expr, stepMs int64) (*coreUnit, bool) {
	unit := &coreUnit{}

	expr := node
	// Peel scalar ops and parens off the top, outermost first; ops apply in
	// evaluation order, so prepend while peeling.
	for {
		switch n := expr.(type) {
		case *parser.ParenExpr:
			expr = n.Expr
			continue
		case *parser.UnaryExpr:
			if n.Op != parser.SUB {
				expr = n.Expr // unary '+' is a no-op
				continue
			}
			// -x == -1 * x for every float64 (incl. NaN and signed zero).
			unit.ops = append([]scalarOp{{op: parser.MUL, scalar: -1}}, unit.ops...)
			expr = n.Expr
			continue
		case *parser.StepInvariantExpr:
			// @-pinned expressions evaluate on a different grid.
			return nil, false
		case *parser.BinaryExpr:
			lit, litOnLeft, ok := numberLiteralSide(n)
			if !ok {
				return nil, false
			}
			if !n.Op.IsOperator() && !n.Op.IsComparisonOperator() {
				return nil, false
			}
			if n.Op == parser.ATAN2 {
				// atan2 is arithmetic in PromQL but rarely used; keep the
				// allowlist tight.
				return nil, false
			}
			returnBool := n.ReturnBool
			unit.ops = append([]scalarOp{{op: n.Op, scalar: lit, scalarOnLeft: litOnLeft, returnBool: returnBool}}, unit.ops...)
			if litOnLeft {
				expr = n.RHS
			} else {
				expr = n.LHS
			}
			continue
		}
		break
	}

	// Optional aggregation.
	if agg, ok := expr.(*parser.AggregateExpr); ok {
		switch agg.Op {
		case parser.SUM, parser.MIN, parser.MAX, parser.AVG, parser.COUNT:
		default:
			return nil, false
		}
		for _, g := range agg.Grouping {
			if g == metricNameLabel {
				// by(__name__)/without(__name__) over synthetic or compiled
				// output needs name bookkeeping the compiler doesn't do.
				return nil, false
			}
		}
		unit.hasAgg = true
		unit.aggOp = agg.Op
		unit.by = !agg.Without
		unit.grouping = agg.Grouping
		expr = agg.Expr
		for {
			if p, ok := expr.(*parser.ParenExpr); ok {
				expr = p.Expr
				continue
			}
			break
		}
	}

	// The grid functions take whole-second steps; stepMs == 0 is an instant
	// query (single-point grid).
	if stepMs < 0 || stepMs%1000 != 0 {
		return nil, false
	}

	// Bare instant selector: resolved per grid point with lookback and
	// stale-marker shadowing (see compiler_sql.go).
	if vs, ok := expr.(*parser.VectorSelector); ok {
		if vs.Timestamp != nil || vs.StartOrEnd != 0 || vs.Anchored || vs.Smoothed {
			return nil, false
		}
		offsetMs := vs.OriginalOffset.Milliseconds()
		if offsetMs < 0 {
			return nil, false
		}
		unit.kind = unitInstant
		unit.offsetMs = offsetMs
		unit.matchers = vs.LabelMatchers
		return unit, true
	}

	// Range or *_over_time function over a plain matrix selector.
	call, ok := expr.(*parser.Call)
	if !ok {
		return nil, false
	}
	var fn rangeFn
	var overFn string
	switch call.Func.Name {
	case "rate":
		fn = fnRate
	case "increase":
		fn = fnIncrease
	case "delta":
		fn = fnDelta
	case "irate":
		fn = fnIRate
	case "idelta":
		fn = fnIDelta
	case "avg_over_time", "min_over_time", "max_over_time", "sum_over_time", "count_over_time", "last_over_time":
		overFn = strings.TrimSuffix(call.Func.Name, "_over_time")
	default:
		return nil, false
	}
	if len(call.Args) != 1 {
		return nil, false
	}
	ms, ok := call.Args[0].(*parser.MatrixSelector)
	if !ok {
		return nil, false
	}
	vs, ok := ms.VectorSelector.(*parser.VectorSelector)
	if !ok {
		return nil, false
	}
	if vs.Timestamp != nil || vs.StartOrEnd != 0 || vs.Anchored || vs.Smoothed {
		return nil, false
	}

	rangeMs := ms.Range.Milliseconds()
	offsetMs := vs.OriginalOffset.Milliseconds()
	if rangeMs <= 0 || rangeMs%1000 != 0 || offsetMs < 0 {
		return nil, false
	}

	if overFn != "" {
		unit.kind = unitOverTime
		unit.overFn = overFn
	} else {
		unit.kind = unitRange
		unit.fn = fn
	}
	unit.rangeMs = rangeMs
	unit.offsetMs = offsetMs
	unit.matchers = vs.LabelMatchers
	return unit, true
}

// numberLiteralSide returns the number literal on one side of a binary
// expression (peeling parens and unary minus), and which side it is on.
func numberLiteralSide(b *parser.BinaryExpr) (float64, bool, bool) {
	if v, ok := literalValue(b.LHS); ok {
		return v, true, true
	}
	if v, ok := literalValue(b.RHS); ok {
		return v, false, true
	}
	return 0, false, false
}

func literalValue(e parser.Expr) (float64, bool) {
	neg := false
	for {
		switch n := e.(type) {
		case *parser.ParenExpr:
			e = n.Expr
			continue
		case *parser.StepInvariantExpr:
			e = n.Expr
			continue
		case *parser.UnaryExpr:
			if n.Op == parser.SUB {
				neg = !neg
			}
			e = n.Expr
			continue
		case *parser.NumberLiteral:
			if neg {
				return -n.Val, true
			}
			return n.Val, true
		default:
			return 0, false
		}
	}
}

// classify builds the compile plan for a query: full when the root is a core
// unit, hybrid when core units sit strictly below the root (including inside
// fixed-resolution subqueries, computed on the subquery grid), none
// otherwise.
func classify(root parser.Expr, grid gridContext) (*transpilePlan, bool) {
	if unit, ok := classifyCore(root, grid.stepMs); ok {
		return &transpilePlan{
			units: []*transpiledUnit{{core: *unit, name: syntheticName(0), grid: grid}},
			grid:  grid,
			full:  true,
		}, true
	}

	plan := &transpilePlan{grid: grid}
	rewritten := rewrite(root, grid, plan, false)
	if len(plan.units) == 0 {
		return nil, false
	}
	plan.rewritten = rewritten.String()
	return plan, true
}

// rewrite walks top-down replacing maximal transpilable subtrees with synthetic
// vector selectors. nameSensitive marks scopes where an ancestor's semantics
// depend on __name__ (grouping or vector matching on it): synthetic series
// carry a synthetic __name__, so substitution there would change results.
// Fixed-resolution subqueries recurse with the subquery's own grid; scopes
// whose evaluation grid is unknowable (@-pinned, default-resolution
// subqueries) are not entered.
func rewrite(node parser.Expr, grid gridContext, plan *transpilePlan, nameSensitive bool) parser.Expr {
	if node == nil {
		return nil
	}

	if !nameSensitive {
		// Units whose output keeps the real __name__ (bare instant selectors)
		// cannot be substituted: the synthetic name would replace it in the
		// engine's output. They still compile as full plans.
		if unit, ok := classifyCore(node, grid.stepMs); ok && !unit.keepsName() {
			cu := &transpiledUnit{core: *unit, name: syntheticName(len(plan.units)), grid: grid}
			plan.units = append(plan.units, cu)
			return &parser.VectorSelector{
				Name: cu.name,
				LabelMatchers: []*labels.Matcher{
					labels.MustNewMatcher(labels.MatchEqual, metricNameLabel, cu.name),
				},
				PosRange: node.PositionRange(),
			}
		}
	}

	switch n := node.(type) {
	case *parser.ParenExpr:
		n.Expr = rewrite(n.Expr, grid, plan, nameSensitive)
	case *parser.UnaryExpr:
		n.Expr = rewrite(n.Expr, grid, plan, nameSensitive)
	case *parser.AggregateExpr:
		sensitive := nameSensitive || groupingUsesName(n.Grouping)
		n.Expr = rewrite(n.Expr, grid, plan, sensitive)
		// n.Param is a scalar/string; nothing transpilable inside for our core.
	case *parser.Call:
		for i, arg := range n.Args {
			n.Args[i] = rewrite(arg, grid, plan, nameSensitive)
		}
	case *parser.BinaryExpr:
		sensitive := nameSensitive || vectorMatchingUsesName(n.VectorMatching)
		n.LHS = rewrite(n.LHS, grid, plan, sensitive)
		n.RHS = rewrite(n.RHS, grid, plan, sensitive)
	case *parser.SubqueryExpr:
		// The alert-smoothing idiom fn_over_time((expr)[R:S]) dominates real
		// rule fleets; inner units evaluate on the subquery grid, and the
		// engine does the smoothing over the synthetic series. Requires an
		// explicit whole-second resolution (S == 0 needs the engine's
		// default-interval function) and no @ pinning.
		stepMs := n.Step.Milliseconds()
		rangeMs := n.Range.Milliseconds()
		offsetMs := n.OriginalOffset.Milliseconds()
		if n.Timestamp == nil && n.StartOrEnd == 0 &&
			stepMs > 0 && stepMs%1000 == 0 && rangeMs%1000 == 0 && offsetMs >= 0 {
			inner := subqueryGrid(grid, rangeMs, stepMs, offsetMs)
			n.Expr = rewrite(n.Expr, inner, plan, nameSensitive)
		}
	case *parser.StepInvariantExpr, *parser.MatrixSelector,
		*parser.VectorSelector, *parser.NumberLiteral, *parser.StringLiteral:
		// Leaves, or scopes substitution must not enter.
	}
	return node
}

func groupingUsesName(grouping []string) bool {
	for _, g := range grouping {
		if g == metricNameLabel {
			return true
		}
	}
	return false
}

func vectorMatchingUsesName(vm *parser.VectorMatching) bool {
	if vm == nil {
		return false
	}
	for _, l := range append(append([]string{}, vm.MatchingLabels...), vm.Include...) {
		if l == metricNameLabel {
			return true
		}
	}
	// Default (all-labels) matching ignores __name__, and by()/ignoring()
	// lists were checked above.
	return false
}

// isSyntheticSelector reports whether matchers target a compiled unit.
func isSyntheticSelector(matchers []*labels.Matcher) (string, bool) {
	for _, m := range matchers {
		if m.Name == metricNameLabel && m.Type == labels.MatchEqual && strings.HasPrefix(m.Value, syntheticNamePrefix) {
			return m.Value, true
		}
	}
	return "", false
}
