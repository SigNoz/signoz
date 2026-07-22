# Counter-reset epochs: read side

Status: implemented behind the per-org feature flag `use_counter_epochs`.
Write side: `docs/counter-reset-epochs.md` in the signoz-otel-collector repo
(`start_ts` normalizer, schema migration 1012).
Verification: `tests/integration/testdata/counter_reset_epochs/`.

## Summary

Cumulative rate/increase in the v5 query builder gains a reset-exact pipeline.
The collector stamps every cumulative monotonic sample with its **epoch** (the
normalized OTLP `start_time_unix_nano`, ms, column `start_ts`; `0` = unknown).
Within an epoch the counter is monotone, so per-(step bucket, epoch) min/max
are the first/last observations and the increase over any window is the sum of
per-epoch growth — exact under any number of resets, identical at every step
interval, computable from the raw table and from the 5m/30m rollups (which
carry per-epoch min/max as mergeable `minMap`/`maxMap` states).

What this fixes, concretely (issues #6973, #7069, and the auto-vs-1d step
inconsistency reports):

| problem | legacy | epochs |
|---|---|---|
| reset inside a step bucket | undercounted (`max` hides it) | exact |
| reset regrowing past the previous value | invisible, silent undercount | exact |
| N resets inside a 1-day step | miscounted (one negative diff at most) | exact |
| zoom consistency (auto vs 86400) | day totals disagree (harness: 3969 vs 242) | identical at every step |
| rollup tables (5m/30m) | loss baked in at write | reset-exact from rollups |
| first-ever data point | invisible (`nan`) | visible (counts from 0) |
| two writers sharing a fingerprint | sawtooth garbage | each epoch tracked, growth summed |

The irreducible losses (shared with created-timestamp-enabled Prometheus):
growth between an epoch's last sample and its death, epochs that live and die
between two exports, and broken-start-time sources — which degrade to exactly
today's behavior, never worse.

## The pipeline

`buildTemporalAggCumulativeEpochs` (pkg/telemetrymetrics/epoch_statement.go)
replaces the temporal aggregation CTE for cumulative rate/increase when the
flag is on. Four layers, innermost first:

```
L1  per (fingerprint, bucket):    __first_by_epoch / __last_by_epoch maps
      raw tables:   minMap/maxMap(map(start_ts, value)), stale rows filtered
      5m/30m:       minMap(min_value_by_start_ts) / maxMap(max_value_by_start_ts);
                    a bucket whose merged maps are empty (all rows pre-migration)
                    falls back to the scalar min/max as key 0
L2  per-series bucket window:     previous bucket ts + overall max, last known
                                  key-0 value, ever-had-key-0, row numbers
L3  ARRAY JOIN over epochs:       per-(series, epoch) lag, then the
                                  contribution multiIf below
L4  regroup per (series, bucket): increase = sum of finite contributions
                                  (NaN if none); rate divides by the distance
                                  to the series' previous bucket (step for the
                                  first); buckets before the display start are
                                  cut (they exist only as bases)
```

Spatial aggregation is untouched — epochs are summed inside the series before
anything crosses series boundaries, which is why this does not repeat the
start-time-in-fingerprint mistake (series identity never changes; no
cardinality or billing impact).

Contribution rules per (bucket, epoch) row, in `multiIf` branch order:

| # | condition | contribution | meaning |
|---|---|---|---|
| 1 | epoch ≠ 0, seen in an earlier bucket | `last − previous last of this epoch` (clamped to `last` if negative) | continuation; the clamp only fires if upstream broke the monotonicity invariant |
| 2 | epoch ≠ 0, first appearance, bucket has current/earlier key-0 rows | `last − (first ≥ seam ? seam : 0)`, seam = same-bucket key-0 value, else last key-0 value | the rollout seam: continuation subtracts the legacy value, a drop keeps base 0 |
| 3 | epoch ≠ 0, first appearance, epoch born ≥ fetched-range start | `last` | the counter started from 0 inside the range; makes single-shot scripts visible |
| 4 | epoch ≠ 0, first appearance, born before the range | `last − first` | only the growth visible inside the bucket; the pre-range part is unknowable |
| 5 | epoch = 0, series' first bucket | `NaN` | legacy first-point behavior |
| 6 | epoch = 0, value < previous bucket's overall max | `value` | legacy negative-diff rule |
| 7 | epoch = 0, otherwise | `value − previous bucket's overall max` | legacy pair rule; "overall max" (not key-0-only) also seams the epoch→0 downgrade direction |

## How queries behave across the rollout — the three regimes

