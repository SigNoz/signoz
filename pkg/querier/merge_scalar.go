package querier

import (
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/scalarstate"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// mergeScalarStateRows concatenates state rows from cached and fresh
// scalar-state results. Chunk ranges are disjoint by construction so a
// plain append is correct — the per-aggregate Go merge runs later, in
// materializeScalarResult. Metadata adoption is delegated to
// ScalarStateData.Adopt so this and the cache-side merger can't drift.
func (q *querier) mergeScalarStateRows(cachedValue any, fresh []*qbtypes.Result) *qbtypes.ScalarStateData {
	out := &qbtypes.ScalarStateData{}
	if ssd, ok := cachedValue.(*qbtypes.ScalarStateData); ok {
		out.Adopt(ssd)
	}
	for _, r := range fresh {
		if r == nil {
			continue
		}
		if ssd, ok := r.Value.(*qbtypes.ScalarStateData); ok {
			out.Adopt(ssd)
		}
	}
	return out
}

// materializeIfScalarState converts a Result carrying a *ScalarStateData
// (the cache-side shape) into one carrying *ScalarData (the API shape)
// via the Go-side decode + merge + final pipeline. For any other shape
// the result is returned unchanged. windowSec is the full user-facing
// query window in seconds, used by rate aggregates at finalize time.
func (q *querier) materializeIfScalarState(r *qbtypes.Result, windowSec uint64) (*qbtypes.Result, error) {
	if r == nil {
		return nil, nil
	}
	if _, ok := r.Value.(*qbtypes.ScalarStateData); !ok {
		return r, nil
	}
	return q.materializeScalarResult(r, windowSec)
}

// materializeScalarResult turns a Result whose Value is a *ScalarStateData
// (the cache shape) into a Result whose Value is a *ScalarData (the API
// shape). It runs the Go-side decode + merge + final per group + agg via
// the scalarstate registry. If any aggregate lacks a registered Go
// merger, returns an error so the caller can fall back to direct
// execution.
func (q *querier) materializeScalarResult(r *qbtypes.Result, windowSec uint64) (*qbtypes.Result, error) {
	if r == nil {
		return nil, nil
	}
	ssd, ok := r.Value.(*qbtypes.ScalarStateData)
	if !ok || ssd == nil {
		// Already materialized or wrong shape — pass through.
		return r, nil
	}
	scalar, err := materializeScalarData(ssd, windowSec)
	if err != nil {
		return nil, err
	}
	return &qbtypes.Result{
		Type:           qbtypes.RequestTypeScalar,
		Value:          scalar,
		Stats:          r.Stats,
		Warnings:       r.Warnings,
		WarningsDocURL: r.WarningsDocURL,
	}, nil
}

// materializeScalarData groups state rows by GroupKey, decodes each
// per-aggregate state, runs the registered Go merger, and assembles the
// flat tabular ScalarData the API consumers expect. One row per unique
// group key with one column per group_by + one column per aggregation.
func materializeScalarData(ssd *qbtypes.ScalarStateData, windowSec uint64) (*qbtypes.ScalarData, error) {
	// Resolve aggregate handlers up front so we fail loudly before
	// touching any blob bytes.
	aggs := make([]scalarstate.Aggregate, len(ssd.AggNames))
	for i, name := range ssd.AggNames {
		a, ok := scalarstate.Lookup(name)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalar state: no registered aggregate for %q", name)
		}
		aggs[i] = a
	}

	// Index: groupKeyString -> aggIdx -> []State
	type groupBucket struct {
		key    []any
		states map[int][]scalarstate.State
	}
	groups := map[string]*groupBucket{}
	order := make([]string, 0)

	for _, row := range ssd.Rows {
		if row.AggIdx < 0 || row.AggIdx >= len(aggs) {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalar state: aggIdx %d out of range (have %d aggs)", row.AggIdx, len(aggs))
		}
		st, err := aggs[row.AggIdx].Decode(row.State)
		if err != nil {
			return nil, fmt.Errorf("scalar state: decode (agg=%s): %w", ssd.AggNames[row.AggIdx], err)
		}
		k := groupKeyString(row.GroupKey)
		gb, ok := groups[k]
		if !ok {
			gb = &groupBucket{
				key:    cloneAnySlice(row.GroupKey),
				states: map[int][]scalarstate.State{},
			}
			groups[k] = gb
			order = append(order, k)
		}
		gb.states[row.AggIdx] = append(gb.states[row.AggIdx], st)
	}

	out := &qbtypes.ScalarData{
		QueryName: ssd.QueryName,
	}
	out.Columns = append(out.Columns, ssd.GroupCols...)
	out.Columns = append(out.Columns, ssd.AggCols...)

	for _, k := range order {
		gb := groups[k]
		row := make([]any, 0, len(ssd.GroupCols)+len(ssd.AggCols))
		row = append(row, gb.key...)
		for i, agg := range aggs {
			states := gb.states[i]
			if len(states) == 0 {
				row = append(row, nil)
				continue
			}
			merged, err := agg.Merge(states)
			if err != nil {
				return nil, fmt.Errorf("scalar state: merge (agg=%s): %w", ssd.AggNames[i], err)
			}
			final, err := agg.Final(merged)
			if err != nil {
				return nil, fmt.Errorf("scalar state: final (agg=%s): %w", ssd.AggNames[i], err)
			}
			if i < len(ssd.RateMask) && ssd.RateMask[i] {
				final = applyRate(final, windowSec)
			}
			// JSON can't encode NaN/±Inf — coerce to nil so the
			// response marshals cleanly. Mirrors the time-series
			// consume path's drop in readAsTimeSeries.
			if f, ok := final.(float64); ok && (math.IsNaN(f) || math.IsInf(f, 0)) {
				final = nil
			}
			row = append(row, final)
		}
		out.Data = append(out.Data, row)
	}

	applyOrderAndLimit(out, ssd.Order, ssd.Limit)
	return out, nil
}

