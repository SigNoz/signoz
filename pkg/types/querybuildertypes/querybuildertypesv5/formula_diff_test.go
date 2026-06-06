package querybuildertypesv5

import (
	"fmt"
	"math"
	"math/rand"
	"slices"
	"sort"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

// referenceEvaluate is an intentionally naive, self-contained reimplementation of
// the formula evaluation semantics. It mirrors the documented behaviour:
//   - unique label sets are the maximal sets (a set that is a subset of another
//     distinct set is dropped), deduped;
//   - for each unique target, a variable matches via the FIRST series (in bucket
//     order) whose labels are a subset of the target (empty labels match all);
//   - a missing variable defaults to zero when canDefaultZero is set, otherwise
//     that timestamp is skipped;
//   - NaN/Inf results are dropped.
//
// It is deliberately O(n^2) and free of the optimisations under test so it can
// act as a semantic oracle for the differential test below.
func referenceEvaluate(t *testing.T, expr string, canDefaultZero map[string]bool, tsData map[string]*TimeSeriesData) []*TimeSeries {
	t.Helper()
	fe, err := NewFormulaEvaluator(expr, canDefaultZero)
	require.NoError(t, err)

	type refSeries struct {
		labels []*Label
		data   map[int64]float64
	}

	subset := func(a, b []*Label) bool { // a ⊆ b
		bm := make(map[string]any, len(b))
		for _, l := range b {
			bm[l.Key.Name] = l.Value
		}
		for _, l := range a {
			if v, ok := bm[l.Key.Name]; !ok || v != l.Value {
				return false
			}
		}
		return true
	}

	varSeries := map[string][]refSeries{}
	var allLabelSets [][]*Label

	for variable, aggRef := range fe.aggRefs {
		data, ok := tsData[aggRef.QueryName]
		if !ok {
			for k, v := range tsData {
				if strings.EqualFold(k, aggRef.QueryName) {
					data, ok = v, true
					break
				}
			}
		}
		if !ok {
			continue
		}
		var bucket *AggregationBucket
		for _, b := range data.Aggregations {
			if aggRef.Index != nil && b.Index == *aggRef.Index {
				bucket = b
				break
			}
			if aggRef.Alias != nil && b.Alias == *aggRef.Alias {
				bucket = b
				break
			}
		}
		if bucket == nil {
			continue
		}
		for _, s := range bucket.Series {
			d := make(map[int64]float64, len(s.Values))
			for _, v := range s.Values {
				d[v.Timestamp] = v.Value
			}
			varSeries[variable] = append(varSeries[variable], refSeries{labels: s.Labels, data: d})
			allLabelSets = append(allLabelSets, s.Labels)
		}
	}

	sort.SliceStable(allLabelSets, func(i, j int) bool { return len(allLabelSets[i]) > len(allLabelSets[j]) })
	var unique [][]*Label
	for _, ls := range allLabelSets {
		u := true
		for _, us := range unique {
			if subset(ls, us) {
				u = false
				break
			}
		}
		if u {
			unique = append(unique, ls)
		}
	}

	var out []*TimeSeries
	for _, target := range unique {
		matched := map[string]map[int64]float64{}
		allTs := map[int64]struct{}{}
		for variable := range fe.aggRefs {
			for _, s := range varSeries[variable] {
				if subset(s.labels, target) {
					matched[variable] = s.data
					for ts := range s.data {
						allTs[ts] = struct{}{}
					}
					break
				}
			}
		}
		var tss []int64
		for ts := range allTs {
			tss = append(tss, ts)
		}
		slices.Sort(tss)

		var vals []*TimeSeriesValue
		for _, ts := range tss {
			m := map[string]any{}
			cnt := 0
			for _, variable := range fe.variables {
				if d, ok := matched[variable]; ok {
					if v, ok := d[ts]; ok {
						m[variable] = v
						cnt++
					}
				}
			}
			for _, variable := range fe.variables {
				if _, ok := m[variable]; !ok && fe.canDefaultZero[variable] {
					m[variable] = 0.0
					cnt++
				}
			}
			if cnt != len(fe.variables) {
				continue
			}
			res, err := fe.expression.Evaluate(m)
			if err != nil {
				continue
			}
			f, ok := res.(float64)
			if !ok || math.IsNaN(f) || math.IsInf(f, 0) {
				continue
			}
			vals = append(vals, &TimeSeriesValue{Timestamp: ts, Value: f})
		}
		if len(vals) == 0 {
			continue
		}
		rl := make([]*Label, len(target))
		copy(rl, target)
		out = append(out, &TimeSeries{Labels: rl, Values: vals})
	}
	return out
}

// canonicalize turns a result set into a comparable map: labelSig -> ts -> value.
func canonicalize(series []*TimeSeries) map[string]map[int64]float64 {
	out := make(map[string]map[int64]float64, len(series))
	for _, s := range series {
		keys := make([]string, 0, len(s.Labels))
		kv := make(map[string]string, len(s.Labels))
		for _, l := range s.Labels {
			keys = append(keys, l.Key.Name)
			kv[l.Key.Name] = fmt.Sprintf("%v", l.Value)
		}
		sort.Strings(keys)
		var sb strings.Builder
		for _, k := range keys {
			sb.WriteString(k)
			sb.WriteByte('=')
			sb.WriteString(kv[k])
			sb.WriteByte('|')
		}
		m := make(map[int64]float64, len(s.Values))
		for _, v := range s.Values {
			m[v.Timestamp] = v.Value
		}
		out[sb.String()] = m
	}
	return out
}

func assertSameResults(t *testing.T, caseName string, got, want []*TimeSeries) {
	t.Helper()
	gc := canonicalize(got)
	wc := canonicalize(want)
	if len(gc) != len(wc) {
		t.Fatalf("%s: series count mismatch: got %d, want %d\ngot keys=%v\nwant keys=%v",
			caseName, len(gc), len(wc), keysOf(gc), keysOf(wc))
	}
	for sig, wm := range wc {
		gm, ok := gc[sig]
		if !ok {
			t.Fatalf("%s: missing series %q in got", caseName, sig)
		}
		if len(gm) != len(wm) {
			t.Fatalf("%s: series %q point count mismatch: got %d want %d", caseName, sig, len(gm), len(wm))
		}
		for ts, wv := range wm {
			gv, ok := gm[ts]
			if !ok {
				t.Fatalf("%s: series %q missing ts %d", caseName, sig, ts)
			}
			if math.Abs(gv-wv) > 1e-9 {
				t.Fatalf("%s: series %q ts %d value mismatch: got %v want %v", caseName, sig, ts, gv, wv)
			}
		}
	}
}

func keysOf(m map[string]map[int64]float64) []string {
	ks := make([]string, 0, len(m))
	for k := range m {
		ks = append(ks, k)
	}
	sort.Strings(ks)
	return ks
}

// randomTSData builds randomized time series data for a query, exercising both
// the "regular" case (all series share a key set) and the "irregular" case
// (series have differing key sets), plus empty label sets and overlaps.
func randomTSData(rng *rand.Rand, queryName string) *TimeSeriesData {
	keyPool := []string{"svc", "op", "env"}
	valPool := []string{"x", "y", "z"}
	tsPool := []int64{1, 2, 3, 4, 5}

	// Decide a base key set for the query.
	regular := rng.Intn(2) == 0
	baseKeys := randomSubset(rng, keyPool)

	numSeries := rng.Intn(6) // 0..5
	series := make([]*TimeSeries, 0, numSeries)
	for range numSeries {
		keys := baseKeys
		if !regular {
			keys = randomSubset(rng, keyPool)
		}
		labels := make([]*Label, 0, len(keys))
		for _, k := range keys {
			labels = append(labels, &Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: k, FieldDataType: telemetrytypes.FieldDataTypeString},
				Value: valPool[rng.Intn(len(valPool))],
			})
		}
		// random timestamps subset
		var values []*TimeSeriesValue
		for _, ts := range tsPool {
			if rng.Intn(3) == 0 {
				continue
			}
			values = append(values, &TimeSeriesValue{Timestamp: ts, Value: float64(rng.Intn(100) + 1)})
		}
		if len(values) == 0 {
			values = append(values, &TimeSeriesValue{Timestamp: tsPool[0], Value: float64(rng.Intn(100) + 1)})
		}
		series = append(series, &TimeSeries{Labels: labels, Values: values})
	}

	return &TimeSeriesData{
		QueryName: queryName,
		Aggregations: []*AggregationBucket{
			{Index: 0, Alias: queryName + "_agg", Series: series},
		},
	}
}

