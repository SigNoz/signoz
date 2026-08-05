# PromQL Serving — clickhouseprometheusv2

This document is the subsystem context for `pkg/prometheus/clickhouseprometheusv2`,
the second-generation ClickHouse-backed Prometheus provider. It explains why the
package exists, the correctness constraints that shaped it, and how each fetch
reduction is proven not to change results. Any change to the provider must keep
these invariants; if a change would violate one, it must be flagged and
discussed.

---

## Why a second provider

The v1 provider (`pkg/prometheus/clickhouseprometheus`) serves the promql engine
through the remote-read protobuf adapter: every raw sample of a query's union
window is fetched, serialized, and handed to the engine. The cost is a function
of ingested data, not of the question asked — which is how a dashboard of PromQL
panels can take an instance down.

In v2 the stock promql engine evaluates over a native `storage.Querier`: no
translation layer, per-selector fetch windows, and fetch reductions that are
provably invisible to the engine.

**The core constraint: every reduction either preserves engine semantics exactly
or is not performed.** A PromQL result that differs from upstream Prometheus is
a lost user. The conformance suite
(`tests/integration/tests/promqlconformance/`) replays Prometheus' own test
corpus against both providers and is the arbiter.

---

## Series lookup

Matchers resolve to series once per selector (`selectSeries`) against the series
tables, which hold one row per (fingerprint, bucket) at 1h/6h/1d/1w
granularities. Table selection and window rounding delegate to the shared
metrics schema package (`pkg/telemetryschema/metricstelemetryschema`); the
window start rounds down to the bucket boundary so a window beginning mid-bucket
still matches the bucket's row.

How matchers become SQL is documented at `applySeriesConditions`. The rules that
carry semantics:

- `__name__` matchers (all four types) translate to the `metric_name` column.
- Every other matcher becomes a `JSONExtractString` condition on the labels
  column. An equality matcher against `""` matches series *without* the label,
  mirroring PromQL, because `JSONExtractString` returns `""` for missing keys.
- Regexes are anchored (`^(?:...)$`) before they reach `match()`: PromQL
  matchers match the whole value, ClickHouse `match()` searches for a
  substring.
- The series-lookup upper bound is inclusive (`unix_milli <= end`) because the
  exporter floors registration rows to the bucket start: a series first
  registered in the bucket beginning exactly at `end` would otherwise be
  invisible while its samples are in range.

Empty-valued labels come off at this boundary: an empty value means "label
absent" in Prometheus, but stored attribute JSON can carry them.

---

## Sample fetch

Samples are fetched per selector using the engine's per-selector hints, not the
query-wide union window — `foo / foo offset 1d` reads two narrow windows
instead of the widest one twice.

**Last-sample-per-step reduction.** Instant selectors of subquery-free queries
fetch only the last sample per step bucket. The engine resolves an instant
selector at each grid timestamp `t` to the latest sample in the left-open
lookback window `(t − lookback, t]`. Buckets anchor at the selector's first
evaluation timestamp — recovered from the hints as
`hints.Start + lookback − 1ms`, the inverse of how the engine derives
`hints.Start` — so bucket boundaries coincide with evaluation timestamps, and a
non-final sample of a bucket can never be the latest sample in
`(t − lookback, t]` for any grid `t`. Real timestamps are preserved, so the
engine's own lookback and staleness handling stay exact.

Range selectors always fetch raw — every sample feeds the range function. The
subquery-free proof travels in the context as `prometheus.QueryTraits`, because
subquery selectors evaluate at the subquery's step while the hints carry the
top-level step; call sites that do not attach traits get the conservative raw
fetch.

**Row assembly** maps stale flags to the engine's `StaleNaN` and merges series
with identical label sets (`sortAndMerge`) — the engine assumes storages never
emit duplicates. Duplicate timestamps pass through as stored: uniqueness is
ingest's job, and v1 feeds them to the engine as-is over the same data.

**The fingerprint filter is a shard-local semi-join.** The samples query
restricts to the matched series by re-running the series predicates as an
`IN (SELECT fingerprint FROM <local series table> ...)` subquery, not a GLOBAL
broadcast of the matched set. ClickHouse materializes the subquery's set per
shard before the scan, so it still engages the fingerprint primary-key column.
Because the subquery re-executes the predicates after the lookup ran, it can
match series registered in between; sample rows whose fingerprint the lookup
never saw are skipped — the lookup is the read snapshot.

---

## Sharding

`samples_v4` and `time_series_v4` (and all their rollups) shard on the same key
— `cityHash64(env, temporality, metric_name, fingerprint)` — so a series'
samples and catalog rows live on the same shard. The semi-join above exploits
that: each shard filters by its own series rows, which are exactly the series
of that shard's samples.

The temporality filter on every samples statement
(`temporality IN ['Cumulative', 'Unspecified']`) is a semantic no-op — the
matched fingerprints already come from those temporalities — that engages the
leading samples primary-key column.

Delta-temporality series stay invisible to PromQL exactly as they are in v1:
the rollout gate is parity with v1, and a Delta stream fed to `rate()`
as-if-cumulative would be wrong, not just new.

---

## Observability

Every statement carries a `log_comment` with
`code.namespace=clickhouse-prometheus-v2` and `code.function.name` naming the
call site, so this provider's work is attributable in `system.query_log`.
