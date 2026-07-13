package clickhouseprometheusv2

import (
	"fmt"
	"strings"

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

// buildUnitSQL renders the single ClickHouse query evaluating a core unit
// over the [startMs, endMs] / stepMs evaluation grid: per-series grids via a
// timeSeries*ToGrid aggregate (or a windowed aggregation for *_over_time),
// then spatial aggregation with -ForEach combinators grouped by a canonical
// JSON key of the projected label pairs.
//
// The heavy level is shaped to run on the shards: the top-level FROM is the
// distributed samples table and the group-key join partner is a subquery on
// the shard-local time series table, so the shard rewrite executes the join
// and the per-(fingerprint, gkey) grid aggregation next to the data —
// complete by fingerprint co-locality (see localTimeSeriesTable) — and the
// initiator only merges per-series grid states and applies the spatial
// -ForEach step. Same layout as the telemetrymetrics statement builder. The
// windowed *_over_time form is the exception: its ARRAY JOIN level
// aggregates on the shards the same way, but the group-key join happens at
// the initiator over the already-reduced per-(series, index) rows — pushing
// it down would not move any data off the initiator (the reduced rows arrive
// there either way), so the combined ARRAY JOIN + JOIN form buys nothing.
//
// inlineFingerprints carries the matched set when it fits the inline limit;
// nil means over the limit, where the group-key join restricts on its own
// (the windowed form, whose fan-out query has no join, falls back to a
// shard-local semi-join so it does not expand every series of the metric).
//
// The selector's data window is offset-shifted; the resulting grid indices
// map 1:1 onto the query grid (output ts = startMs + i*stepMs). Grid
// parameters are rendered as literals — they are aggregate-function
// parameters, not bindable values.
//
// Statements nest builder-rendered SQL as text, so the returned args must be
// ordered by where each fragment lands in the final statement: ClickHouse
// binds ? placeholders by position. A JOIN renders before WHERE, so a joined
// subquery's args precede the outer query's own condition args.
//
// Row shape: (gkey String, grid Array(Nullable(Float64))). gkey is
// toJSONString of the sorted projected [key, value] pairs; NULL grid points
// are absent points (the engine's "no value here"), which the -ForEach
// combinators preserve: an index where every series is NULL aggregates to
// NULL, and countForEach's 0 is mapped back to NULL.
func buildUnitSQL(unit *coreUnit, metricNames []string, inlineFingerprints []uint64, dataStart, dataEnd int64, startMs, endMs, stepMs, lookbackMs int64) (string, []any, error) {
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

	adjustedTsStart, tsTable := timeSeriesTableFor(dataStart, dataEnd)

	// seriesSub computes fingerprint -> group key. It reads the local series
	// table when it rides inside the shard-rewritten samples query, and the
	// distributed one when it joins at the initiator (windowed form).
	seriesSub := func(table string) (string, []any, error) {
		sub := sqlbuilder.NewSelectBuilder()
		sub.Select("fingerprint", groupKeyExpr(unit)+" AS gkey")
		sub.From(fmt.Sprintf("%s.%s", databaseName, table))
		if err := applySeriesConditions(sub, adjustedTsStart, dataEnd, unit.matchers); err != nil {
			return "", nil, err
		}
		sub.GroupBy("fingerprint", "gkey")
		q, args := sub.BuildWithFlavor(sqlbuilder.ClickHouse)
		return q, args, nil
	}

	// samplesConditions adds the samples-side WHERE. The samples table is
	// aliased "points" in every kind: under the group-key join both sides
	// carry a fingerprint column, so the filter must qualify it. A nil
	// inline set adds no fingerprint condition — the join restricts.
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
		if inlineFingerprints != nil {
			sb.Where("points.fingerprint " + inlineFingerprintFilter(inlineFingerprints))
		}
		// Left-open window: a sample exactly at the window's lower boundary
		// is never used (range selectors and lookback are both left-open).
		sb.Where(sb.GT("unix_milli", selStart-windowMs), sb.LTE("unix_milli", selEnd))
		if excludeStale {
			// PromQL excludes stale markers from range vectors. Instant
			// selectors need the stale rows for shadowing instead.
			sb.Where("bitAnd(flags, 1) = 0")
		}
	}

	// joinedInner builds the shard-side SELECT for the single-pass kinds:
	// grid expression per (fingerprint, gkey), group-key join against the
	// local series table.
	joinedInner := func(gridExpr string, excludeStale bool) (string, []any, error) {
		seriesSQL, seriesArgs, err := seriesSub(localTimeSeriesTable(tsTable))
		if err != nil {
			return "", nil, err
		}
		sb := sqlbuilder.NewSelectBuilder()
		sb.Select("series.gkey AS gkey", gridExpr+" AS grid")
		sb.From(fmt.Sprintf("%s.%s AS points", databaseName, distributedSamplesV4))
		sb.JoinWithOption(sqlbuilder.InnerJoin, fmt.Sprintf("(%s) AS series", seriesSQL), "points.fingerprint = series.fingerprint")
		samplesConditions(sb, excludeStale)
		sb.GroupBy("points.fingerprint", "series.gkey")
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
		inner, innerArgs, err = windowedInner(unit, samplesConditions, seriesSub, inlineFingerprints == nil, adjustedTsStart, dataEnd, tsTable, selStart, selEnd, stepMs, windowMs)
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

	query := fmt.Sprintf("SELECT gkey, %s AS grid FROM (%s) GROUP BY gkey %s", spatial, inner, gridFunctionsSetting)
	return query, innerArgs, nil
}

// windowedInner builds the avg/min/max/sum/count _over_time form: each
// sample fans out to every grid index k whose window (t_k - range, t_k]
// contains it (ARRAY JOIN), aggregates per (fingerprint, k) — shard-side
// partials over the distributed table — then assembles the positional grid
// and joins the group key at the initiator over the reduced rows. The
// group-key subquery reads the distributed series table here because it does
// not ride inside a shard-rewritten query.
//
// This is the one form whose samples query has no series join, so an
// over-the-limit fingerprint set (semiJoin) must fall back to the
// shard-local semi-join: without it the fan-out would expand every series of
// the metric and discard the unmatched ones only at the group-key join.
func windowedInner(unit *coreUnit, samplesConditions func(*sqlbuilder.SelectBuilder, bool), seriesSub func(string) (string, []any, error), semiJoin bool, adjustedTsStart, dataEnd int64, tsTable string, selStart, selEnd, stepMs, windowMs int64) (string, []any, error) {
	aggExpr := map[string]string{
		"avg":   "avg(value)",
		"min":   "min(value)",
		"max":   "max(value)",
		"sum":   "sum(value)",
		"count": "toFloat64(count(value))",
	}[unit.overFn]
	effStepMs := stepMs
	if effStepMs == 0 {
		effStepMs = 1000
	}
	lastIdx := (selEnd - selStart) / effStepMs

	perWindow := sqlbuilder.NewSelectBuilder()
	perWindow.Select("fingerprint", "k", aggExpr+" AS v")
	perWindow.From(fmt.Sprintf(
		"%s.%s AS points ARRAY JOIN range(toUInt64(greatest(0, intDiv(unix_milli - %d + %d - 1, %d))), toUInt64(least(%d, intDiv(unix_milli + %d - 1 - %d, %d)) + 1)) AS k",
		databaseName, distributedSamplesV4,
		selStart, effStepMs, effStepMs,
		lastIdx, windowMs, selStart, effStepMs,
	))
	samplesConditions(perWindow, true)
	if semiJoin {
		sub := sqlbuilder.NewSelectBuilder()
		sub.Select("fingerprint")
		sub.From(fmt.Sprintf("%s.%s", databaseName, localTimeSeriesTable(tsTable)))
		if err := applySeriesConditions(sub, adjustedTsStart, dataEnd, unit.matchers); err != nil {
			return "", nil, err
		}
		perWindow.Where(perWindow.In("points.fingerprint", sub))
	}
	perWindow.GroupBy("fingerprint", "k")
	perWindowSQL, perWindowArgs := perWindow.BuildWithFlavor(sqlbuilder.ClickHouse)

	grids := fmt.Sprintf(
		"SELECT fingerprint, arrayMap(i -> if(indexOf(ks, i) = 0, NULL, vs[indexOf(ks, i)]), range(toUInt64(%d))) AS grid FROM (SELECT fingerprint, groupArray(k) AS ks, groupArray(v) AS vs FROM (%s) GROUP BY fingerprint)",
		lastIdx+1, perWindowSQL,
	)

	seriesSQL, seriesArgs, err := seriesSub(tsTable)
	if err != nil {
		return "", nil, err
	}
	inner := fmt.Sprintf(
		"SELECT series.gkey AS gkey, points.grid AS grid FROM (%s) AS points INNER JOIN (%s) AS series ON points.fingerprint = series.fingerprint",
		grids, seriesSQL,
	)
	return inner, append(perWindowArgs, seriesArgs...), nil
}

// groupKeyExpr renders the canonical group key for a unit: the sorted
// [key, value] pairs of the projected labels, JSON-encoded.
//   - by (a, b): keep only the listed labels (absent labels stay absent,
//     matching PromQL's by() over missing labels);
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
		if len(unit.grouping) == 0 {
			return "'[]'"
		}
		return fmt.Sprintf("toJSONString(arrayFilter(p -> p.2 != '' AND p.1 IN (%s), %s))", quotedList(unit.grouping), pairs)
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
