// SigNoz corpus policy: which upstream cases are representable through the
// API, the grid variants that steer coarse-step code paths, the API's value
// rounding, and the frozen JSON model. Nothing in this file mirrors
// upstream code; it encodes what our conformance harness needs.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/model/value"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/tsdb/chunkenc"
	"github.com/prometheus/prometheus/util/almost"
	"github.com/prometheus/prometheus/util/teststorage"
)

// seriesDescParser is the slice of parser.Parser the loader needs.
type seriesDescParser interface {
	ParseSeriesDesc(input string) (labels.Labels, []parser.SequenceValue, error)
}

// Calendar and wall-clock functions are not invariant under time
// translation, and the Python suite shifts every case to recent timestamps
// (epoch-0 samples would sit 55 years past ClickHouse TTLs). Everything else
// PromQL computes depends only on time differences.
var timeDependentFuncs = map[string]bool{
	"time": true, "timestamp": true, "month": true, "year": true,
	"minute": true, "hour": true, "day_of_month": true, "day_of_week": true,
	"day_of_year": true, "days_in_month": true,
}

const (
	lookbackMs    = 300_000
	instantStepMs = 1_000
	maxSamples    = 50_000_000
)

type corpusSeries struct {
	Labels  map[string]string `json:"labels"`
	Samples [][2]any          `json:"samples"` // [offset_ms, value]
}

type corpusDataset struct {
	ID     int            `json:"id"`
	Source string         `json:"source"`
	Series []corpusSeries `json:"series"`
}

type corpusPoint = [2]any // [offset_ms, value]

type corpusResult struct {
	Labels map[string]string `json:"labels"`
	Points []corpusPoint     `json:"points"`
}

type corpusCase struct {
	Dataset  int            `json:"dataset"`
	Source   string         `json:"source"`
	Variant  string         `json:"variant"`
	Expr     string         `json:"expr"`
	StartMs  int64          `json:"start_ms"`
	EndMs    int64          `json:"end_ms"`
	StepMs   int64          `json:"step_ms"`
	Instant  bool           `json:"instant"`
	Expected []corpusResult `json:"expected"`
}

type corpus struct {
	Meta struct {
		PrometheusVersion string `json:"prometheus_version"`
		LookbackMs        int64  `json:"lookback_ms"`
		InstantStepMs     int64  `json:"instant_step_ms"`
		Note              string `json:"note"`
	} `json:"meta"`
	Datasets []corpusDataset `json:"datasets"`
	Cases    []corpusCase    `json:"cases"`
}

