#!/bin/bash
# Layer-by-layer cost decomposition of the epoch pipeline on the whale dataset
# (50k series, 144M rows, step=300, 14.4M series-buckets). All queries FORMAT
# Null (compute only). Deltas between successive stages = per-layer cost.
set -eu
cd "$(dirname "$0")"
CH="clickhouse local --path chdata_large"

TS_JOIN="INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'scenario') AS scenario FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ('bench2_counter') AND unix_milli >= 1784246400000 AND unix_milli <= 1784419200000 AND LOWER(temporality) LIKE LOWER('cumulative') GROUP BY fingerprint, scenario) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint"
WHERE="WHERE metric_name IN ('bench2_counter') AND unix_milli >= 1784332500000 AND unix_milli < 1784419200000 AND bitAnd(flags, 1) = 0"
BUCKET="toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts"

L1_LEGACY="SELECT fingerprint, $BUCKET, scenario, max(value) AS per_series_value FROM signoz_metrics.samples_v4 AS points $TS_JOIN $WHERE GROUP BY fingerprint, ts, scenario ORDER BY fingerprint, ts"

L1_EPOCH="SELECT fingerprint, $BUCKET, scenario, minMap(map(start_ts, value)) AS __first_by_epoch, maxMap(map(start_ts, value)) AS __last_by_epoch FROM signoz_metrics.samples_v4 AS points $TS_JOIN $WHERE GROUP BY fingerprint, ts, scenario ORDER BY fingerprint, ts"

# two-level alternative: scalar states grouped by (series, bucket, epoch),
# maps built over the 10x smaller collapsed set
L1_TWOLEVEL="SELECT fingerprint, ts, scenario, minMap(map(start_ts, mn)) AS __first_by_epoch, maxMap(map(start_ts, mx)) AS __last_by_epoch FROM (SELECT fingerprint, $BUCKET, scenario, start_ts, min(value) AS mn, max(value) AS mx FROM signoz_metrics.samples_v4 AS points $TS_JOIN $WHERE GROUP BY fingerprint, ts, scenario, start_ts) GROUP BY fingerprint, ts, scenario ORDER BY fingerprint, ts"

L2="SELECT fingerprint, ts, scenario, __first_by_epoch, __last_by_epoch, mapContains(__last_by_epoch, toInt64(0)) AS __has0, __last_by_epoch[toInt64(0)] AS __v0, anyLastIf(__v0, __has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __prev_v0, max(__has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __ever_had0, arrayMax(mapValues(__last_by_epoch)) AS __bucket_max, lagInFrame(__bucket_max, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_max, lagInFrame(ts, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_ts, row_number() OVER (PARTITION BY fingerprint ORDER BY ts) AS __bucket_rn FROM (%s)"

L3="SELECT fingerprint, ts, scenario, __prev_bucket_ts, __bucket_rn, __kv.1 AS __epoch, __kv.2 AS __lval, __first_by_epoch[__kv.1] AS __fval, lagInFrame(__lval, 1) OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_lval, row_number() OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts) AS __epoch_rn, multiIf(__epoch != 0 AND __epoch_rn > 1, if(__lval >= __prev_lval, __lval - __prev_lval, __lval), __epoch != 0 AND (__has0 OR __ever_had0), __lval - if(__fval >= if(__has0, __v0, __prev_v0), if(__has0, __v0, __prev_v0), 0.), __epoch != 0 AND __epoch >= 1784332500000, __lval, __epoch != 0, __lval - __fval, __bucket_rn = 1, nan, __lval < __prev_bucket_max, __lval, __lval - __prev_bucket_max) AS __contrib FROM (%s) ARRAY JOIN arrayZip(mapKeys(__last_by_epoch), mapValues(__last_by_epoch)) AS __kv"

L4="SELECT ts, scenario, if(countIf(isNaN(__contrib) = 0) > 0, sumIf(__contrib, isNaN(__contrib) = 0), nan) AS per_series_value FROM (%s) WHERE ts >= toDateTime(1784332800) GROUP BY fingerprint, ts, scenario"

SPATIAL="SELECT ts, scenario, sum(per_series_value) AS value FROM (%s) WHERE isNaN(per_series_value) = 0 GROUP BY ts, scenario"

run() {
  local label="$1"; local sql="$2"
  printf "%-34s" "$label"
  for i in 1 2 3; do
    t0=$(python3 -c 'import time; print(time.time())')
    $CH -q "$sql FORMAT Null"
    t1=$(python3 -c 'import time; print(time.time())')
    printf " %6.2f" "$(python3 -c "print($t1 - $t0)")"
  done
  echo
}

printf -v Q_L2 "$L2" "$L1_EPOCH"
printf -v Q_L3 "$L3" "$Q_L2"
printf -v Q_L4 "$L4" "$Q_L3"
printf -v Q_FULL "$SPATIAL" "$Q_L4"
printf -v Q_LEGACY_FULL "$SPATIAL" "SELECT ts, scenario, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) AS per_series_value FROM ($L1_LEGACY) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)"

printf -v Q_L2_TL "$L2" "$L1_TWOLEVEL"
printf -v Q_L3_TL "$L3" "$Q_L2_TL"
printf -v Q_L4_TL "$L4" "$Q_L3_TL"
printf -v Q_FULL_TL "$SPATIAL" "$Q_L4_TL"

echo "== layer decomposition (3 runs each, seconds; deltas = layer cost) =="
run "A. L1 legacy (scalar max)"       "$L1_LEGACY"
run "B. L1 epoch (per-row maps)"      "$L1_EPOCH"
run "C. L1 two-level (scalars->maps)" "$L1_TWOLEVEL"
run "D. L1e + L2 window"              "$Q_L2"
run "E. L1e + L2 + L3 explode+window" "$Q_L3"
run "F. full epoch (=E+L4+spatial)"   "$Q_FULL"
run "G. full epoch w/ two-level L1"   "$Q_FULL_TL"
run "H. full legacy"                  "$Q_LEGACY_FULL"

echo "== sanity: two-level L1 produces identical final results =="
$CH -q "SELECT count(), round(sum(value), 3) FROM ($Q_FULL)"
$CH -q "SELECT count(), round(sum(value), 3) FROM ($Q_FULL_TL)"
