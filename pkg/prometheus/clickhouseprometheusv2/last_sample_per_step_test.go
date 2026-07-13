package clickhouseprometheusv2

import (
	"fmt"
	"math/rand"
	"sort"
	"testing"

	"github.com/stretchr/testify/require"
)

// The lastSamplePerStep correctness argument, executed: for instant selectors, keeping
// only the last sample of every step bucket (bucket 0 = (start, firstEval],
// bucket i = (firstEval+(i-1)·step, firstEval+i·step]) yields exactly the
// same instant-vector selections as the raw samples, for every evaluation
// timestamp on the grid. The engine picks the latest sample in
// (t-lookback, t] per evaluation timestamp t and treats a stale marker as
// absent; both behaviors are emulated here directly.

type tsample struct {
	ts    int64
	value float64
	stale bool
}

// engineSelect emulates the engine's instant-selector resolution at
// evaluation timestamp t over samples ordered by timestamp: the latest sample
// in (t-lookback, t], absent when none or when it is a stale marker.
func engineSelect(samples []tsample, t, lookbackMs int64) (tsample, bool) {
	var picked tsample
	found := false
	for _, s := range samples {
		if s.ts > t-lookbackMs && s.ts <= t {
			picked = s
			found = true
		}
	}
	if !found || picked.stale {
		return tsample{}, false
	}
	return picked, true
}

// lastPerStep emulates the last-sample-per-step samples query: group samples into buckets and
// keep only the last sample of each (ties keep either; ClickHouse argMax over
// equal keys is unspecified, so generated timestamps are unique).
func lastPerStep(samples []tsample, firstEvalMs, stepMs int64) []tsample {
	last := make(map[int64]tsample)
	for _, s := range samples {
		var bucket int64
		if stepMs > 0 && s.ts > firstEvalMs {
			bucket = (s.ts-firstEvalMs-1)/stepMs + 1
		}
		if cur, ok := last[bucket]; !ok || s.ts > cur.ts {
			last[bucket] = s
		}
	}
	out := make([]tsample, 0, len(last))
	for _, s := range last {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ts < out[j].ts })
	return out
}

func TestLastSamplePerStepEquivalence(t *testing.T) {
	rng := rand.New(rand.NewSource(42))

	for caseIdx := 0; caseIdx < 2000; caseIdx++ {
		// Random query shape. Units are milliseconds but kept small so bucket
		// boundaries are hit often.
		stepMs := []int64{1, 2, 5, 7, 30, 60}[rng.Intn(6)]
		lookbackMs := []int64{1, 3, 5, 10, 45}[rng.Intn(5)]
		queryStart := int64(1000)
		numSteps := rng.Int63n(20)
		queryEnd := queryStart + numSteps*stepMs + rng.Int63n(stepMs) // grid may not divide the range

		// Engine-derived selector window for instant selectors:
		// hints.Start = firstEval - (lookback - 1), hints.End = queryEnd.
		hintsStart := queryStart - (lookbackMs - 1)
		hintsEnd := queryEnd
		firstEval := hintsStart + lookbackMs - 1
		require.Equal(t, queryStart, firstEval)

		// Random samples inside the fetch window [hints.Start, hints.End],
		// with unique timestamps and occasional stale markers. The sample
		// count is capped by the window size: timestamps are unique.
		windowSize := hintsEnd - hintsStart + 1
		numSamples := rng.Int63n(40)
		if numSamples > windowSize {
			numSamples = windowSize
		}
		seen := make(map[int64]bool)
		var samples []tsample
		for int64(len(samples)) < numSamples {
			ts := hintsStart + rng.Int63n(windowSize)
			if seen[ts] {
				continue
			}
			seen[ts] = true
			samples = append(samples, tsample{ts: ts, value: rng.Float64(), stale: rng.Intn(8) == 0})
		}
		sort.Slice(samples, func(i, j int) bool { return samples[i].ts < samples[j].ts })

		reduced := lastPerStep(samples, firstEval, stepMs)

		desc := fmt.Sprintf("case=%d step=%d lookback=%d start=%d end=%d samples=%d",
			caseIdx, stepMs, lookbackMs, queryStart, queryEnd, len(samples))

		for evalTs := queryStart; evalTs <= queryEnd; evalTs += stepMs {
			rawPick, rawOK := engineSelect(samples, evalTs, lookbackMs)
			reducedPick, reducedOK := engineSelect(reduced, evalTs, lookbackMs)

			require.Equal(t, rawOK, reducedOK, "%s eval=%d presence mismatch", desc, evalTs)
			if rawOK {
				require.Equal(t, rawPick, reducedPick, "%s eval=%d sample mismatch", desc, evalTs)
			}
		}
	}
}