func generate(files []string, engine *promql.Engine, seriesParser parser.Parser, exprParser parser.Parser, promVersion string) (*corpus, map[string]int, error) {
	var c corpus
	c.Meta.PrometheusVersion = promVersion
	c.Meta.LookbackMs = lookbackMs
	c.Meta.InstantStepMs = instantStepMs
	c.Meta.Note = "expected values carry the API's 3-significant-decimal rounding (querybuildertypesv5 sanitizeValue); instant evals are encoded as start==end range queries"

	skips := map[string]int{}
	datasetIDs := map[string]int{}

	for _, file := range files {
		base := filepath.Base(file)
		if base == "native_histograms.test" || base == "type_and_unit.test" {
			// native histograms: the samples pipeline under test stores
			// floats; type_and_unit: experimental __type__/__unit__ metadata
			// labels our store does not materialize.
			skips["file:"+strings.TrimSuffix(base, ".test")]++
			continue
		}
		raw, err := os.ReadFile(file)
		if err != nil {
			return nil, nil, err
		}
		cmds := parseScript(string(raw))

		segment := 0
		var loads []command
		segmentBad := "" // non-empty: reason the segment cannot be represented
		for _, cmd := range cmds {
			switch cmd.kind {
			case "clear":
				segment++
				loads = nil
				segmentBad = ""
			case "skip":
				skips["command:"+cmd.head]++
			case "load":
				if reason := checkLoad(seriesParser, cmd); reason != "" {
					segmentBad = reason
					skips["load:"+reason]++
					continue
				}
				loads = append(loads, cmd)
			case "eval":
				if segmentBad != "" {
					skips["segment:"+segmentBad]++
					continue
				}
				if len(loads) == 0 {
					skips["eval:no-data"]++
					continue
				}
				ccs, reason, err := buildCases(engine, seriesParser, exprParser, cmd, loads, base, skips)
				if err != nil {
					return nil, nil, err
				}
				if reason != "" {
					skips["eval:"+reason]++
					continue
				}
				key := fmt.Sprintf("%s#%d#%d", base, segment, len(loads))
				id, ok := datasetIDs[key]
				if !ok {
					ds, reason, err := dumpDataset(seriesParser, loads)
					if err != nil {
						return nil, nil, err
					}
					if reason != "" {
						skips["dataset:"+reason]++
						continue
					}
					id = len(c.Datasets)
					datasetIDs[key] = id
					ds.ID = id
					ds.Source = key
					c.Datasets = append(c.Datasets, *ds)
				}
				for _, cc := range ccs {
					cc.Dataset = id
					cc.Source = fmt.Sprintf("%s:%d", base, cmd.line)
					c.Cases = append(c.Cases, cc)
				}
			}
		}
	}
	if len(c.Cases) == 0 {
		return nil, nil, fmt.Errorf("no corpus cases produced")
	}
	return &c, skips, nil
}

func writeCorpus(out string, c *corpus) error {
	buf, err := json.MarshalIndent(c, "", " ")
	if err != nil {
		return err
	}
	return os.WriteFile(out, buf, 0o644)
}

// checkLoad validates a load block is representable: parsable series
// notation, float samples only ("load_with_nhcb" and histogram literals are
// out of scope — the samples pipeline under test stores float samples).
func checkLoad(p parser.Parser, cmd command) string {
	fields := strings.Fields(cmd.head)
	if len(fields) != 2 || fields[0] != "load" {
		return "unsupported-load-variant"
	}
	if _, err := model.ParseDuration(fields[1]); err != nil {
		return "bad-interval"
	}
	for _, line := range cmd.body {
		metric, vals, err := p.ParseSeriesDesc(line)
		if err != nil {
			return "unparsable-series"
		}
		if metric.Get(model.MetricNameLabel) == "" {
			return "unnamed-series"
		}
		for _, v := range vals {
			if v.Histogram != nil {
				return "histogram-samples"
			}
		}
	}
	return ""
}

// durationExprUsesRange reports whether a duration-expression tree contains
// range(). Instant evals are encoded as one-step range queries (the API
// rejects start == end), which changes what range() evaluates to, so they
// cannot carry it; range evals keep it — each variant's oracle is computed
// on the exact window it requests.
func durationExprUsesRange(e parser.Expr) bool {
	d, ok := e.(*parser.DurationExpr)
	if !ok || d == nil {
		return false
	}
	if d.Op == parser.RANGE {
		return true
	}
	return durationExprUsesRange(d.LHS) || durationExprUsesRange(d.RHS)
}

