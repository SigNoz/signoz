package clickhouseprometheusv2

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/huandu/go-sqlbuilder"
)

// experimental gate for the timeSeries*ToGrid aggregate functions; attached
// as a SETTINGS clause so telemetrystore hooks cannot clobber it.
const gridFunctionsSetting = "SETTINGS allow_experimental_ts_to_grid_aggregate_function = 1"

var aggForEach = map[string]string{
	"sum":   "sumForEach",
	"min":   "minForEach",
	"max":   "maxForEach",
	"avg":   "avgForEach",
	"count": "countForEach",
}

// buildUnitSQL renders the single ClickHouse statement that evaluates one
// core unit over the [startMs, endMs] / stepMs grid. The inner level
// computes per-series grids with a timeSeries*ToGrid aggregate, or with a
// windowed aggregation for *_over_time. The outer level is the spatial
// aggregation: -ForEach combinators grouped by the projected group key.
//
// The heavy level runs on the shards. The top-level FROM is the distributed
// samples table. The group-key join partner is a subquery on the
// shard-local time series table. So the shard rewrite executes the join and
// the per-series aggregation next to the data. Fingerprint co-locality
// makes this complete: samples and series shard on the same key. The
// initiator only merges the per-series states and applies the spatial
// -ForEach step. This is the same layout as the telemetrymetrics statement
// builder. The windowed *_over_time form shares the frame but holds
// per-bucket partials inside each series group (see windowedInner).
//
// The offset shifts the selector's data window. The grid indices map 1:1
// onto the query grid: output ts = startMs + i*stepMs. Grid parameters
// render as literals. They are aggregate-function parameters, not bindable
// values.
//
// Statements nest builder-rendered SQL as text. So the returned args must
// follow the position of each fragment in the final statement: ClickHouse
// binds ? placeholders by position. A JOIN renders before WHERE, so a
// joined subquery's args come before the outer query's condition args.
//
// Row shape: the group-key columns (see groupKeyColumns), then grid
// Array(Nullable(Float64)). A NULL grid point is an absent point, the
// engine's "no value here". The -ForEach combinators preserve it: an index
// where every series is NULL aggregates to NULL, and countForEach's 0 maps
// back to NULL.
func buildUnitSQL(unit *coreUnit, metricNames []string, dataStart, dataEnd int64, startMs, endMs, stepMs, lookbackMs int64) (string, []any, error) {
	selStart := startMs - unit.offsetMs
	selEnd := endMs - unit.offsetMs
	stepSec := stepMs / 1000
	if stepSec == 0 {
		// Instant query: start == end, so the grid has one point for any
		// positive step.
		stepSec = 1
	}
	windowMs := unit.rangeMs
	if unit.kind == unitInstant {
		windowMs = lookbackMs
	}
	windowSec := windowMs / 1000

	adjustedTsStartU, _, _, localTsTable := metricstelemetryschema.WhichTSTableToUse(uint64(dataStart), uint64(dataEnd), false, nil)
	adjustedTsStart := int64(adjustedTsStartU)
	keyNames := groupKeyColumns(unit)

	// seriesSub computes fingerprint -> group key columns. It reads the
	// local series table when it rides inside the shard-rewritten samples
	// query, and the distributed one when it joins at the initiator
	// (windowed form).
	seriesSub := func(table string) (string, []any, error) {
		sub := sqlbuilder.NewSelectBuilder()
		selects := []string{"fingerprint"}
		if keyNames == nil {
			selects = append(selects, groupKeyExpr(unit)+" AS gkey")
		} else {
			// by (...) grouping extracts exactly the listed labels as plain
			// columns: no reason to build, sort and stringify every label
			// pair per row when the projection is a known short list and
			// the label names live in Go anyway.
			for i, name := range keyNames {
				selects = append(selects, fmt.Sprintf("JSONExtractString(labels, %s) AS g%d", sub.Var(name), i))
			}
		}
		sub.Select(selects...)
		sub.From(fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, table))
		if err := applySeriesConditions(sub, adjustedTsStart, dataEnd, unit.matchers); err != nil {
			return "", nil, err
		}
		sub.GroupBy(append([]string{"fingerprint"}, keyColumnAliases(keyNames)...)...)
		q, args := sub.BuildWithFlavor(sqlbuilder.ClickHouse)
		return q, args, nil
	}

	// samplesConditions adds the samples-side WHERE. The group-key join
	// restricts to the matched series; no fingerprint condition is added
	// here.
	samplesConditions := func(sb *sqlbuilder.SelectBuilder, excludeStale bool) {
		switch len(metricNames) {
		case 0:
			// No name constraint derivable; correct but unable to use the
			// metric_name primary-key prefix.
		case 1:
			sb.Where(sb.EQ("metric_name", metricNames[0]))
		default:
			sb.Where(sb.In("metric_name", sqlbuilder.List(metricNames)))
		}
		// temporality precedes metric_name in the samples primary key; the
		// fingerprints already come from these temporalities, so this only
		// helps granule pruning.
		sb.Where("temporality IN ['Cumulative', 'Unspecified']")
		// When the window is narrower than the step, the grid windows
		// (t_k − window, t_k] cover only window/step of the timeline. A
		// sample in a gap belongs to no window. It cannot move any grid
		// point, but the grid aggregate buffers every row it is fed. This
		// predicate keeps only the in-window rows. It cut a 36k-series
		// one-week rate from 74s/28GiB to 16s/4.3GiB on fleet data: the
		// read stays the same, and the aggregate input shrinks by the
		// coverage ratio. The lattice anchors at selStart, because the end
		// can sit off-lattice on unaligned grids. positiveModulo is
		// necessary because samples above selStart make the dividend
		// negative. The upper bound tightens to the last grid point: rows
		// past it are equally windowless. When window >= step, the windows
		// tile the timeline, and the plain bounds stay.
		sliver := stepMs > 0 && windowMs > 0 && windowMs < stepMs
		upper := selEnd
		if sliver {
			upper = selStart + (selEnd-selStart)/stepMs*stepMs
		}
		// Left-open window: a sample exactly at the window's lower boundary
		// is never used (range selectors and lookback are both left-open).
		sb.Where(sb.GT("unix_milli", selStart-windowMs), sb.LTE("unix_milli", upper))
		if sliver {
			sb.Where(fmt.Sprintf("positiveModulo(%s - unix_milli, %s) < %s",
				sb.Var(selStart), sb.Var(stepMs), sb.Var(windowMs)))
		}
		if excludeStale {
			// PromQL excludes stale markers from range vectors. Instant
			// selectors need the stale rows for shadowing instead.
			sb.Where("bitAnd(flags, 1) = 0")
		}
	}

	keyCols := keyColumnAliases(keyNames)

	// joinedInner builds the shard-side SELECT for the single-pass kinds:
	// grid expression per (fingerprint, group key), group-key join against
	// the local series table.
	joinedInner := func(gridExpr string, excludeStale bool) (string, []any, error) {
		seriesSQL, seriesArgs, err := seriesSub(localTsTable)
		if err != nil {
			return "", nil, err
		}
		sb := sqlbuilder.NewSelectBuilder()
		selects := make([]string, 0, len(keyCols)+1)
		// A fingerprint is the hash of one labelset, so every group-key
		// column is functionally dependent on it: any() is exact, and
		// grouping by the fingerprint alone spares hashing the joined
		// string per sample row — measured -10-13% on a 1.9B-row rate.
		for _, col := range keyCols {
			selects = append(selects, fmt.Sprintf("any(series.%s) AS %s", col, col))
		}
		sb.Select(append(selects, gridExpr+" AS grid")...)
		sb.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, metricstelemetryschema.SamplesV4TableName))
		sb.JoinWithOption(sqlbuilder.InnerJoin, fmt.Sprintf("(%s) AS series", seriesSQL), "points.fingerprint = series.fingerprint")
		samplesConditions(sb, excludeStale)
		sb.GroupBy("points.fingerprint")
		q, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		// The join text renders before WHERE: its args come first.
		return q, append(seriesArgs, args...), nil
	}

	var inner string
	var innerArgs []any
	var err error
	switch unit.kind {
	case unitInstant:
		// Instant selection with stale shadowing: the grid value is the last
		// non-stale sample in (t-lookback, t], absent when the overall last
		// sample in that window is a stale marker (verified semantics: the
		// -If combinator applies to the grid aggregates, and NULL comparisons
		// make a stale-latest point absent).
		gridParams := fmt.Sprintf("(fromUnixTimestamp64Milli(%d), fromUnixTimestamp64Milli(%d), %d, %d)", selStart, selEnd, stepSec, windowSec)
		gridExpr := fmt.Sprintf(
			"arrayMap((tall, tok, vok) -> if(tall IS NULL OR tok IS NULL OR tall != tok, NULL, vok), timeSeriesLastToGrid%s(fromUnixTimestamp64Milli(unix_milli), toFloat64(unix_milli)), timeSeriesLastToGridIf%s(fromUnixTimestamp64Milli(unix_milli), toFloat64(unix_milli), bitAnd(flags, 1) = 0), timeSeriesLastToGridIf%s(fromUnixTimestamp64Milli(unix_milli), value, bitAnd(flags, 1) = 0))",
			gridParams, gridParams, gridParams,
		)
		inner, innerArgs, err = joinedInner(gridExpr, false)
	case unitOverTime:
		if unit.overFn == "last" {
			// last_over_time == last non-stale sample in the window: the
			// stale rows are already excluded in WHERE.
			gridExpr := fmt.Sprintf(
				"timeSeriesLastToGrid(fromUnixTimestamp64Milli(%d), fromUnixTimestamp64Milli(%d), %d, %d)(fromUnixTimestamp64Milli(unix_milli), value)",
				selStart, selEnd, stepSec, windowSec,
			)
			inner, innerArgs, err = joinedInner(gridExpr, true)
			break
		}
		inner, innerArgs, err = windowedInner(unit, samplesConditions, seriesSub, keyCols, localTsTable, selStart, selEnd, stepMs, windowMs)
	default: // unitRange
		gridExpr := fmt.Sprintf(
			"%s(fromUnixTimestamp64Milli(%d), fromUnixTimestamp64Milli(%d), %d, %d)(fromUnixTimestamp64Milli(unix_milli), value)",
			gridFunction[unit.fn], selStart, selEnd, stepSec, windowSec,
		)
		if unit.fn == fnIncrease {
			// increase == rate * range-seconds, exactly: extrapolatedRate
			// divides by the range only when isRate.
			gridExpr = fmt.Sprintf("arrayMap(x -> x * %d, %s)", windowSec, gridExpr)
		}
		inner, innerArgs, err = joinedInner(gridExpr, true)
	}
	if err != nil {
		return "", nil, err
	}

	spatial := "maxForEach(grid)"
	switch {
	case !unit.hasAgg:
		// Per-series output: one row per (labels-minus-__name__) group.
		// Distinct fingerprints can collapse onto the same projected label
		// set only via a regex __name__ selector over metrics with identical
		// other labels; maxForEach is a deterministic NULL-skipping merge and
		// the identity for the overwhelmingly common one-fingerprint group.
	case unit.aggOp.String() == "count":
		// count over an all-absent index is an absent point, not 0.
		spatial = "arrayMap(c -> if(c = 0, NULL, toFloat64(c)), countForEach(grid))"
	default:
		spatial = fmt.Sprintf("%s(grid)", aggForEach[unit.aggOp.String()])
	}

	keyList := strings.Join(keyCols, ", ")
	query := fmt.Sprintf("SELECT %s, %s AS grid FROM (%s) GROUP BY %s %s", keyList, spatial, inner, keyList, gridFunctionsSetting)
	return query, innerArgs, nil
}

