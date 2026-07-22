#!/bin/bash
# Large-scale benchmark: one big metric at a ~1B samples/day tenant.
#   50,000 series x 24h x 30s = 144M raw samples, a reset every 6h per series
#   (mid-bucket, so buckets at reset boundaries genuinely carry 2 epochs).
# Measures:
#   1. ingest throughput WITH migration-1012 MVs vs the legacy MVs (write cost)
#   2. query latency: legacy vs epoch pipeline, raw and rollup paths
#   3. peak RSS of the query process for the step=300 raw case
set -eu
cd "$(dirname "$0")"

B=1784332800000
N=$((50000 * 2880))

gen_insert() {
  local db_dir="$1"
  clickhouse local --path "$db_dir" -q "
INSERT INTO signoz_metrics.samples_v4
SELECT
    'default', 'Cumulative', 'bench2_counter',
    200000 + intDiv(number, 2880) AS fingerprint,
    $B - 3600000 + (number % 2880) * 30000 AS unix_milli,
    2.0 * ((number % 2880) - segfirst) AS value,
    0 AS flags,
    $B AS inserted_at_unix_milli,
    if(seg = 0, $B - 90000000, $B - 3600000 + segfirst * 30000 - 15000) AS start_ts
FROM (
  SELECT number,
    if(number % 2880 < 3, 0, intDiv(number % 2880 - 3, 720) + 1) AS seg,
    if(seg = 0, 0, 3 + (seg - 1) * 720) AS segfirst
  FROM numbers($N)
)
SETTINGS max_insert_threads = 4, max_partitions_per_insert_block = 100;

INSERT INTO signoz_metrics.time_series_v4_1day
SELECT 'default', 'Cumulative', 'bench2_counter', 200000 + number,
       ts, '{\"scenario\":\"bench2\"}'
FROM numbers(50000) ARRAY JOIN [toInt64($B - 86400000), toInt64($B)] AS ts;
"
}

echo "== A/B ingest: legacy MVs (fresh db) =="
rm -rf chdata_legacy
clickhouse local --path chdata_legacy --queries-file schema_legacy.sql
t0=$(python3 -c 'import time; print(time.time())')
gen_insert chdata_legacy
t1=$(python3 -c 'import time; print(time.time())')
LEG_INGEST=$(python3 -c "print(f'{$t1-$t0:.1f}')")
echo "legacy-MV ingest of ${N} rows: ${LEG_INGEST}s"

echo "== A/B ingest: migration-1012 MVs (fresh db) =="
rm -rf chdata_large
clickhouse local --path chdata_large --queries-file schema.sql
t0=$(python3 -c 'import time; print(time.time())')
gen_insert chdata_large
t1=$(python3 -c 'import time; print(time.time())')
NEW_INGEST=$(python3 -c "print(f'{$t1-$t0:.1f}')")
echo "epoch-MV ingest of ${N} rows: ${NEW_INGEST}s"

echo "== storage =="
for d in chdata_legacy chdata_large; do
  clickhouse local --path $d -q "
    SELECT '$d', table, formatReadableSize(sum(bytes_on_disk)) AS size, sum(rows) AS rows
    FROM system.parts WHERE database = 'signoz_metrics' AND active AND table LIKE 'samples%'
    GROUP BY table ORDER BY table"
done

echo "== queries (large db, 2 runs each, seconds) =="
mkdir -p bench_queries
for f in e_inc_300_raw l_inc_300_raw e_inc_300_agg5m e_inc_1800_agg30m; do
  sed "s/it_counter_total/bench2_counter/g" "queries/$f.sql" > "bench_queries/big_$f.sql"
done
# legacy comparison for the rollup path: reuse the epoch agg query's table by
# swapping metric in the legacy raw query is not enough — build legacy agg via
# the l_inc_300 shape but agg table (max(max)); simplest honest proxy: time the
# epoch agg query and the legacy raw query; legacy-agg sits between them.
for f in big_l_inc_300_raw big_e_inc_300_raw big_e_inc_300_agg5m big_e_inc_1800_agg30m; do
  printf "%-26s" "$f"
  for i in 1 2; do
    t0=$(python3 -c 'import time; print(time.time())')
    clickhouse local --path chdata_large --queries-file "bench_queries/$f.sql" > /dev/null
    t1=$(python3 -c 'import time; print(time.time())')
    printf " %.2f" "$(python3 -c "print($t1 - $t0)")"
  done
  echo
done

echo "== peak RSS (step=300 raw) =="
for f in big_l_inc_300_raw big_e_inc_300_raw; do
  rss=$( { /usr/bin/time -l clickhouse local --path chdata_large --queries-file "bench_queries/$f.sql" > /dev/null; } 2>&1 | grep "maximum resident" | awk '{print $1}')
  echo "$f peak_rss=$(python3 -c "print(f'{$rss/1e9:.2f} GB')")"
done