// buildCases parses one eval header, filters unservable expressions, and
// emits the base case plus grid variants — each with expectations computed by
// the reference engine over the loads. The variants exist because upstream's
// own grids are fine-stepped: without them the coarse-step code paths (the
// window-sliver filter, the disjoint over_time form, the lifted instant/last
// gates) would pass through this corpus untouched. A variant is just another
// grid over the same data and expression; the engine is the oracle either way.
func buildCases(engine *promql.Engine, seriesParser parser.Parser, exprParser parser.Parser, cmd command, loads []command, sourceFile string, skips map[string]int) ([]corpusCase, string, error) {
	for _, line := range cmd.body {
		if patExpect.MatchString(line) && strings.HasPrefix(line, "expect fail") {
			return nil, "expect-fail", nil
		}
	}

	base := corpusCase{Variant: "base"}
	if m := patEvalInstant.FindStringSubmatch(cmd.head); m != nil {
		at, err := parseTestDuration(m[2])
		if err != nil {
			return nil, "bad-duration", nil
		}
		base.Instant = true
		base.StartMs, base.EndMs, base.StepMs = at, at, instantStepMs
		base.Expr = m[3]
	} else if m := patEvalRange.FindStringSubmatch(cmd.head); m != nil {
		from, err1 := parseTestDuration(m[2])
		to, err2 := parseTestDuration(m[3])
		step, err3 := parseTestDuration(m[4])
		if err1 != nil || err2 != nil || err3 != nil {
			return nil, "bad-duration", nil
		}
		if step <= 0 || to < from {
			return nil, "bad-grid", nil
		}
		base.StartMs, base.EndMs, base.StepMs = from, to, step
		base.Expr = m[5]
	} else {
		return nil, "unrecognized", nil
	}

	expr, err := exprParser.ParseExpr(base.Expr)
	if err != nil {
		return nil, "needs-experimental-parser", nil
	}
	if vt := expr.Type(); vt != parser.ValueTypeVector && vt != parser.ValueTypeScalar {
		return nil, "non-instant-type", nil
	}
	unservable := ""
	hasSelector := false
	hasSubquery := false
	var maxRangeMs int64
	parser.Inspect(expr, func(node parser.Node, _ []parser.Node) error {
		switch n := node.(type) {
		case *parser.Call:
			if timeDependentFuncs[n.Func.Name] {
				unservable = "time-dependent"
			}
		case *parser.VectorSelector:
			hasSelector = true
			if n.Timestamp != nil || n.StartOrEnd != 0 {
				unservable = "at-modifier"
			}
			if n.OriginalOffset < 0 {
				// The server ships with negative offsets disabled.
				unservable = "negative-offset"
			}
			if base.Instant && durationExprUsesRange(n.OriginalOffsetExpr) {
				unservable = "range-duration-in-instant"
			}
			for _, m := range n.LabelMatchers {
				if m.Name == "__type__" || m.Name == "__unit__" {
					unservable = "type-unit-metadata"
				}
			}
		case *parser.MatrixSelector:
			if r := n.Range.Milliseconds(); r > maxRangeMs {
				maxRangeMs = r
			}
			if base.Instant && durationExprUsesRange(n.RangeExpr) {
				unservable = "range-duration-in-instant"
			}
		case *parser.SubqueryExpr:
			hasSubquery = true
			if n.Timestamp != nil || n.StartOrEnd != 0 {
				unservable = "at-modifier"
			}
			if n.OriginalOffset < 0 {
				unservable = "negative-offset"
			}
			if base.Instant && (durationExprUsesRange(n.RangeExpr) || durationExprUsesRange(n.StepExpr) || durationExprUsesRange(n.OriginalOffsetExpr)) {
				unservable = "range-duration-in-instant"
			}
		}
		return nil
	})
	if unservable != "" {
		return nil, unservable, nil
	}

	stor, err := loadSeriesStorage(seriesParser, loads)
	if err != nil {
		return nil, "", err
	}
	defer func() { _ = stor.Close() }()

	expected, reason := computeExpected(engine, stor, base.Expr, base.StartMs, base.EndMs, base.StepMs)
	if reason != "" {
		return nil, reason, nil
	}
	if err := crossCheckUpstream(engine, seriesParser, stor, cmd, base, sourceFile, skips); err != nil {
		return nil, "", err
	}
	base.Expected = expected
	out := []corpusCase{base}

	// Grid variants. Subquery expressions keep their own inner grids; varying
	// the outer grid there multiplies cases without steering the code paths
	// the variants exist for, so they emit only the base.
	if hasSubquery || !hasSelector {
		return out, "", nil
	}
	type variant struct {
		name                   string
		startMs, endMs, stepMs int64
	}
	var variants []variant
	if base.Instant {
		// A coarse multi-point grid ending at the instant: step above the
		// 5m lookback drives the lifted instant gate and the sliver filter.
		const coarse = 600_000
		variants = append(variants, variant{"instant-coarse", base.EndMs - 2*coarse, base.EndMs, coarse})
	} else {
		span := base.EndMs - base.StartMs
		if maxRangeMs > 0 {
			// Step wider than every window in the expression: the sliver
			// filter and the disjoint over_time form become active.
			if coarse := 2 * maxRangeMs; span >= coarse {
				variants = append(variants, variant{"coarse-step", base.StartMs, base.EndMs, coarse})
			}
			// Whole-bucket tiling (range == 2 steps) drives the windowed
			// over_time slide with W = 2.
			if tiled := maxRangeMs / 2; tiled >= 1000 && maxRangeMs%2000 == 0 && tiled != base.StepMs && span >= tiled {
				variants = append(variants, variant{"tiled", base.StartMs, base.EndMs, tiled})
			}
		}
		// A start off every natural alignment shifts which samples each
		// window sees; an end short of the lattice exercises the
		// last-grid-point handling.
		if span > 17_000 {
			variants = append(variants, variant{"unaligned-start", base.StartMs + 17_000, base.EndMs, base.StepMs})
		}
		if lastIdx := span / base.StepMs; lastIdx >= 2 {
			offEnd := base.StartMs + lastIdx*base.StepMs - base.StepMs/3
			variants = append(variants, variant{"off-lattice-end", base.StartMs, offEnd, base.StepMs})
		}
	}
	for _, v := range variants {
		if v.stepMs <= 0 || v.endMs <= v.startMs || v.stepMs%1000 != 0 {
			continue
		}
		expected, reason := computeExpected(engine, stor, base.Expr, v.startMs, v.endMs, v.stepMs)
		if reason != "" {
			continue
		}
		out = append(out, corpusCase{
			Variant: v.name, Expr: base.Expr,
			StartMs: v.startMs, EndMs: v.endMs, StepMs: v.stepMs,
			Expected: expected,
		})
	}
	return out, "", nil
}