// groupKeyColumns returns the label names to extract as plain group-key
// columns, or nil when the unit needs the canonical JSON key instead. Only
// by (...) grouping qualifies: its projection is a known short list, so
// extracting each label directly beats building, sorting and stringifying
// every label pair per row. without and no-aggregation project a label SET
// that varies per series — there the sorted-JSON key is load-bearing: the
// sort is what makes two fingerprints with different stored JSON key order
// land in one group, and the string carries the labels back out.
func groupKeyColumns(unit *coreUnit) []string {
	if unit.hasAgg && unit.by && len(unit.grouping) > 0 {
		return unit.grouping
	}
	return nil
}

// keyColumnAliases names the group-key columns in every SELECT level: g0..gN
// for direct extraction, the single canonical gkey otherwise.
func keyColumnAliases(keyNames []string) []string {
	if keyNames == nil {
		return []string{"gkey"}
	}
	cols := make([]string, len(keyNames))
	for i := range keyNames {
		cols[i] = fmt.Sprintf("g%d", i)
	}
	return cols
}

// windowedInner builds the avg/min/max/sum/count _over_time form without
// fanning samples out. It runs only when the range is a whole multiple of
// the step (see the transpile gate), because then the window
// (t_k - range, t_k] is exactly the union of W = range/step step buckets —
// both are left-open on the same boundaries — so bucket membership fully
// determines window membership. Fanning each sample into all W windows it
// covers (ARRAY JOIN) multiplies rows by W, which at long ranges over short
// steps is a row explosion measured in billions.
//
// The bucketing itself is the -Resample combinator: one group per (series,
// group key) whose state is a fixed array of per-bucket aggregates, updated
// in place per sample. Grouping by (series, bucket) instead — measured on a
// 100k-series x 371-bucket workload — creates a 37M-entry hash aggregation
// whose per-thread partial tables scale memory WITH max_threads (12 -> 48
// GiB from 2 to 8 threads, dead at 16) and ships one row per group to the
// initiator; the Resample form carries the same numbers in 100k compact
// array states, like every other unit kind.
//
// The wrapper level slides the window: slot k combines buckets k..k+W-1 by
// direct aggregation over at most W partials — no prefix-sum tricks, so no
// large-minus-large cancellation against the engine's directly-summed
// windows. A slot with zero window count is absent, which also keeps
// min/max honest: their slices filter on the bucket counts, so an empty
// bucket's zero-fill can never be mistaken for a value (a real sample can
// legitimately be 0 or +Inf).
func windowedInner(unit *coreUnit, samplesConditions func(*sqlbuilder.SelectBuilder, bool), seriesSub func(string) (string, []any, error), keyCols []string, localSeriesTable string, selStart, selEnd, stepMs, windowMs int64) (string, []any, error) {
	effStepMs := stepMs
	if effStepMs == 0 {
		effStepMs = 1000
	}
	lastIdx := (selEnd - selStart) / effStepMs
	gridLen := lastIdx + 1
	w := windowMs / effStepMs
	bucketLen := gridLen + w

	// A window narrower than the step makes the windows (t_k - range, t_k]
	// pairwise disjoint. There is nothing to slide. Each slot reads exactly
	// its own window's aggregate. This is exact ONLY over sliver-filtered
	// rows (samplesConditions adds the window<step predicate): the index
	// below assigns every gap sample to the window above it, and the
	// filter removes those samples. This needs a real step. Instant
	// queries carry no sliver filter, so they keep the tiled form and its
	// gates.
	disjoint := stepMs > 0 && windowMs < stepMs
	if disjoint {
		w = 1
		bucketLen = gridLen
	}

	seriesSQL, seriesArgs, err := seriesSub(localSeriesTable)
	if err != nil {
		return "", nil, err
	}

	// Bucket index, shifted so the earliest in-window sample lands at 0:
	// jj = ceil((ts - selStart)/step) + W - 1, folded into one intDiv.
	// Slot k's window is then buckets jj in [k, k+W-1]. In the disjoint
	// form, the same ceil lands each in-window sample directly on its slot
	// (W = 1). The numerator stays positive: the fetch floor is
	// selStart - range > selStart - step.
	jjShift := windowMs
	if disjoint {
		jjShift = effStepMs
	}
	jj := fmt.Sprintf("intDiv(unix_milli - %d + %d - 1, %d)", selStart, jjShift, effStepMs)
	buckets := sqlbuilder.NewSelectBuilder()
	selects := make([]string, 0, len(keyCols)+2)
	// any() over the group key: exact because the key is functionally
	// dependent on the fingerprint (see joinedInner).
	for _, col := range keyCols {
		selects = append(selects, fmt.Sprintf("any(series.%s) AS %s", col, col))
	}
	selects = append(selects, fmt.Sprintf("countResample(0, %d, 1)(value, %s) AS cnts", bucketLen, jj))
	if unit.overFn != "count" {
		selects = append(selects, fmt.Sprintf("%sResample(0, %d, 1)(value, %s) AS vals", map[string]string{
			"avg": "sum",
			"sum": "sum",
			"min": "min",
			"max": "max",
		}[unit.overFn], bucketLen, jj))
	}
	buckets.Select(selects...)
	buckets.From(fmt.Sprintf("%s.%s AS points", metricstelemetryschema.DBName, metricstelemetryschema.SamplesV4TableName))
	buckets.JoinWithOption(sqlbuilder.InnerJoin, fmt.Sprintf("(%s) AS series", seriesSQL), "points.fingerprint = series.fingerprint")
	samplesConditions(buckets, true)
	buckets.GroupBy("points.fingerprint")
	bucketsSQL, bucketsArgs := buckets.BuildWithFlavor(sqlbuilder.ClickHouse)

	windowCnt := fmt.Sprintf("arraySum(arraySlice(cnts, k + 1, %d))", w)
	var slot string
	switch unit.overFn {
	case "count":
		slot = fmt.Sprintf("if(%s = 0, NULL, toFloat64(%s))", windowCnt, windowCnt)
	case "sum":
		slot = fmt.Sprintf("if(%s = 0, NULL, arraySum(arraySlice(vals, k + 1, %d)))", windowCnt, w)
	case "avg":
		slot = fmt.Sprintf("if(%s = 0, NULL, arraySum(arraySlice(vals, k + 1, %d)) / %s)", windowCnt, w, windowCnt)
	case "min":
		slot = fmt.Sprintf("if(%s = 0, NULL, arrayMin(arrayFilter((v, c) -> c > 0, arraySlice(vals, k + 1, %d), arraySlice(cnts, k + 1, %d))))", windowCnt, w, w)
	case "max":
		slot = fmt.Sprintf("if(%s = 0, NULL, arrayMax(arrayFilter((v, c) -> c > 0, arraySlice(vals, k + 1, %d), arraySlice(cnts, k + 1, %d))))", windowCnt, w, w)
	}

	keyList := strings.Join(keyCols, ", ")
	inner := fmt.Sprintf(
		"SELECT %s, arrayMap(k -> %s, range(toUInt64(%d))) AS grid FROM (%s)",
		keyList, slot, gridLen, bucketsSQL,
	)
	return inner, append(seriesArgs, bucketsArgs...), nil
}

