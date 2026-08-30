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

type executor struct {
	client *client
	engine *prometheus.Engine
	parser prometheus.Parser
}

// maxWindowBuckets caps range/step for the windowed *_over_time form.
// Every grid slot combines that many bucket partials. The fleet's windows
// sit well under the cap ([1m]..[17m] at 30-60s steps). Anything larger is
// a long-range query whose step a dashboard scales up anyway. The engine
// path serves the rest.
const maxWindowBuckets = 64

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

	// timeSeriesLastToGrid widens its window to max(window, step). We
	// probed this: a sample aged (window, step] still fills the slot. The
	// rate/delta family enforces the window strictly. The Last-style kinds
	// used to fall back when window < step because of that widening. The
	// window-sliver filter (see samplesConditions) makes the widening
	// harmless there: samples exist only inside (t_k - window, t_k]
	// slivers, so the widened window intersected with the data IS the
	// lookback window. If a future ClickHouse stops widening, the
	// unwidened window is the sliver too. Correct either way. A
	// non-positive window still falls back: the sliver argument needs a
	// real window to filter to.
	//
	// The windowed *_over_time form gates only the range >= step regime.
	// It decomposes the window into whole step buckets (see windowedInner).
	// That is exact only when the range is a multiple of the step. The
	// per-slot slide costs range/step bucket combines; maxWindowBuckets
	// bounds it, so a long-range short-step query cannot turn the slide
	// into the bottleneck. range < step needs neither gate: the windows
	// are disjoint slivers, aggregated one slot each, with no slide. Every
	// miss falls back to the engine path, which is exact.
	for _, unit := range plan.units {
		stepMs := unit.grid.stepMs
		if stepMs == 0 {
			stepMs = 1000
		}
		switch {
		case unit.core.kind == unitInstant || (unit.core.kind == unitOverTime && unit.core.overFn == "last"):
			windowMs := unit.core.rangeMs
			if unit.core.kind == unitInstant {
				windowMs = e.client.lookbackMs
			}
			if windowMs <= 0 {
				return nil, false, nil
			}
		case unit.core.kind == unitOverTime:
			if unit.core.rangeMs < unit.grid.stepMs {
				// Disjoint slivers: no divisibility or width requirement.
				continue
			}
			if unit.core.rangeMs%stepMs != 0 || unit.core.rangeMs/stepMs > maxWindowBuckets {
				return nil, false, nil
			}
		}
	}

	// Evaluate every unit concurrently on its own grid (the query grid, or a
	// subquery grid); each is one grid query (see executeUnit for when a
	// series lookup precedes it). The units share one grid-cell budget:
	// transpiled results never pass through the engine's sample limiter, so
	// without it a large series-count x grid-width query would buffer
	// unbounded arrays — the OOM this provider exists to prevent.
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

// A step of 0 is an instant query: a single evaluation at end, whatever
// start was.
func queryGrid(start, end time.Time, step time.Duration) gridContext {
	startMs, endMs, stepMs := start.UnixMilli(), end.UnixMilli(), step.Milliseconds()
	if stepMs == 0 {
		startMs = endMs
	}
	return gridContext{startMs: startMs, endMs: endMs, stepMs: stepMs}
}

// transpiledSeries holds one value pointer per grid point; nil is absent.
type transpiledSeries struct {
	lset   labels.Labels
	values []*float64
}