// computeExpected evaluates the expression on one grid with the reference
// engine and serializes the result with the API's value rounding.
func computeExpected(engine *promql.Engine, stor *teststorage.TestStorage, expr string, startMs, endMs, stepMs int64) ([]corpusResult, string) {
	qry, err := engine.NewRangeQuery(context.Background(), stor, nil, expr,
		time.UnixMilli(startMs), time.UnixMilli(endMs), time.Duration(stepMs)*time.Millisecond)
	if err != nil {
		return nil, "engine-parse"
	}
	defer qry.Close()
	res := qry.Exec(context.Background())
	if res.Err != nil {
		// Covers upstream's expected-error cases and engine features the
		// range form cannot evaluate; a case we cannot compute is a case we
		// cannot assert.
		return nil, "engine-error"
	}
	matrix, ok := res.Value.(promql.Matrix)
	if !ok {
		return nil, "non-matrix-result"
	}
	expected := []corpusResult{}
	for _, s := range matrix {
		if len(s.Histograms) > 0 {
			return nil, "histogram-result"
		}
		r := corpusResult{Labels: s.Metric.Map(), Points: []corpusPoint{}}
		for _, p := range s.Floats {
			r.Points = append(r.Points, corpusPoint{p.T, encodeFloat(roundToNonZeroDecimals(p.F, 3))})
		}
		expected = append(expected, r)
	}
	return expected, ""
}

