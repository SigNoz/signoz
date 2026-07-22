package telemetrymetrics

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

// Epoch-aware temporal aggregation for cumulative counters.
//
// A cumulative monotonic series is split by the collector into epochs: runs of
// samples sharing a normalized start_ts, monotonic non-decreasing within each
// run. Per (series, step bucket, epoch) the min and max value are therefore
// the first and last observations, and the increase over any window is the sum
// of per-epoch growth — exact regardless of how many resets happened inside a
// bucket, and identical at every step interval.
//
// start_ts = 0 is the "unknown epoch": rows written before the collector
// rollout, sources that never send a start time, and every non-cumulative
// sample. Key-0 rows flow through the same pipeline with the legacy
// negative-diff pair rule, so a query over old data reproduces today's
// results, a query over new data is reset-exact, and a query spanning the
// rollout boundary seams the two together per row without any watermark
// configuration.
//
// The pipeline has four layers, built innermost first:
//
//	L1  per (fingerprint, bucket): __first_by_epoch / __last_by_epoch maps
//	    (raw tables build them from map(start_ts, value); the 5m/30m rollups
//	    merge their pre-aggregated map states, falling back to the scalar
//	    min/max columns as key 0 for rows written before migration 1012)
//	L2  per-series bucket window: previous bucket ts / overall max, the last
//	    known key-0 value, and row numbers
//	L3  ARRAY JOIN over epochs + per-(series, epoch) window: previous value of
//	    THIS epoch, then the per-epoch contribution (the multiIf below)
//	L4  regroup to (fingerprint, bucket): increase = sum of finite
//	    contributions, NaN when none; rate divides by the distance to the
//	    previous bucket of the series (step for the first)
//
// Contribution rules, in branch order:
//
//	epoch != 0, seen before        -> last - previous last of this epoch
//	                                  (negative-diff clamp only as a guard for
//	                                  invariant violations upstream)
//	epoch != 0, first time, series
//	has current/earlier key-0 rows -> pair rule against the nearest key-0
//	                                  value (the rollout seam: continuation
//	                                  subtracts it, a drop keeps base 0)
//	epoch != 0, first time, epoch
//	born inside the fetched range  -> full value (the counter started at 0
//	                                  after the range began; this is what
//	                                  makes a single-shot script visible)
//	epoch != 0, first time, born
//	before the range               -> last - first within the bucket (growth
//	                                  we can actually see; the pre-range part
//	                                  is unknowable)
//	epoch  = 0, first bucket       -> NaN (legacy first-point behavior)
//	epoch  = 0, otherwise          -> legacy pair rule against the previous
//	                                  bucket's overall max (covers pure legacy
//	                                  data and the epoch->0 downgrade seam)
const (
	// L2: bucket-level series window. %s placeholders: group-by column list
	// (with trailing comma or empty), inner query.
	epochBucketWindowTmpl = `SELECT
  fingerprint,
  ts,
  %s__first_by_epoch,
  __last_by_epoch,
  mapContains(__last_by_epoch, toInt64(0)) AS __has0,
  __last_by_epoch[toInt64(0)] AS __v0,
  anyLastIf(__v0, __has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __prev_v0,
  max(__has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __ever_had0,
  arrayMax(mapValues(__last_by_epoch)) AS __bucket_max,
  lagInFrame(__bucket_max, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_max,
  lagInFrame(ts, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_ts,
  row_number() OVER (PARTITION BY fingerprint ORDER BY ts) AS __bucket_rn
FROM (%s)`

	// L3: explode epochs and compute per-epoch contributions. %s / %d
	// placeholders: group-by list, L2 query, fetch-range start in ms.
	epochContribTmpl = `SELECT
  fingerprint,
  ts,
  %s__prev_bucket_ts,
  __bucket_rn,
  __kv.1 AS __epoch,
  __kv.2 AS __lval,
  __first_by_epoch[__kv.1] AS __fval,
  lagInFrame(__lval, 1) OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_lval,
  row_number() OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts) AS __epoch_rn,
  multiIf(
    __epoch != 0 AND __epoch_rn > 1, if(__lval >= __prev_lval, __lval - __prev_lval, __lval),
    __epoch != 0 AND (__has0 OR __ever_had0), __lval - if(__fval >= if(__has0, __v0, __prev_v0), if(__has0, __v0, __prev_v0), 0.),
    __epoch != 0 AND __epoch >= %d, __lval,
    __epoch != 0, __lval - __fval,
    __bucket_rn = 1, nan,
    __lval < __prev_bucket_max, __lval,
    __lval - __prev_bucket_max
  ) AS __contrib
FROM (%s) ARRAY JOIN arrayZip(mapKeys(__last_by_epoch), mapValues(__last_by_epoch)) AS __kv`

	// L4 for increase: regroup to (series, bucket). Buckets before the display
	// start exist only to provide bases (the one-step lookback the range was
	// extended by); they are cut so the output shape matches the legacy path,
	// which always turned them into NaN. %s/%d: group-by list, L3 query,
	// display start (s), group-by list for GROUP BY.
	epochIncreaseTmpl = `SELECT
  ts,
  %sif(countIf(isNaN(__contrib) = 0) > 0, sumIf(__contrib, isNaN(__contrib) = 0), nan) AS per_series_value
FROM (%s)
WHERE ts >= toDateTime(%d)
GROUP BY fingerprint, ts%s`

	// L4 for rate: same, divided by the distance to the previous bucket of the
	// series (falls back to the step for its first bucket). %d: step seconds.
	epochRateTmpl = `SELECT
  ts,
  %sif(
    countIf(isNaN(__contrib) = 0) > 0,
    sumIf(__contrib, isNaN(__contrib) = 0) / if(any(__bucket_rn) > 1, ts - any(__prev_bucket_ts), %d),
    nan
  ) AS per_series_value
FROM (%s)
WHERE ts >= toDateTime(%d)
GROUP BY fingerprint, ts%s`
)