// Instant queries (step 0) evaluate once at firstEval == hints.End; lastSamplePerStep
// collapses to a single bucket over the whole window.
func TestLastSamplePerStepEquivalenceInstantQuery(t *testing.T) {
	rng := rand.New(rand.NewSource(7))

	for caseIdx := 0; caseIdx < 500; caseIdx++ {
		lookbackMs := []int64{1, 3, 5, 10, 45}[rng.Intn(5)]
		evalTs := int64(1000)
		hintsStart := evalTs - (lookbackMs - 1)
		hintsEnd := evalTs
		firstEval := hintsStart + lookbackMs - 1
		require.Equal(t, evalTs, firstEval)

		windowSize := hintsEnd - hintsStart + 1
		numSamples := rng.Int63n(10)
		if numSamples > windowSize {
			numSamples = windowSize
		}
		seen := make(map[int64]bool)
		var samples []tsample
		for int64(len(samples)) < numSamples {
			ts := hintsStart + rng.Int63n(windowSize)
			if seen[ts] {
				continue
			}
			seen[ts] = true
			samples = append(samples, tsample{ts: ts, value: rng.Float64(), stale: rng.Intn(4) == 0})
		}
		sort.Slice(samples, func(i, j int) bool { return samples[i].ts < samples[j].ts })

		reduced := lastPerStep(samples, firstEval, 0)
		require.LessOrEqual(t, len(reduced), 1, "instant reduction must keep at most one sample")

		rawPick, rawOK := engineSelect(samples, evalTs, lookbackMs)
		reducedPick, reducedOK := engineSelect(reduced, evalTs, lookbackMs)
		require.Equal(t, rawOK, reducedOK, "case=%d presence mismatch", caseIdx)
		if rawOK {
			require.Equal(t, rawPick, reducedPick, "case=%d sample mismatch", caseIdx)
		}
	}
}

// A stale marker that is the latest sample of its bucket must shadow older
// samples: the engine sees the marker and reports the series absent, exactly
// as with raw samples. Pre-filtering stale rows would instead resurrect the
// older sample.
func TestLastSamplePerStepKeepsStaleShadowing(t *testing.T) {
	lookbackMs := int64(10)
	stepMs := int64(5)
	queryStart := int64(1000)

	samples := []tsample{
		{ts: 998, value: 1.0},                // bucket 0
		{ts: 999, stale: true},               // bucket 0: marker shadows 998
		{ts: 1003, value: 2.0},               // bucket 1
		{ts: 1004, stale: true},              // bucket 1: marker shadows 1003
		{ts: 1008, value: 3.0, stale: false}, // bucket 2
	}
	firstEval := queryStart
	reduced := lastPerStep(samples, firstEval, stepMs)

	for evalTs := queryStart; evalTs <= queryStart+2*stepMs; evalTs += stepMs {
		rawPick, rawOK := engineSelect(samples, evalTs, lookbackMs)
		reducedPick, reducedOK := engineSelect(reduced, evalTs, lookbackMs)
		require.Equal(t, rawOK, reducedOK, "eval=%d", evalTs)
		if rawOK {
			require.Equal(t, rawPick, reducedPick, "eval=%d", evalTs)
		}
	}
}
