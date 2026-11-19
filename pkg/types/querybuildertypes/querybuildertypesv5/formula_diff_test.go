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

// canonicalize turns a result set into sorted lines, one for each series. A
// label value keeps its type and a point keeps the bits of its float, so two
// results are equal only when they are exactly the same.
func canonicalize(series []*TimeSeries) []string {
	lines := make([]string, 0, len(series))
	for _, s := range series {
		labels := make([]string, 0, len(s.Labels))
		for _, l := range s.Labels {
			value := l.Value
			if f, ok := value.(float64); ok {
				// -0 and 0 are the same label value, and either one can be
				// the label of the result.
				value = f + 0
			}
			labels = append(labels, fmt.Sprintf("%s=%T(%v)", l.Key.Name, value, value))
		}
		sort.Strings(labels)

		points := make([]string, 0, len(s.Values))
		for _, v := range s.Values {
			points = append(points, fmt.Sprintf("%d:%x", v.Timestamp, math.Float64bits(v.Value)))
		}
		sort.Strings(points)

		lines = append(lines, strings.Join(labels, ",")+" => "+strings.Join(points, " "))
	}
	sort.Strings(lines)
	return lines
}

// randomTSData builds randomized time series data for a query, exercising both
// the "regular" case (all series share a key set) and the "irregular" case
// (series have differing key sets), plus empty label sets, duplicate label sets
// and values of different types with the same text.
func randomTSData(rng *rand.Rand, queryName string) *TimeSeriesData {
	keyPool := []string{"svc", "op", "env"}
	valPool := []any{
		"x", "y", "", "200", "true",
		int64(200), uint64(200), float64(200), float64(1.5), float64(0), math.Copysign(0, -1),
		true, nil,
	}
	tsPool := []int64{1, 2, 3, 4, 5}

	// Decide a base key set for the query.
	regular := rng.Intn(2) == 0
	baseKeys := randomSubset(rng, keyPool)

	maxSeries := 5
	if rng.Intn(5) == 0 {
		maxSeries = 40
	}
	numSeries := rng.Intn(maxSeries + 1)
	series := make([]*TimeSeries, 0, numSeries)
	for range numSeries {
		keys := baseKeys
		if !regular {
			keys = randomSubset(rng, keyPool)
		}
		labels := make([]*Label, 0, len(keys))
		for _, k := range keys {
			labels = append(labels, &Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: k},
				Value: valPool[rng.Intn(len(valPool))],
			})
		}
		// the order of the labels of a series must not matter
		rng.Shuffle(len(labels), func(i, j int) { labels[i], labels[j] = labels[j], labels[i] })

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
// exact semantics across subset matching, empty labels, defaults, irregular
// key sets and label value types.
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

		require.Equal(t, canonicalize(want), canonicalize(got), "iter=%d expr=%q", it, ec.expr)
	}
}