// epochMapExpressions returns the L1 select expressions building
// __first_by_epoch / __last_by_epoch for the given samples table.
func epochMapExpressions(samplesTable string) []string {
	if samplesTable == SamplesV4Agg5mTableName || samplesTable == SamplesV4Agg30mTableName {
		// merge the rollup map states; rows written before migration 1012 have
		// empty maps, so a bucket made only of such rows falls back to the
		// scalar min/max columns as the unknown epoch
		return []string{
			"minMap(min_value_by_start_ts) AS __first_map_merged",
			"maxMap(max_value_by_start_ts) AS __last_map_merged",
			"if(length(__first_map_merged) = 0, map(toInt64(0), min(min)), __first_map_merged) AS __first_by_epoch",
			"if(length(__last_map_merged) = 0, map(toInt64(0), max(max)), __last_map_merged) AS __last_by_epoch",
		}
	}
	return []string{
		"minMap(map(start_ts, value)) AS __first_by_epoch",
		"maxMap(map(start_ts, value)) AS __last_by_epoch",
	}
}

// epochGroupByList renders group-by columns as a quoted, comma-terminated
// prefix ("`a`, `b`, ") for interpolation into the layer templates.
func epochGroupByList(groupBy []qbtypes.GroupByKey) string {
	if len(groupBy) == 0 {
		return ""
	}
	var sb strings.Builder
	for _, g := range groupBy {
		fmt.Fprintf(&sb, "`%s`, ", g.Name)
	}
	return sb.String()
}

// buildTemporalAggCumulativeEpochs builds the reset-exact temporal aggregation
// CTE body for cumulative rate/increase. extraSamplesFilter is an optional raw
// WHERE fragment (used by the mixed-temporality union to split delta rows from
// the rest); wrapCTE controls whether the result is wrapped as
// __temporal_aggregation_cte.
func (b *MetricQueryStatementBuilder) buildTemporalAggCumulativeEpochs(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
	extraSamplesFilter string,
	wrapCTE bool,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	// L1: per (fingerprint, bucket) epoch maps
	baseSb := sqlbuilder.NewSelectBuilder()
	baseSb.Select("fingerprint")
	baseSb.SelectMore(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		baseSb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}
	for _, expr := range epochMapExpressions(samplesTable) {
		baseSb.SelectMore(expr)
	}
	baseSb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
	baseSb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	baseSb.Where(
		baseSb.In("metric_name", query.Aggregations[0].MetricName),
		baseSb.GTE("unix_milli", start),
		baseSb.LT("unix_milli", end),
	)
	if samplesTable != SamplesV4Agg5mTableName && samplesTable != SamplesV4Agg30mTableName {
		// the rollup MVs already exclude stale markers; the raw path must too:
		// a no-recorded-value row would drag an epoch's first observation to 0
		// and overstate its first bucket (legacy max() was immune, minMap isn't)
		baseSb.Where("bitAnd(flags, 1) = 0")
	}
	if extraSamplesFilter != "" {
		baseSb.Where(extraSamplesFilter)
	}
	baseSb.GroupBy("fingerprint", "ts")
	baseSb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	baseSb.OrderBy("fingerprint", "ts")
	l1Query, l1Args := baseSb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)

	gbList := epochGroupByList(query.GroupBy)

	// L2: bucket-level series window
	l2Query := fmt.Sprintf(epochBucketWindowTmpl, gbList, l1Query)

	// L3: per-epoch contributions; epochs born at/after the fetched range
	// start are complete in the data, so base 0 is exact for them
	l3Query := fmt.Sprintf(epochContribTmpl, gbList, int64(start), l2Query)

	// L4: per-series value per bucket. The fetched range was extended one step
	// behind the display range for bases (AdjustedMetricTimeRange); those
	// lookback buckets are cut from the output.
	displayStartSec := (int64(start) + stepSec*1000) / 1000
	gbGroupSuffix := ""
	if len(query.GroupBy) > 0 {
		gbGroupSuffix = ", " + strings.TrimSuffix(gbList, ", ")
	}
	var l4Query string
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		l4Query = fmt.Sprintf(epochRateTmpl, gbList, stepSec, l3Query, displayStartSec, gbGroupSuffix)
	} else {
		l4Query = fmt.Sprintf(epochIncreaseTmpl, gbList, l3Query, displayStartSec, gbGroupSuffix)
	}

	if !wrapCTE {
		return l4Query, l1Args, nil
	}
	return fmt.Sprintf("__temporal_aggregation_cte AS (%s)", l4Query), l1Args, nil
}