// groupKeyExpr renders the canonical JSON group key for the units whose
// projected label SET varies per series (see groupKeyColumns): the sorted
// [key, value] pairs of the projected labels, JSON-encoded.
//   - by () with no labels: one constant group;
//   - without (a, b): keep everything except the listed labels and __name__;
//   - no aggregation: keep everything including __name__ — even when the
//     unit drops the name from its OUTPUT, the key must keep it so distinct
//     metrics never merge in SQL; executeUnit strips the name afterwards and
//     turns a post-strip collision into the engine's duplicate-labelset
//     error instead of a silently invented merge.
func groupKeyExpr(unit *coreUnit) string {
	// An empty label value means "label absent" in Prometheus; the stored
	// labels JSON can carry empty attribute values, which must not become
	// output labels or group keys.
	pairs := "arraySort(JSONExtractKeysAndValues(labels, 'String'))"
	if !unit.hasAgg {
		return fmt.Sprintf("toJSONString(arrayFilter(p -> p.2 != '', %s))", pairs)
	}
	if unit.by {
		// Non-empty by (...) never reaches here; groupKeyColumns extracts
		// those labels as plain columns instead.
		return "'[]'"
	}
	excluded := append([]string{metricNameLabel}, unit.grouping...)
	return fmt.Sprintf("toJSONString(arrayFilter(p -> p.2 != '' AND p.1 NOT IN (%s), %s))", quotedList(excluded), pairs)
}

func quotedList(items []string) string {
	quoted := make([]string, len(items))
	for i, s := range items {
		quoted[i] = "'" + strings.ReplaceAll(s, "'", "\\'") + "'"
	}
	return strings.Join(quoted, ", ")
}