func (e *executor) executeUnit(ctx context.Context, unit *coreUnit, grid gridContext, gridCells *atomic.Int64) ([]transpiledSeries, error) {
	startMs, endMs, stepMs := grid.startMs, grid.endMs, grid.stepMs
	windowMs := unit.rangeMs
	if unit.kind == unitInstant {
		windowMs = e.client.lookbackMs
	}
	dataStart := startMs - unit.offsetMs - windowMs
	dataEnd := endMs - unit.offsetMs

	// The group-key join resolves the matchers on its own, so the unit
	// statement only needs concrete metric names for the samples
	// primary-key prefix. A selector without a static __name__ learns them
	// through the series lookup; every other selector skips the roundtrip.
	metricNames := metricNamesFromMatchers(unit.matchers)
	if metricNames == nil {
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
		metricNames = lookup.metricNames
	}

	query, args, err := buildUnitSQL(unit, metricNames, dataStart, dataEnd, startMs, endMs, stepMs, e.client.lookbackMs)
	if err != nil {
		return nil, err
	}

	rows, err := e.client.telemetryStore.ClickhouseDB().Query(e.client.withContext(ctx, "transpiledUnit"), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Name-dropping units keep __name__ in the SQL group key, so distinct
	// metrics never merge server-side. The name comes off here. Two
	// metrics can then share a labelset. The engine merges their samples
	// into one series when they never overlap in time. It raises the
	// duplicate-labelset error only when two samples land on the same
	// evaluation timestamp. mergeSameLabelsetSeries reproduces exactly
	// that.
	stripName := !unit.hasAgg && !unit.keepsName()

	// by (...) units return one plain column per grouped label. Everything
	// else returns the single canonical JSON key (see groupKeyColumns).
	keyNames := groupKeyColumns(unit)
	keyVals := make([]string, max(len(keyNames), 1))
	targets := make([]any, 0, len(keyVals)+1)
	for i := range keyVals {
		targets = append(targets, &keyVals[i])
	}
	var gridValues []*float64
	targets = append(targets, &gridValues)

	var out []transpiledSeries
	for rows.Next() {
		if err := rows.Scan(targets...); err != nil {
			return nil, err
		}
		// One row buffers one grid array; series count times grid width is
		// the transpiled equivalent of fetched samples. Counted per row as
		// the arrays accumulate: without a series lookup there is no series
		// count to charge up front.
		if maxSamples := e.client.cfg.MaxFetchedSamples; maxSamples > 0 && gridCells.Add(int64(len(gridValues))) > maxSamples {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"promql query would buffer more than %d output points; narrow the selector or time range, or raise prometheus::clickhousev2::max_fetched_samples",
				maxSamples,
			)
		}
		var lset labels.Labels
		if keyNames != nil {
			builder := labels.NewScratchBuilder(len(keyNames))
			for i, name := range keyNames {
				// An empty extracted value is the label being absent.
				if keyVals[i] != "" {
					builder.Add(name, keyVals[i])
				}
			}
			builder.Sort()
			lset = builder.Labels()
		} else {
			lset, err = labelsFromGroupKey(keyVals[0])
			if err != nil {
				return nil, err
			}
		}
		if stripName {
			lset = labels.NewBuilder(lset).Del(metricNameLabel).Labels()
		}
		values := make([]*float64, len(gridValues))
		copy(values, gridValues)
		applyScalarOps(unit.ops, values)
		out = append(out, transpiledSeries{lset: lset, values: values})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if stripName {
		if out, err = mergeSameLabelsetSeries(out); err != nil {
			return nil, err
		}
	}
	sort.Slice(out, func(i, j int) bool { return labels.Compare(out[i].lset, out[j].lset) < 0 })
	return out, nil
}

// mergeSameLabelsetSeries combines series that a name strip left with
// identical labelsets, slot by slot. The engine assembles its result matrix
// by labelset. Post-strip twins whose points interleave in time are one
// series to it. Two values on the same evaluation timestamp are its
// duplicate-labelset error. v1 errors there too, so to silently pick one
// value would be a divergence.
func mergeSameLabelsetSeries(in []transpiledSeries) ([]transpiledSeries, error) {
	index := make(map[uint64]int, len(in))
	out := in[:0]
	for _, s := range in {
		hash := s.lset.Hash()
		idx, ok := index[hash]
		if ok && labels.Equal(out[idx].lset, s.lset) {
			dst := out[idx].values
			for k, v := range s.values {
				if v == nil {
					continue
				}
				if dst[k] != nil {
					return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "vector cannot contain metrics with the same labelset")
				}
				dst[k] = v
			}
			continue
		}
		index[hash] = len(out)
		out = append(out, s)
	}
	return out, nil
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
// series. It evaluates the rewritten query over a storage that serves
// synthetic selectors from memory and everything else from the live
// querier. Absent grid points become stale markers, so the engine's
// lookback cannot resurrect the previous grid point. Each unit's synthetic
// samples sit on its own grid: the query grid, or the subquery grid for
// units inside subqueries.
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
	// The strip can leave twins: two units' outputs that only their
	// synthetic names told apart (e.g. -metric_a or -metric_b, both {}
	// once real names are dropped). The engine assembles its matrix by
	// labelset. It merges such temporally-disjoint elements into one
	// series. Reproduce that, with its duplicate error on same-timestamp
	// overlap.
	out, err = mergeMatrixByLabelset(out)
	if err != nil {
		return nil, err
	}
	sort.Slice(out, func(i, j int) bool { return labels.Compare(out[i].Metric, out[j].Metric) < 0 })
	return out, nil
}

// mergeMatrixByLabelset merges series that share a labelset. It interleaves
// their points in timestamp order. A timestamp present in both is the
// engine's duplicate-labelset error.
func mergeMatrixByLabelset(matrix promql.Matrix) (promql.Matrix, error) {
	index := make(map[uint64]int, len(matrix))
	out := matrix[:0]
	for _, s := range matrix {
		hash := s.Metric.Hash()
		idx, ok := index[hash]
		if ok && labels.Equal(out[idx].Metric, s.Metric) {
			merged := make([]promql.FPoint, 0, len(out[idx].Floats)+len(s.Floats))
			a, b := out[idx].Floats, s.Floats
			for len(a) > 0 && len(b) > 0 {
				switch {
				case a[0].T < b[0].T:
					merged, a = append(merged, a[0]), a[1:]
				case b[0].T < a[0].T:
					merged, b = append(merged, b[0]), b[1:]
				default:
					return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "vector cannot contain metrics with the same labelset")
				}
			}
			out[idx].Floats = append(append(merged, a...), b...)
			continue
		}
		index[hash] = len(out)
		out = append(out, s)
	}
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