// buildTemporalAggMultiTemporalityEpochs handles metrics reporting under both
// delta and cumulative temporality when the epoch pipeline is enabled: the two
// populations get their own correct aggregation and are unioned into one
// temporal CTE. (The legacy path multiplexes them through a single windowed
// expression instead, which cannot be made reset-exact.)
func (b *MetricQueryStatementBuilder) buildTemporalAggMultiTemporalityEpochs(
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	samplesTable string,
	timeSeriesCTE string,
	timeSeriesCTEArgs []any,
) (string, []any, error) {
	stepSec := int64(query.StepInterval.Seconds())

	// delta side: per-bucket sum, no windowing needed
	deltaSb := sqlbuilder.NewSelectBuilder()
	deltaSb.Select(fmt.Sprintf(
		"toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(%d)) AS ts",
		stepSec,
	))
	for _, g := range query.GroupBy {
		deltaSb.SelectMore(fmt.Sprintf("`%s`", g.Name))
	}
	deltaAggCol, err := AggregationColumnForSamplesTable(samplesTable, metrictypes.Delta, query.Aggregations[0].TimeAggregation)
	if err != nil {
		return "", nil, err
	}
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		deltaAggCol = fmt.Sprintf("%s/%d", deltaAggCol, stepSec)
	}
	deltaSb.SelectMore(fmt.Sprintf("%s AS per_series_value", deltaAggCol))
	deltaSb.From(fmt.Sprintf("%s.%s AS points", DBName, samplesTable))
	deltaSb.JoinWithOption(sqlbuilder.InnerJoin, timeSeriesCTE, "points.fingerprint = filtered_time_series.fingerprint")
	// the range was extended one step behind the display start for cumulative
	// bases; delta needs no base, so it reads only the display range
	deltaSb.Where(
		deltaSb.In("metric_name", query.Aggregations[0].MetricName),
		deltaSb.GTE("unix_milli", uint64(int64(start)+stepSec*1000)),
		deltaSb.LT("unix_milli", end),
		"LOWER(temporality) LIKE LOWER('Delta')",
	)
	deltaSb.GroupBy("fingerprint", "ts")
	deltaSb.GroupBy(querybuilder.GroupByKeys(query.GroupBy)...)
	deltaQuery, deltaArgs := deltaSb.BuildWithFlavor(sqlbuilder.ClickHouse, timeSeriesCTEArgs...)

	// cumulative (and unspecified) side: the epoch pipeline
	cumulativeQuery, cumulativeArgs, err := b.buildTemporalAggCumulativeEpochs(
		start, end, query, samplesTable, timeSeriesCTE, timeSeriesCTEArgs,
		"NOT (LOWER(temporality) LIKE LOWER('Delta'))",
		false,
	)
	if err != nil {
		return "", nil, err
	}

	frag := fmt.Sprintf(
		"__temporal_aggregation_cte AS (SELECT * FROM (%s) UNION ALL SELECT * FROM (%s))",
		deltaQuery, cumulativeQuery,
	)
	args := append(append([]any{}, deltaArgs...), cumulativeArgs...)
	return frag, args, nil
}
