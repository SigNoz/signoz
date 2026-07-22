#!/bin/bash
# Relative cost of the epoch pipeline vs legacy at scale.
# 2000 cumulative series, 24h at 30s interval = 5.76M samples, each series
# resetting every ~6h (4 epochs/day). Uses the same db as the harness but a
# separate metric name so correctness runs stay isolated.
set -eu
cd "$(dirname "$0")"
CH="clickhouse local --path chdata"

B=1784332800000

echo "== generating bench data in-db (5.76M samples) =="
$CH -q "
INSERT INTO signoz_metrics.samples_v4
SELECT
    'default' AS env,
    'Cumulative' AS temporality,
    'bench_counter' AS metric_name,
    10000 + intDiv(number, 2880) AS fingerprint,
    $B - 3600000 + (number % 2880) * 30000 AS unix_milli,
    -- value grows 2/point within each 6h epoch, resets to 0 at epoch change
    2.0 * ((number % 2880) % 720) AS value,
    0 AS flags,
    $B AS inserted_at_unix_milli,
    -- epoch = start of the series' current 6h segment
    $B - 3600000 + intDiv((number % 2880), 720) * 720 * 30000 AS start_ts
FROM numbers(2000 * 2880);

INSERT INTO signoz_metrics.time_series_v4_1day
SELECT 'default', 'Cumulative', 'bench_counter', 10000 + number,
       ts, '{\"scenario\":\"bench\"}'
FROM numbers(2000) ARRAY JOIN [toInt64($B - 86400000), toInt64($B)] AS ts;
"

$CH -q "SELECT 'bench samples', count() FROM signoz_metrics.samples_v4 WHERE metric_name = 'bench_counter'"

# adapt the emitted harness queries to the bench metric
mkdir -p bench_queries
for f in e_inc_300_raw l_inc_300_raw e_inc_60_raw l_inc_60_raw; do
  sed "s/it_counter_total/bench_counter/g" "queries/$f.sql" > "bench_queries/$f.sql"
done

echo "== timing (3 runs each, seconds) =="
for f in l_inc_60_raw e_inc_60_raw l_inc_300_raw e_inc_300_raw; do
  printf "%-16s" "$f"
  for i in 1 2 3; do
    t0=$(python3 -c 'import time; print(time.time())')
    $CH --queries-file "bench_queries/$f.sql" > /dev/null
    t1=$(python3 -c 'import time; print(time.time())')
    printf " %.2f" "$(python3 -c "print($t1 - $t0)")"
  done
  echo
done

echo "== row counts through the pipeline (step=300) =="
$CH -q "
SELECT 'raw rows scanned' AS stage, count() AS rows FROM signoz_metrics.samples_v4 WHERE metric_name = 'bench_counter'
UNION ALL
SELECT 'L1 series-bucket groups', count() FROM (
  SELECT fingerprint, intDiv(unix_milli, 300000) FROM signoz_metrics.samples_v4
  WHERE metric_name = 'bench_counter' GROUP BY 1, 2)
UNION ALL
SELECT 'L3 rows after ARRAY JOIN', sum(n) FROM (
  SELECT length(maxMap(map(start_ts, value))) AS n FROM signoz_metrics.samples_v4
  WHERE metric_name = 'bench_counter' GROUP BY fingerprint, intDiv(unix_milli, 300000))
ORDER BY stage"
