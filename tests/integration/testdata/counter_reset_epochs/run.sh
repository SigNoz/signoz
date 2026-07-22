#!/bin/bash
# Epoch harness: real schema + MVs, one-day dataset, builder-emitted SQL,
# expected-vs-actual comparison (pre- and post-merge).
set -u
cd "$(dirname "$0")"

DB_DIR="chdata"
CH="clickhouse local --path $DB_DIR"

echo "== reset =="
rm -rf "$DB_DIR" actual && mkdir -p actual

echo "== schema =="
$CH --queries-file schema.sql || exit 1

echo "== inserts (MVs fire per insert block) =="
$CH --queries-file inserts.sql || exit 1

$CH -q "SELECT 'samples', count() FROM signoz_metrics.samples_v4
UNION ALL SELECT 'agg_5m rows', count() FROM signoz_metrics.samples_v4_agg_5m
UNION ALL SELECT 'agg_30m rows', count() FROM signoz_metrics.samples_v4_agg_30m"

run_queries() {
  local phase="$1"
  local fails=0
  for f in queries/*.sql; do
    name="$(basename "$f" .sql)"
    out="actual/${name}_${phase}.csv"
    if ! $CH --queries-file "$f" > "$out" 2> "actual/${name}_${phase}.err"; then
      echo "  $name: QUERY ERROR"
      sed 's/^/    /' "actual/${name}_${phase}.err" | head -5
      fails=$((fails+1))
      continue
    fi
    printf "  %-22s %s " "$name" "$phase"
    if ! python3 compare.py "expected/${name}.csv" "$out"; then
      fails=$((fails+1))
    fi
  done
  return $fails
}

echo "== compare (pre-merge parts) =="
run_queries premerge
pre_fails=$?

echo "== optimize final (forced merges of agg states) =="
$CH -q "OPTIMIZE TABLE signoz_metrics.samples_v4_agg_5m FINAL;
OPTIMIZE TABLE signoz_metrics.samples_v4_agg_30m FINAL;
OPTIMIZE TABLE signoz_metrics.samples_v4 FINAL;"

echo "== compare (post-merge) =="
run_queries postmerge
post_fails=$?

echo
if [ $((pre_fails + post_fails)) -eq 0 ]; then
  echo "ALL COMPARISONS PASSED"
else
  echo "FAILURES: pre=$pre_fails post=$post_fails"
  exit 1
fi
