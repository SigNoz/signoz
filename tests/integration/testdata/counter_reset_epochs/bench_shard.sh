#!/bin/bash
# Shard-local pushdown simulation for the whale case (50k series, 144M rows).
#
# Model: fingerprints are shard-disjoint (the sharding key hashes fingerprint),
# and nothing in the epoch pipeline crosses series until the spatial sum, which
# decomposes. So a 4-shard cluster runs the ENTIRE per-series pipeline on each
# shard over its quarter of the data in parallel, and the initiator merges tiny
# per-(ts, group) partials. On one laptop, per-shard wall time is measured by
# running one shard's query with the full machine (each real shard has its own
# hardware); cluster wall ~= shard wall + merge.
#
# Correctness: the 4 shard outputs, merged by summing per (ts, scenario), must
# equal the single-node result exactly.
set -eu
cd "$(dirname "$0")"

B=1784332800000

for k in 0 1 2 3; do
  if [ ! -d "chdata_shard$k" ]; then
    echo "== building shard $k (quarter of series, full MV chain) =="
    clickhouse local --path "chdata_shard$k" --queries-file schema.sql
    clickhouse local --path "chdata_shard$k" -q "
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
  FROM numbers(144000000)
  WHERE intDiv(number, 2880) % 4 = $k
)
SETTINGS max_insert_threads = 4, max_partitions_per_insert_block = 100;

INSERT INTO signoz_metrics.time_series_v4_1day
SELECT 'default', 'Cumulative', 'bench2_counter', 200000 + number,
       ts, '{\"scenario\":\"bench2\"}'
FROM numbers(50000) ARRAY JOIN [toInt64($B - 86400000), toInt64($B)] AS ts
WHERE number % 4 = $k;
"
  fi
done

clickhouse local --path chdata_shard0 -q "SELECT 'shard0 samples', count() FROM signoz_metrics.samples_v4 WHERE metric_name = 'bench2_counter'"

echo "== per-shard wall time, full machine (= cluster wall time modulo merge) =="
for q in big_e_inc_300_raw big_l_inc_300_raw; do
  printf "%-22s" "$q"
  for i in 1 2 3; do
    t0=$(python3 -c 'import time; print(time.time())')
    clickhouse local --path chdata_shard0 --queries-file "bench_queries/$q.sql" > /dev/null
    t1=$(python3 -c 'import time; print(time.time())')
    printf " %.2f" "$(python3 -c "print($t1 - $t0)")"
  done
  echo
done

echo "== correctness: merged 4-shard output == single-node output =="
clickhouse local --path chdata_large --queries-file bench_queries/big_e_inc_300_raw.sql > /tmp/single_e.csv
for k in 0 1 2 3; do
  clickhouse local --path "chdata_shard$k" --queries-file bench_queries/big_e_inc_300_raw.sql > "/tmp/shard_e_$k.csv"
done
t0=$(python3 -c 'import time; print(time.time())')
python3 - <<'PYEOF'
import csv, math, sys
def load(p):
    d = {}
    with open(p, newline="") as f:
        for r in csv.reader(f):
            if r:
                d[(int(r[0]), r[1])] = d.get((int(r[0]), r[1]), 0.0) + float(r[2])
    return d
merged = {}
for k in range(4):
    for key, v in load(f"/tmp/shard_e_{k}.csv").items():
        merged[key] = merged.get(key, 0.0) + v
single = load("/tmp/single_e.csv")
bad = [k for k in set(merged) | set(single)
       if not math.isclose(merged.get(k, float("nan")), single.get(k, float("nan")), rel_tol=1e-9, abs_tol=1e-6)]
print(f"merge check: {len(single)} rows, {len(bad)} mismatches")
sys.exit(1 if bad else 0)
PYEOF
t1=$(python3 -c 'import time; print(time.time())')
python3 -c "print(f'initiator merge cost (python, unoptimized): {$t1-$t0:.2f}s over 4 x per-(ts,group) partials')"
