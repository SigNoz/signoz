# Counter-reset epochs: one-day verification dataset

Self-contained correctness harness for the epoch-aware cumulative rate/increase
pipeline (`use_counter_epochs` feature flag + collector schema migration 1012).
Runs against `clickhouse local` — no cluster needed. See
`docs/counter-reset-epochs.md` for the design.

## What it proves

- The **builder-emitted SQL** (both the epoch pipeline and the legacy pipeline)
  reproduces its reference implementation **row-for-row** on a one-day dataset,
  from the raw table and from the 5m/30m rollups, before and after part merges.
- The **migration-1012 materialized views** (epoch map columns) are exercised
  verbatim: raw inserts → 5m MV → chained 30m MV.
- **Rollup fidelity**: the rollup path equals the raw path at every step.
- **Replay safety**: shuffled insert order and a duplicated insert batch change
  nothing.
- The reference implementations are cross-checked in `generate_dataset.py`
  (assertions A1–A6, written to `report.txt`):
  - A1  bucket rules == independent per-point truth, per bucket and in total
  - A3  zoom consistency: identical day totals at 60s/300s/1800s/86400s steps
  - A4  the legacy pipeline's zoom **in**consistency, reproduced (the bug)
  - A5  on epoch-less data the epoch rules reproduce legacy exactly
  - A6  on reset-free data the two pipelines agree exactly

## Scenarios (one series each, label `scenario`)

| scenario | what it covers |
|---|---|
| s01_steady | no resets — must equal legacy exactly |
| s02_midreset | one reset inside a 5m bucket |
| s03_multireset | resets every 2h; legacy day total 242 vs true 3969 |
| s04_regrow | reset that regrows past the previous value — invisible to value-based detection |
| s05_legacy | `start_ts = 0` everywhere (pre-rollout data) — must equal legacy exactly |
| s06_transition | key-0 first half of day, epochs second half, then a real reset (rollout seam) |
| s07_gap | idle series with a 10-minute gap (false-spike regression) |
| s08_singlepoint | one sample ever, epoch in range — visible with epochs, absent in legacy |
| s09_slow | 300s reporting interval (step < interval limitation documented) |
| s10_boundaryreset | reset exactly on a bucket boundary |
| s11_dupooo | duplicated + out-of-order ingestion |
| s12_twowriter | two epochs overlapping in time on one fingerprint (broken series identity) |
| s14_updown | non-monotonic cumulative, key-0 — must equal legacy exactly |
| s15_aggold | pre-migration rollup rows (empty epoch maps) — key-0 fallback in agg tables |
| s16_stale | NoRecordedValue markers (flags bit 0) — must be invisible |

## Running

```bash
python3 generate_dataset.py          # regenerates inserts.sql, expected/, report.txt
./run.sh                             # schema + inserts + queries + comparisons
```

`queries/*.sql` are the exact statements produced by
`MetricQueryStatementBuilder` (args inlined). Regenerate them after builder
changes with:

```bash
EPOCH_HARNESS_DIR=$PWD go test ./pkg/telemetrymetrics/ -run TestEmitHarnessQueries
```

(from the repo root, pointing the env var here).