func randomSubset(rng *rand.Rand, pool []string) []string {
	var out []string
	for _, k := range pool {
		if rng.Intn(2) == 0 {
			out = append(out, k)
		}
	}
	return out
}

// TestFormulaEvaluator_DifferentialRandom fuzzes EvaluateFormula against the
// naive reference oracle to guarantee the optimized implementation preserves
// exact semantics across subset matching, empty labels, defaults and irregular
// key sets.
func TestFormulaEvaluator_DifferentialRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(0xC0FFEE))

	type exprCase struct {
		expr string
		vars []string
	}
	twoVar := []exprCase{
		{"A + B", []string{"A", "B"}},
		{"A / B", []string{"A", "B"}},
		{"B / A", []string{"A", "B"}},
		{"A * B - A", []string{"A", "B"}},
	}
	threeVar := []exprCase{
		{"A + B + C", []string{"A", "B", "C"}},
		{"(A + B) / C", []string{"A", "B", "C"}},
		{"A / B + C", []string{"A", "B", "C"}},
	}

	const iterations = 5000
	for it := range iterations {
		var ec exprCase
		if rng.Intn(2) == 0 {
			ec = twoVar[rng.Intn(len(twoVar))]
		} else {
			ec = threeVar[rng.Intn(len(threeVar))]
		}

		canDefaultZero := map[string]bool{}
		for _, v := range ec.vars {
			canDefaultZero[v] = rng.Intn(2) == 0
		}

		tsData := map[string]*TimeSeriesData{}
		for _, v := range ec.vars {
			tsData[v] = randomTSData(rng, v)
		}

		evaluator, err := NewFormulaEvaluator(ec.expr, canDefaultZero)
		require.NoError(t, err)
		got, err := evaluator.EvaluateFormula(tsData)
		require.NoError(t, err)

		want := referenceEvaluate(t, ec.expr, canDefaultZero, tsData)

		assertSameResults(t, fmt.Sprintf("iter=%d expr=%q", it, ec.expr), got, want)
	}
}