The **same statement** serves all three regimes; they differ only in which
branches fire, row by row. There is no watermark, no config, no per-time-range
switching.

### Regime 1 — no rollout in range (all rows have `start_ts = 0`)

Every row lands in the maps under key 0. Branches 5–7 are the only ones that
fire, and they are exactly the legacy semantics (bucket max, `nan` first
point, negative-diff clamp). Harness assertions A5/A6 prove byte-equality of
results with the legacy pipeline on epoch-less and reset-free data, and the
`l_*` query cases pin the legacy pipeline itself. Flag on + old data =
identical charts.

### Regime 2 — fully rolled out (every cumulative row has a real epoch)

Maps carry real epochs; branches 1–4 fire. Per bucket, each epoch contributes
its observed growth; a reset inside a bucket simply means two epochs
contribute. The result is exact at every step: the harness's day totals at
steps 60/300/1800/86400 are identical per scenario and equal the independent
per-point truth (A1/A3), from raw and rollup tables alike.

Worked example (the research doc's numbers), one series, buckets of 5m, reset
at 11:38:01, epoch A pre-range, epoch B born 11:38:01:

```
bucket        maps {epoch: last}         contributions            increase
11:30–11:35   {A: 90}                    A: rule 4 → 90−84 = 6         6
11:35–11:40   {A: 107, B: 23}            A: rule 1 → 17; B: rule 3 → 23   40
11:40–11:45   {B: 37}                    B: rule 1 → 37−23 = 14        14
one 15m bucket {A: 107, B: 37}           A: 107−84 = 23; B: 37         60 = 6+40+14
```

### Regime 3 — the overlap (range spans the rollout boundary, or a mixed fleet)

Old buckets are key-0, new buckets carry epochs, and a mid-bucket switch puts
both in one bucket. The seam is branch 2: when an epoch first appears for a
series that has key-0 history, its base is the nearest legacy value — the
same-bucket key-0 value if the switch happened mid-bucket, otherwise the last
key-0 value from earlier buckets — with the legacy pair rule applied (a drop
at the seam keeps base 0, so a reset coinciding with the rollout is still
counted correctly). Continuity: a counter at 100 under key-0 rows that
continues at 101 under epoch rows contributes 1, not 101.

The reverse seam (epoch → key-0, i.e. a collector rollback) flows through
branch 7 against the previous bucket's overall max.

Covered in the harness by `s06_transition` (key-0 half-day → epoch half-day →
a real reset at 18:00), `s15_aggold` (rollup rows from before migration 1012,
whose empty maps fall back to scalar min/max as key 0), and the mixed-bucket
path inside s06. Exactness during the overlap is legacy-grade at the seam and
epoch-grade everywhere else; it converges to regime 2 as old rows age out
(30d TTL).

One operational caveat (also in the collector doc): a series whose samples
*alternate* between old and new collector **versions** for an extended period
(LB across a half-upgraded fleet) can double-count across repeated key-0↔epoch
seams. Upgrade a series' path atomically where possible and keep the
version-mix window short. Replica count and load balancing among
*same-version* collectors are not a concern: the normalizer only ever emits
validated wire values or 0, so every replica assigns the same epoch to a
spec-compliant series (see the collector doc's replica analysis).

## Feature flag, caching, alerts

- `use_counter_epochs` (registry default disabled). Routing:
  temporality Cumulative + rate/increase → epoch pipeline; temporality
  Multiple → a UNION of the delta fast aggregation and the epoch pipeline
  (replacing the single multiplexed window expression, which could not be made
  reset-exact); everything else (delta, gauges, Unspecified, latest/sum/avg/…)
  is unchanged.
- The querier's bucket-cache fingerprint gains `counterepochs=v1` for affected
  specs when the flag is on, so cached legacy buckets and epoch buckets can
  never stitch into one series. Flipping the flag is a cache-key change for
  cumulative rate/increase queries only.
- Threshold alert rules evaluate through the same v5 querier and pick the
  pipeline up from the flag; PromQL and the v3/v4 builders are non-goals (see
  below).

## Verification

`tests/integration/testdata/counter_reset_epochs/` — one-day dataset, 15
scenarios (steady, mid-bucket reset, 11 resets/day, regrow-past-previous,
pure-legacy, rollout transition, gap, single point, slow reporter, boundary
reset, duplicates+out-of-order, two-writer overlap, UpDownCounter, pre-
migration rollup rows, stale markers). Three independent implementations
(bucket rules, legacy rules, per-point truth) cross-assert in
`generate_dataset.py`; the builder-emitted SQL (goldens in
`pkg/telemetrymetrics/testdata/`, emitter `TestEmitHarnessQueries`) is then
compared row-for-row against them on ClickHouse 26.4 via `run.sh`: 11 query
cases × pre/post-merge, raw and rollup paths, all passing. The harness runs
the migration-1012 MV SQL verbatim, so collector-side rollup correctness is
covered by the same run.

## Performance

Cost model: an L1 scan+aggregate identical in shape to legacy (maps have ~1
entry per bucket — `1 + resets inside the bucket`; the write-side churn guard
bounds the degenerate case), then `O(series × buckets)` window-layer work at a
**~3–4× heavier per-window-row constant** than legacy's single window. The
`ARRAY JOIN` itself is a flatMap over the already-collapsed set with ~1.0–1.05×
expansion and is not the cost; micro-variants (tuple-free array join, stripping
the entire seam machinery) were measured at noise to ~15%. Query cost scales
with the *queried metric's* rows and series, not total ingest.

Measured, clickhouse local on an M-series laptop (relative numbers are the
point; `bench.sh` / `bench_large.sh` in the harness):

Small metric — 2,000 series × 24h × 30s (5.76M rows, 576k window rows):

| query | legacy | epochs | ratio |
|---|---|---|---|
| increase, step=300, raw | 0.51 s | 0.79 s | 1.5× |
| increase, step=60, raw | 0.91 s | 2.24 s | 2.5× |

Whale metric — 50,000 series × 24h × 30s (144M rows, 14.4M window rows), the
realistic worst case for a single query at a ~1B samples/day tenant:

| query | legacy | epochs | ratio |
|---|---|---|---|
| increase, step=300, raw | 5.4 s | 20.4 s | 3.8× |
| increase, step=300, agg_5m | — | 16.6 s | windows dominate; rollups don't rescue this shape |
| increase, step=1800, agg_30m (2.4M window rows) | — | 2.1 s | linear in window rows |
| peak RSS (step=300 raw) | 2.7 GB | 4.3 GB | +60% |

Interpretation: typical panels (≤ 5k series × ≤ 400 points ⇒ ≤ 2M window
rows) pay ~1.5× and sub-second absolutes. Tenant-wide whale panels pay 3–4×
on a query that is already slow under legacy, and the bucket cache makes the
steady-state refresh incremental (only new buckets recompute), so the full
cost is a first-load/backfill event. The flag is per-org, so whale-heavy
tenants can hold until shard-local pushdown lands (below).

### Where the cost lives (layer profile, whale case)

Progressive-stage timings (`bench_profile.sh`, FORMAT Null, best-of-3; laptop
numbers are noisy — read the shape, not the decimals):

| stage | time | delta = layer cost |
|---|---|---|
| L1 legacy (scan 144M → 14.4M groups, scalar `max`) | ~5.0 s | baseline |
| L1 epoch (same, `minMap`/`maxMap` states) | ~13–16 s | **map aggregation ≈ +8–11 s — the dominant cost** |
| + L2 window | ~12 s (noise-overlapped) | |
| + L3 explode + epoch window | ~18 s | window passes ≈ +5–6 s |
| full epoch (+L4 regroup + spatial) | ~21 s | ≈ +2 s |
| full legacy | ~6 s | legacy window ≈ +1 s |

So roughly **half the overhead is the Map aggregate states in L1** (per-row
1-entry map construction plus per-group Map-state merges — a hash-and-arrays
operation where legacy does one float compare), ~a third is the two window
passes over map-carrying rows, and the rest is the extra regroup. Two findings
kill the obvious rewrites: a two-level L1 (scalar states grouped by
`(series, bucket, start_ts)`, maps built over the 10×-smaller set) saves only
~10% — the 144M-row group-by machinery costs what the allocations save — and
the rollup path at step == bucket width (pure 1:1 map *merges*, zero map
*construction*) is just as slow, so merge and construction cost about the
same. The cost is the Map datatype in the aggregation/sort path, not any
single expression. Hence the levers that actually work are the ones measured
below (pushdown; rollups when step ≫ bucket; the bucket cache) rather than
SQL micro-tuning. A per-bucket single-epoch scalar fast path would need
per-group aggregation-strategy switching that SQL cannot express; if this
stage ever needs another 2×, that is an engine-level (or two-plan pre-check)
project.

### Shard-local pushdown (measured)

The sharding key hashes the fingerprint, so shards hold disjoint series — and
nothing in L1–L4 crosses series until the spatial sum, which decomposes into
per-shard partials. Simulated with 4 shard databases each holding a disjoint
quarter of the whale dataset (per-shard wall time measured with the full
machine, since real shards run in parallel on their own hardware;
`bench_shard.sh`):

| whale query, step=300, raw | single node (today) | per-shard wall (4 shards) | projected cluster wall |
|---|---|---|---|
| epoch pipeline | 20.4 s | 3.3–3.8 s | **~3.6 s** (5.9×) |
| legacy pipeline | 5.4 s | 1.2 s | **~1.2 s** (4.6×) |

The merged 4-shard partials equal the single-node output **exactly (276 rows,
0 mismatches)** — empirical proof the decomposition is lossless, not
approximate. Initiator merge is a GROUP BY over `shards × (buckets × groups)`
rows (60 ms even in unoptimized python). Speedups are slightly superlinear
because the per-shard window working set fits cache (the single-node run
carried a 4.3 GB working set).

Implementation shape: wrap the exact statement the builder emits today —
with local table names; the time-series join already reads local tables —
in `cluster('{cluster}', view(...))` and re-aggregate the group columns at
the initiator. Requirements: the spatial aggregation must decompose
(sum/min/max do; avg needs sum+count partials; the histogram-quantile path
already sums per `le` before quantiling at the outermost level). This
benefits the legacy pipeline equally and is the right lever for whale
tenants regardless of epochs.

Write side, from the ingest A/B (144M rows through the full MV chain, fresh
db each):

| | legacy MVs | migration-1012 MVs |
|---|---|---|
| ingest wall time | 34.7 s (4.1M rows/s) | 77.1 s (1.9M rows/s) |
| agg_5m on disk | 66.5 MiB | 111.2 MiB (+67%) |
| agg_30m on disk | 6.8 MiB | 13.1 MiB (+92%) |
| samples_v4 on disk | 20.8 MiB | 20.8 MiB (+~0; `start_ts` delta-compresses away) |

The rollup-MV stage of ingestion costs ~2.2× its previous CPU. At 1B
samples/day (~12k rows/s average), even a single laptop-class node retains
>100× headroom on this stage, but budget the MV share of ingest CPU
accordingly on hot clusters. Rollup tables are a small fraction of metrics
storage (raw dominates on real data), so the +67–92% there nets out to a few
percent overall.

## Audit notes (what was found and addressed, what remains)

Found during the audit and fixed:

- **Stale markers on the raw path**: legacy `max()` was immune to
  no-recorded-value rows; `minMap` is not (a 0 would become an epoch's "first"
  and overstate its first bucket). The epoch L1 filters `bitAnd(flags,1) = 0`
  on raw/buffer tables, matching the rollup MVs (`s16_stale`).
- **Stale markers vs the normalizer**: a marker's fake 0 would read as a
  counter reset and mint a phantom epoch; markers now bypass the normalizer
  entirely.
- **Cache stitching**: the bucket-cache fingerprint ignored the pipeline
  semantics; flag state is now part of the cache identity for affected specs.
- **Lookback leak**: the epoch pipeline produces real values where legacy
  produced `nan` (dropped), so the lookback bucket is cut explicitly from the
  output; the delta side of the Multiple union reads only the display range
  (this also fixes a pre-existing lookback-row leak in the legacy Multiple
  path).

Known limitations, by design:

- **Step below the reporting interval**: with a one-step lookback, growth
  between the last pre-range sample and the first in-range sample is
  unattributable when the series reports less often than the step (s09 at
  step=60). Legacy loses the same information (`nan` first point); Prometheus
  returns nothing at all for such windows. The eventual fix is a
  reporting-interval-aware lookback (existing TODO in
  `pkg/querybuilder/time.go`).
- **Unknown-epoch data stays legacy**: key-0 rows are zoom-inconsistent
  exactly as today; nothing can recover epochs that were never recorded.
- **Transition-hour rollup buckets** mixing pre- and post-migration rows use
  the map rows plus scalar fallback approximately for the pre-migration part
  (bounded to buckets written while the migration itself was running).
- **Non-goals**: PromQL path (parity with the Prometheus engine is its
  contract; the rollup schema was deliberately shaped so a future PromQL
  rollup effort can derive its own value-pair-rule quantities from the same
  maps), v3/v4 query builders, meter metrics, exponential histograms
  (cumulative exp-hist is not ingested today).

## Rollout order

1. Collector schema migration 1012.
2. Exporters: `enable_start_ts: true`.
3. Per-org flag `use_counter_epochs` — safe immediately (regime 1 ≡ legacy);
   full effect accrues as epoch data accumulates and the seam ages out.
