package clickhouseprometheusv2

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"sync/atomic"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/model/labels"
	promValue "github.com/prometheus/prometheus/model/value"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/storage"
	"golang.org/x/sync/errgroup"
)

// executor evaluates transpilable PromQL directly in ClickHouse, falling
// back (ok=false) whenever the query shape or the step doesn't qualify. The
// timeSeries*ToGrid functions it builds on are assumed available: the
// supported ClickHouse floor is >= 25.6.
type executor struct {
	client *client
	engine *prometheus.Engine
	parser prometheus.Parser
}

// TryExecuteRange transpiles and runs the query in ClickHouse when its shape
// is in the allowlist. ok=false means "not transpilable" and carries no
// error; the caller runs the engine path.
func (e *executor) TryExecuteRange(ctx context.Context, qs string, start, end time.Time, step time.Duration) (promql.Matrix, bool, error) {
	expr, err := e.parser.ParseExpr(qs)
	if err != nil {
		// Let the engine path produce the (enhanced) parse error.
		return nil, false, nil
	}

	plan, ok := classify(expr, queryGrid(start, end, step))
	if !ok {
		return nil, false, nil
	}

	// timeSeriesLastToGrid widens its window to max(window, step) — probed: a
	// sample aged (window, step] still fills the slot — while the rate/delta
	// family enforces the window strictly. The Last-style kinds therefore
	// transpile only when their window covers the step; otherwise the engine
	// path serves them exactly.
	for _, unit := range plan.units {
		lastStyle := unit.core.kind == unitInstant || (unit.core.kind == unitOverTime && unit.core.overFn == "last")
		if !lastStyle {
			continue
		}
		windowMs := unit.core.rangeMs
		if unit.core.kind == unitInstant {
			windowMs = e.client.lookbackMs
		}
		if windowMs < unit.grid.stepMs {
			return nil, false, nil
		}
	}

	// Evaluate every unit concurrently on its own grid (the query grid, or a
	// subquery grid); each is one series lookup plus one grid query. The
	// units share one grid-cell budget: transpiled results never pass
	// through the engine's sample limiter, so without this a large
	// series-count x grid-width query would buffer unbounded arrays — the
	// OOM this provider exists to prevent.
	results := make([][]transpiledSeries, len(plan.units))
	var gridCells atomic.Int64
	eg, egCtx := errgroup.WithContext(ctx)
	for i, unit := range plan.units {
		eg.Go(func() error {
			res, err := e.executeUnit(egCtx, &unit.core, unit.grid, &gridCells)
			if err != nil {
				return err
			}
			results[i] = res
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return nil, true, err
	}

	if plan.full {
		g := plan.units[0].grid
		return toMatrix(results[0], g.startMs, g.stepMs), true, nil
	}

	matrix, err := e.executeHybrid(ctx, plan, results)
	if err != nil {
		return nil, true, err
	}
	return matrix, true, nil
}

// queryGrid derives the top-level evaluation grid; step 0 is an instant
// query: a single evaluation at end, whatever start was.
func queryGrid(start, end time.Time, step time.Duration) gridContext {
	startMs, endMs, stepMs := start.UnixMilli(), end.UnixMilli(), step.Milliseconds()
	if stepMs == 0 {
		startMs = endMs
	}
	return gridContext{startMs: startMs, endMs: endMs, stepMs: stepMs}
}

// transpiledSeries is one output series of a unit: projected labels and one
// value pointer per grid point (nil = absent).
type transpiledSeries struct {
	lset   labels.Labels
	values []*float64
}

// executeUnit runs one core unit on its grid: series lookup (budgets,
// fingerprints, metric names), then the single grid query, then the
// scalar-op pipeline.
func (e *executor) executeUnit(ctx context.Context, unit *coreUnit, grid gridContext, gridCells *atomic.Int64) ([]transpiledSeries, error) {
	startMs, endMs, stepMs := grid.startMs, grid.endMs, grid.stepMs
	windowMs := unit.rangeMs
	if unit.kind == unitInstant {
		windowMs = e.client.lookbackMs
	}
	dataStart := startMs - unit.offsetMs - windowMs
	dataEnd := endMs - unit.offsetMs

	seriesQuery, seriesArgs, err := buildSeriesQuery(dataStart, dataEnd, unit.matchers)
	if err != nil {
		return nil, err
	}
	lookup, err := e.client.selectSeries(ctx, seriesQuery, seriesArgs)
	if err != nil {
		return nil, err
	}
	if len(lookup.fingerprints) == 0 {
		return nil, nil
	}

	// The result buffers one grid array per series; series count times grid
	// width is the transpiled equivalent of fetched samples, counted before
	// the arrays exist rather than after the memory is spent.
	gridLen := int64(1)
	if stepMs > 0 {
		gridLen = (endMs-startMs)/stepMs + 1
	}
	if maxSamples := e.client.cfg.MaxFetchedSamples; maxSamples > 0 && gridCells.Add(int64(len(lookup.fingerprints))*gridLen) > maxSamples {
		return nil, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"promql query would buffer more than %d output points; narrow the selector or time range, or raise prometheus::clickhousev2::max_fetched_samples",
			maxSamples,
		)
	}

	query, args, err := buildUnitSQL(unit, lookup.metricNames, transpiledFingerprintFilter(lookup), dataStart, dataEnd, startMs, endMs, stepMs, e.client.lookbackMs)
	if err != nil {
		return nil, err
	}

	rows, err := e.client.telemetryStore.ClickhouseDB().Query(e.client.withContext(ctx, "transpiledUnit"), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Name-dropping units keep __name__ in the SQL group key so distinct
	// metrics never merge server-side; the name comes off here, and a
	// post-strip collision is the engine's duplicate-labelset error — v1
	// would have errored, so silently inventing a merged series would be a
	// divergence.
	stripName := !unit.hasAgg && !unit.keepsName()
	seen := make(map[uint64]string)

	var out []transpiledSeries
	var gkey string
	var gridValues []*float64
	for rows.Next() {
		if err := rows.Scan(&gkey, &gridValues); err != nil {
			return nil, err
		}
		lset, err := labelsFromGroupKey(gkey)
		if err != nil {
			return nil, err
		}
		if stripName {
			name := lset.Get(metricNameLabel)
			lset = labels.NewBuilder(lset).Del(metricNameLabel).Labels()
			if prev, ok := seen[lset.Hash()]; ok && prev != name {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "vector cannot contain metrics with the same labelset")
			}
			seen[lset.Hash()] = name
		}
		values := make([]*float64, len(gridValues))
		copy(values, gridValues)
		applyScalarOps(unit.ops, values)
		out = append(out, transpiledSeries{lset: lset, values: values})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	sort.Slice(out, func(i, j int) bool { return labels.Compare(out[i].lset, out[j].lset) < 0 })
	return out, nil
}

// transpiledFingerprintFilter returns the matched fingerprints as a sorted
// slice when they fit the inline limit — literals engage the samples primary
// key, and sorting keeps the statement deterministic for logging and tests.
// Over the limit it returns nil: the unit query's INNER JOIN against the
// local series subquery restricts to exactly the matched fingerprints
// already, and a semi-join on the same predicates would only rescan the
// series table.
func transpiledFingerprintFilter(lookup *seriesLookup) []uint64 {
	if len(lookup.fingerprints) > inlineFingerprintsLimit {
		return nil
	}
	fingerprints := make([]uint64, 0, len(lookup.fingerprints))
	for fp := range lookup.fingerprints {
		fingerprints = append(fingerprints, fp)
	}
	sort.Slice(fingerprints, func(i, j int) bool { return fingerprints[i] < fingerprints[j] })
	return fingerprints
}

// labelsFromGroupKey parses the toJSONString'd sorted [key, value] pairs.
func labelsFromGroupKey(gkey string) (labels.Labels, error) {
	var pairs [][]string
	if err := json.Unmarshal([]byte(gkey), &pairs); err != nil {
		return labels.EmptyLabels(), errors.WrapInternalf(err, errors.CodeInternal, "malformed compiled group key %q", gkey)
	}
	builder := labels.NewScratchBuilder(len(pairs))
	for _, p := range pairs {
		if len(p) != 2 {
			return labels.EmptyLabels(), errors.NewInternalf(errors.CodeInternal, "malformed compiled group key pair %q", gkey)
		}
		builder.Add(p[0], p[1])
	}
	builder.Sort()
	return builder.Labels(), nil
}

// applyScalarOps applies the number-literal op pipeline in place, with the
// same float64 arithmetic and comparison-filter semantics as the engine.
func applyScalarOps(ops []scalarOp, values []*float64) {
	for _, op := range ops {
		for i, v := range values {
			if v == nil {
				continue
			}
			lhs, rhs := *v, op.scalar
			if op.scalarOnLeft {
				lhs, rhs = op.scalar, *v
			}
			switch op.op {
			case parser.ADD:
				res := lhs + rhs
				values[i] = &res
			case parser.SUB:
				res := lhs - rhs
				values[i] = &res
			case parser.MUL:
				res := lhs * rhs
				values[i] = &res
			case parser.DIV:
				res := lhs / rhs
				values[i] = &res
			case parser.MOD:
				res := math.Mod(lhs, rhs)
				values[i] = &res
			case parser.POW:
				res := math.Pow(lhs, rhs)
				values[i] = &res
			default:
				keep := compare(op.op, lhs, rhs)
				switch {
				case op.returnBool:
					res := 0.0
					if keep {
						res = 1.0
					}
					values[i] = &res
				case keep:
					// Filter comparisons keep the vector-side value.
					vec := *v
					values[i] = &vec
				default:
					values[i] = nil
				}
			}
		}
	}
}

func compare(op parser.ItemType, lhs, rhs float64) bool {
	switch op {
	case parser.EQLC:
		return lhs == rhs
	case parser.NEQ:
		return lhs != rhs
	case parser.GTR:
		return lhs > rhs
	case parser.LSS:
		return lhs < rhs
	case parser.GTE:
		return lhs >= rhs
	case parser.LTE:
		return lhs <= rhs
	}
	return false
}

// toMatrix converts a unit result to a promql matrix on the query grid.
func toMatrix(series []transpiledSeries, startMs, stepMs int64) promql.Matrix {
	matrix := make(promql.Matrix, 0, len(series))
	for _, s := range series {
		var floats []promql.FPoint
		for i, v := range s.values {
			if v == nil {
				continue
			}
			floats = append(floats, promql.FPoint{T: startMs + int64(i)*stepMs, F: *v})
		}
		if len(floats) == 0 {
			continue
		}
		matrix = append(matrix, promql.Series{Metric: s.lset, Floats: floats})
	}
	return matrix
}

// executeHybrid substitutes each unit's grids into the engine as synthetic
// series and evaluates the rewritten query over a storage that serves
// synthetic selectors from memory and everything else from the live querier.
// Absent grid points become stale markers so the engine's lookback cannot
// resurrect the previous grid point. Each unit's synthetic samples sit on its
// own grid (query grid, or subquery grid for units inside subqueries).
func (e *executor) executeHybrid(ctx context.Context, plan *transpilePlan, results [][]transpiledSeries) (promql.Matrix, error) {
	synthetic := make(map[string][]*series, len(plan.units))
	staleMarker := math.Float64frombits(promValue.StaleNaN)

	queryGrid := plan.grid

	for i, unit := range plan.units {
		g := unit.grid
		gridLen := 1
		if g.stepMs > 0 {
			gridLen = int((g.endMs-g.startMs)/g.stepMs) + 1
		}
		list := make([]*series, 0, len(results[i]))
		for _, cs := range results[i] {
			builder := labels.NewBuilder(cs.lset)
			builder.Set(metricNameLabel, unit.name)
			s := &series{lset: builder.Labels()}
			s.ts = make([]int64, 0, gridLen)
			s.vs = make([]float64, 0, gridLen)
			for idx := 0; idx < gridLen; idx++ {
				t := g.startMs + int64(idx)*g.stepMs
				var v float64
				if idx < len(cs.values) && cs.values[idx] != nil {
					v = *cs.values[idx]
				} else {
					v = staleMarker
				}
				s.ts = append(s.ts, t)
				s.vs = append(s.vs, v)
			}
			list = append(list, s)
		}
		synthetic[unit.name] = list
	}

	hybrid := &hybridQueryable{client: e.client, synthetic: synthetic}

	var qry promql.Query
	var err error
	if queryGrid.stepMs == 0 {
		qry, err = e.engine.NewInstantQuery(ctx, hybrid, nil, plan.rewritten, time.UnixMilli(queryGrid.endMs))
	} else {
		qry, err = e.engine.NewRangeQuery(ctx, hybrid, nil, plan.rewritten, time.UnixMilli(queryGrid.startMs), time.UnixMilli(queryGrid.endMs), time.Duration(queryGrid.stepMs)*time.Millisecond)
	}
	if err != nil {
		return nil, err
	}
	defer qry.Close()

	res := qry.Exec(ctx)
	if res.Err != nil {
		return nil, res.Err
	}

	matrix, err := resultToMatrix(res)
	if err != nil {
		return nil, err
	}

	// Deep-copy before Close returns the result's slices to the engine pool,
	// and drop the synthetic __name__ that filter comparisons preserve.
	out := make(promql.Matrix, 0, len(matrix))
	for _, s := range matrix {
		lset := s.Metric
		if name := lset.Get(metricNameLabel); len(name) >= len(syntheticNamePrefix) && name[:len(syntheticNamePrefix)] == syntheticNamePrefix {
			builder := labels.NewBuilder(lset)
			builder.Del(metricNameLabel)
			lset = builder.Labels()
		}
		floats := make([]promql.FPoint, len(s.Floats))
		copy(floats, s.Floats)
		out = append(out, promql.Series{Metric: lset.Copy(), Floats: floats})
	}
	sort.Slice(out, func(i, j int) bool { return labels.Compare(out[i].Metric, out[j].Metric) < 0 })
	return out, nil
}

func resultToMatrix(res *promql.Result) (promql.Matrix, error) {
	switch v := res.Value.(type) {
	case promql.Matrix:
		return v, nil
	case promql.Vector:
		matrix := make(promql.Matrix, 0, len(v))
		for _, s := range v {
			matrix = append(matrix, promql.Series{Metric: s.Metric, Floats: []promql.FPoint{{T: s.T, F: s.F}}})
		}
		return matrix, nil
	case promql.Scalar:
		return promql.Matrix{{Metric: labels.EmptyLabels(), Floats: []promql.FPoint{{T: v.T, F: v.V}}}}, nil
	default:
		return nil, errors.NewInternalf(errors.CodeInternal, "unexpected hybrid result type %T", res.Value)
	}
}

// hybridQueryable serves synthetic (compiled) selectors from memory and
// everything else from the live storage.
type hybridQueryable struct {
	client    *client
	synthetic map[string][]*series
}

func (h *hybridQueryable) Querier(mint, maxt int64) (storage.Querier, error) {
	return &hybridQuerier{
		querier:   querier{mint: mint, maxt: maxt, client: h.client},
		synthetic: h.synthetic,
	}, nil
}

type hybridQuerier struct {
	querier
	synthetic map[string][]*series
}

func (h *hybridQuerier) Select(ctx context.Context, sortSeries bool, hints *storage.SelectHints, matchers ...*labels.Matcher) storage.SeriesSet {
	if name, ok := isSyntheticSelector(matchers); ok {
		list := h.synthetic[name]
		if sortSeries {
			sorted := make([]*series, len(list))
			copy(sorted, list)
			sort.Slice(sorted, func(i, j int) bool { return labels.Compare(sorted[i].lset, sorted[j].lset) < 0 })
			list = sorted
		}
		return newSeriesSet(list)
	}
	return h.querier.Select(ctx, sortSeries, hints, matchers...)
}