// dumpDataset walks the loaded storage and serializes every float sample.
func dumpDataset(seriesParser parser.Parser, loads []command) (*corpusDataset, string, error) {
	stor, err := loadSeriesStorage(seriesParser, loads)
	if err != nil {
		return nil, "", err
	}
	defer func() { _ = stor.Close() }()

	q, err := stor.Querier(math.MinInt64/2, math.MaxInt64/2)
	if err != nil {
		return nil, "querier", nil
	}
	defer q.Close()

	ds := &corpusDataset{}
	ss := q.Select(context.Background(), true, nil, labels.MustNewMatcher(labels.MatchRegexp, model.MetricNameLabel, ".*"))
	var it chunkenc.Iterator
	for ss.Next() {
		s := ss.At()
		cs := corpusSeries{Labels: s.Labels().Map(), Samples: [][2]any{}}
		it = s.Iterator(it)
		for vt := it.Next(); vt != chunkenc.ValNone; vt = it.Next() {
			if vt != chunkenc.ValFloat {
				return nil, "histogram-samples", nil
			}
			ts, v := it.At()
			if value.IsStaleNaN(v) {
				cs.Samples = append(cs.Samples, [2]any{ts, "stale"})
				continue
			}
			cs.Samples = append(cs.Samples, [2]any{ts, encodeFloat(v)})
		}
		ds.Series = append(ds.Series, cs)
	}
	if err := ss.Err(); err != nil {
		return nil, "series-set", nil
	}
	return ds, "", nil
}

// parseTestDuration accepts promqltest's time notation: a Prometheus
// duration ("5m", "1m30s"), a bare "0", or bare seconds.
func parseTestDuration(s string) (int64, error) {
	if d, err := model.ParseDuration(s); err == nil {
		return int64(time.Duration(d) / time.Millisecond), nil
	}
	if n, err := strconv.ParseFloat(s, 64); err == nil {
		return int64(n * 1000), nil
	}
	return 0, fmt.Errorf("unparsable duration %q", s)
}

func encodeFloat(f float64) any {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Inf"
	case math.IsInf(f, -1):
		return "-Inf"
	default:
		return f
	}
}

// roundToNonZeroDecimals mirrors querybuildertypesv5's sanitizeValue rounding
// (pkg/types/querybuildertypes/querybuildertypesv5/resp.go) so the frozen
// expectations equal what the API emits for the same float.
func roundToNonZeroDecimals(val float64, n int) float64 {
	if val == 0 || math.IsNaN(val) || math.IsInf(val, 0) {
		return val
	}
	absVal := math.Abs(val)
	if absVal >= 1 {
		multiplier := math.Pow(10, float64(n))
		rounded := math.Round(val*multiplier) / multiplier
		if math.IsInf(rounded, 0) {
			// Mirrors the overflow guard in querybuildertypesv5.
			return val
		}
		if rounded == math.Trunc(rounded) {
			return rounded
		}
		str := strconv.FormatFloat(rounded, 'f', -1, 64)
		result, _ := strconv.ParseFloat(str, 64)
		return result
	}
	order := math.Floor(math.Log10(absVal))
	scale := math.Pow(10, -order+float64(n)-1)
	rounded := math.Round(val*scale) / scale
	str := strconv.FormatFloat(rounded, 'f', -1, 64)
	result, _ := strconv.ParseFloat(str, 64)
	return result
}

// crossCheckFileAllowlist names files whose written expectations assume
// engine options we deliberately run differently, with the reason. Every
// other mismatch between our engine-computed expectations and upstream's
// hand-written ones aborts generation: the corpus must never contradict
// the testdata it claims to represent.
var crossCheckFileAllowlist = map[string]string{
	"name_label_dropping.test": "expectations written for EnableDelayedNameRemoval; our engine matches the server default (off)",
}