// applyOrderAndLimit sorts data rows by the requested order keys and
// truncates to limit. Skipping in chunk SQL is safe only because we
// have full per-group state at this step (TRD: scalar caching, Option 2).
// Default ordering (when no Order is supplied) is descending by the
// first aggregation, matching the existing non-cached path.
func applyOrderAndLimit(d *qbtypes.ScalarData, order []qbtypes.OrderBy, limit int) {
	if len(d.Data) == 0 {
		return
	}

	// Resolve each Order key to a column index in d.Columns. An
	// unresolved key is silently skipped — same forgiving behavior as
	// the SQL ORDER BY path.
	type sortKey struct {
		colIdx int
		desc   bool
	}
	keys := make([]sortKey, 0, len(order))
	for _, o := range order {
		idx := lookupColumnIdx(d.Columns, o.Key.Name)
		if idx < 0 {
			continue
		}
		keys = append(keys, sortKey{colIdx: idx, desc: strings.EqualFold(o.Direction.StringValue(), "desc")})
	}
	// Default: descending by the first aggregation column (matches
	// the SQL fallback `ORDER BY __result_0 DESC`).
	if len(keys) == 0 {
		for i, c := range d.Columns {
			if c.Type == qbtypes.ColumnTypeAggregation {
				keys = append(keys, sortKey{colIdx: i, desc: true})
				break
			}
		}
	}

	if len(keys) > 0 {
		sort.SliceStable(d.Data, func(i, j int) bool {
			for _, k := range keys {
				cmp := compareAny(d.Data[i][k.colIdx], d.Data[j][k.colIdx])
				if cmp == 0 {
					continue
				}
				if k.desc {
					return cmp > 0
				}
				return cmp < 0
			}
			return false
		})
	}

	if limit > 0 && len(d.Data) > limit {
		d.Data = d.Data[:limit]
	}
}

// lookupColumnIdx returns the index of the column whose Name matches
// (also accepts the __result_<idx> alias matched directly). Returns
// -1 if not found.
func lookupColumnIdx(cols []*qbtypes.ColumnDescriptor, name string) int {
	for i, c := range cols {
		if c.Name == name {
			return i
		}
	}
	return -1
}

// compareAny returns -1, 0, +1 for v1 < v2, ==, > using numeric
// comparison when both are numeric; otherwise falls back to string
// comparison.
func compareAny(a, b any) int {
	af, aOk := toFloat64(a)
	bf, bOk := toFloat64(b)
	if aOk && bOk {
		switch {
		case af < bf:
			return -1
		case af > bf:
			return 1
		default:
			return 0
		}
	}
	as := fmt.Sprint(a)
	bs := fmt.Sprint(b)
	switch {
	case as < bs:
		return -1
	case as > bs:
		return 1
	default:
		return 0
	}
}

// applyRate divides a finalized aggregate by the full query window in
// seconds. Used for rate-style aggregates (rate, rate_sum, rate_avg,
// rate_min, rate_max). Returns NaN when the window is zero. Always
// returns float64 — rate inherently has time-1 units regardless of the
// underlying aggregate's type.
func applyRate(v any, windowSec uint64) any {
	if windowSec == 0 {
		return math.NaN()
	}
	if f, ok := toFloat64(v); ok {
		return f / float64(windowSec)
	}
	return v
}

// toFloat64 lives in postprocess.go and is reused here.

func groupKeyString(vals []any) string {
	if len(vals) == 0 {
		return ""
	}
	var sb strings.Builder
	for i, v := range vals {
		if i > 0 {
			sb.WriteByte(0x1f) // unit separator — won't collide with str values
		}
		fmt.Fprintf(&sb, "%v", v)
	}
	return sb.String()
}

func cloneAnySlice(in []any) []any {
	out := make([]any, len(in))
	copy(out, in)
	return out
}