// crossCheckUpstream validates the transcription chain — load parsing,
// eval parsing, storage loading — by comparing the reference engine's raw
// output on the base grid against the expectations upstream wrote under the
// same eval, with upstream's own tolerance (almost.Equal, 1e-6 relative).
// The corpus's authority is "what the reference engine computes over
// upstream's data"; this pins that computation to upstream's own record of
// it.
func crossCheckUpstream(engine *promql.Engine, seriesParser parser.Parser, stor *teststorage.TestStorage, cmd command, base corpusCase, sourceFile string, skips map[string]int) error {
	type expSeries struct {
		labels labels.Labels
		points map[int64]float64
	}
	var expected []expSeries
	scalarOnly := false
	var scalarValue float64
	for _, line := range cmd.body {
		if strings.HasPrefix(line, "expect") {
			// expect fail/warn/info/ordered directives and "expect range
			// vector"/"expect string" annotations, not series expectations.
			continue
		}
		if f, err := strconv.ParseFloat(line, 64); err == nil && len(cmd.body) == 1 {
			scalarOnly, scalarValue = true, f
			break
		}
		metric, vals, err := seriesParser.ParseSeriesDesc(line)
		if err != nil {
			skips["crosscheck-skip:unparsable-expectation"]++
			return nil
		}
		points := map[int64]float64{}
		for k, v := range vals {
			if v.Histogram != nil {
				skips["crosscheck-skip:histogram-expectation"]++
				return nil
			}
			if v.Omitted {
				continue
			}
			points[base.StartMs+int64(k)*base.StepMs] = v.Value
		}
		expected = append(expected, expSeries{labels: metric, points: points})
	}

	qry, err := engine.NewRangeQuery(context.Background(), stor, nil, base.Expr,
		time.UnixMilli(base.StartMs), time.UnixMilli(base.EndMs), time.Duration(base.StepMs)*time.Millisecond)
	if err != nil {
		return fmt.Errorf("crosscheck parse %q: %w", base.Expr, err)
	}
	defer qry.Close()
	res := qry.Exec(context.Background())
	if res.Err != nil {
		return fmt.Errorf("crosscheck eval %q: %w", base.Expr, res.Err)
	}
	matrix, ok := res.Value.(promql.Matrix)
	if !ok {
		skips["crosscheck-skip:non-matrix"]++
		return nil
	}

	mismatch := func(format string, args ...any) error {
		if reason, ok := crossCheckFileAllowlist[sourceFile]; ok {
			skips["crosscheck-allowlisted:"+sourceFile]++
			_ = reason
			return nil
		}
		return fmt.Errorf("%s:%d: corpus contradicts upstream expectation for %q: %s",
			sourceFile, cmd.line, base.Expr, fmt.Sprintf(format, args...))
	}

	if scalarOnly {
		if len(matrix) != 1 || matrix[0].Metric.Len() != 0 {
			return mismatch("scalar expectation but %d series", len(matrix))
		}
		if len(matrix[0].Floats) == 0 || !almost.Equal(matrix[0].Floats[len(matrix[0].Floats)-1].F, scalarValue, defaultEpsilon) {
			return mismatch("scalar %v != expected %v", matrix[0].Floats, scalarValue)
		}
		skips["crosscheck-ok"]++
		return nil
	}

	if len(matrix) != len(expected) {
		return mismatch("engine returned %d series, upstream wrote %d", len(matrix), len(expected))
	}
	for _, exp := range expected {
		var got *promql.Series
		for i := range matrix {
			if labels.Equal(matrix[i].Metric, exp.labels) {
				got = &matrix[i]
				break
			}
		}
		if got == nil {
			return mismatch("series %s missing from engine result", exp.labels)
		}
		gotPoints := map[int64]float64{}
		for _, p := range got.Floats {
			gotPoints[p.T] = p.F
		}
		if len(gotPoints) != len(exp.points) {
			return mismatch("series %s: %d points, upstream wrote %d", exp.labels, len(gotPoints), len(exp.points))
		}
		for ts, want := range exp.points {
			gotV, ok := gotPoints[ts]
			if !ok {
				return mismatch("series %s: no point at %d", exp.labels, ts)
			}
			if math.IsNaN(want) && math.IsNaN(gotV) {
				continue
			}
			if !almost.Equal(gotV, want, defaultEpsilon) {
				return mismatch("series %s at %d: engine %v, upstream wrote %v", exp.labels, ts, gotV, want)
			}
		}
	}
	skips["crosscheck-ok"]++
	return nil
}
