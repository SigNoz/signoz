# PromQL Serving — clickhouseprometheusv2

This document gives the context for `pkg/prometheus/clickhouseprometheusv2`.
This package is the second-generation ClickHouse-backed Prometheus provider.
The document tells you why the package exists. It tells you the correctness
rules that shaped it. It shows how we prove that each construct does not
change results. Keep these invariants when you change the provider. If your
change breaks an invariant, flag it and discuss it first.

---

## Why a second provider

The v1 provider (`pkg/prometheus/clickhouseprometheus`) serves the promql
engine through the remote-read protobuf adapter. It fetches every raw sample
of a query's union window. It serializes all of them and gives them to the
engine. The cost follows the ingested data, not the question. This is how a
dashboard of PromQL panels can take an instance down.

In v2, each query runs in one of two ways. The classifier decides per query:

- **Transpiled**: ClickHouse evaluates the query. Only final (or near-final)
  per-group grid arrays come back. The statements use the
  `timeSeries*ToGrid` aggregate functions. The supported ClickHouse floor is
  25.6 or later, so these functions are assumed available.
- **Engine**: the stock promql engine evaluates over this package's native
  `storage.Querier`. Every shape that does not transpile takes this path.

**The core rule: a PromQL result that differs from upstream Prometheus is a
lost user. A construct that cannot reproduce engine semantics exactly falls
back. It does not approximate.** The conformance suite
(`tests/integration/tests/promqlconformance/`) replays Prometheus' own test
corpus against both providers. It is the arbiter. The classification golden
(`testdata/classification_golden.json`) freezes the route of each corpus
expression. The rest of this document is the PromQL-to-SQL story. That
mapping is where correctness is won or lost.

---

## The evaluation model the SQL must reproduce

A PromQL range query is an instant query evaluated at each grid point
`t_i = start + i*step`, for `i = 0..(end-start)/step`. At each `t_i`:

- An instant selector resolves to the latest sample in the left-open
  lookback window `(t_i - lookback, t_i]`. If that latest sample is a stale
  marker, the selector resolves to nothing. Older real samples in the window
  do not change this.
- A range selector `[r]` collects every sample in `(t_i - r, t_i]`. Stale
  markers are excluded.
- `offset d` shifts both windows to `(t_i - d - w, t_i - d]`.

The transpilation invariant follows from this model. Each transpiled
construct produces one array per output series. The array has exactly one
slot per grid point. Slot `i` holds the value at `t_i`. NULL means absent.
This makes composition correct, not only convenient. The engine evaluates
these operators independently per `t_i`. A representation that gets every
slot right gets the whole query right. Spatial aggregation over arrays is
sound because it combines values that belong to the same `t_i` by
construction. Scan time maps slot `i` back to `t_i = start + i*step`
(`toMatrix`). The sections below fill those slots with exactly the numbers
the engine computes. We validated each equivalence against the vendored
engine on live data before its shape entered the allowlist. An unproven
shape stays on the engine path.

## Classification: finding what a statement can answer

`classify` walks the parsed AST and looks for "core units". A core unit is a
maximal subtree of this shape:

	[agg by/without (...)] [fn(] selector[range] [offset d] [)] [op scalar]...

`classifyCore` peels that chain from the outside in. It takes an optional
sum/min/max/avg/count aggregation. It then takes one allowlisted function or
a bare instant selector. It then takes the selector with its offset. On the
way out, it collects number-literal arithmetic, comparisons (including
`bool`), and unary minus into a scalar-op pipeline. A node qualifies only if
its type, arguments, and children are in the proven set. This is an
allowlist. An overlooked construct becomes a fallback, not a wrong number.

Three unit kinds come out. Each kind has its own SQL form:

- `unitRange`: rate, irate, increase, delta, idelta over a range selector.
- `unitInstant`: instant vector selection, bare or comparison-filtered.
- `unitOverTime`: avg/min/max/sum/count/last `_over_time`.

If the whole tree is one unit, the plan is "full". The statement's rows are
the query result. Otherwise, `rewrite` cuts out each maximal unit and puts a
synthetic selector `__signoz_transpiled_N__` in its place. The engine then
runs the rewritten expression over the units' materialized results. This is
a "hybrid" plan. `histogram_quantile`, `topk`, `or`/`and`/`unless`, and
vector matching keep exact engine semantics. Their expensive inputs were
aggregated server-side.

Classification refuses a shape when it cannot guarantee exact semantics
server-side:

- The `@` modifier, anywhere.
- Default-resolution subqueries. Their resolution is a server runtime
  setting that the transpiler cannot see.
- Duration expressions (`offset step()`, `[range()]`, ...), anywhere. The
  engine resolves them into the selector's static fields only at evaluation
  time. At classification time those fields hold zero values. A transpile
  would silently use the wrong offset or range.
- Steps or ranges that are not whole seconds. The grid functions take
  whole-second parameters.
- Grouping by `__name__`, or matching on it, in hybrid plans. The synthetic
  name would leak into results.
- Name-keeping units in hybrid plans. Bare and comparison-filtered instant
  selectors and `last_over_time` keep their real `__name__` (`keepsName`).
  Substitution would replace that name. These units transpile only as full
  plans.
- Every function outside the allowlist: changes, resets,
  quantile_over_time, absent, native-histogram functions, and more.

Units inside a fixed-resolution subquery evaluate on the subquery's own
grid, not the query grid. That grid is the set of epoch-aligned multiples of
the resolution strictly after `outerStart - offset - range`, ending at
`outer end - offset`. This is the exact derivation the engine uses. A grid
shifted by one step changes which samples every window sees.

## From one unit to one statement

`buildUnitSQL` renders each unit as one statement. For
`sum by (pod) (rate(m{job="api"}[5m]))` the skeleton is:

	SELECT g0, sumForEach(grid) AS grid FROM (
	    SELECT any(series.g0) AS g0,
	           timeSeriesRateToGrid(<start>, <end>, <step>, <range>)(fromUnixTimestamp64Milli(unix_milli), value) AS grid
	    FROM signoz_metrics.distributed_samples_v4 AS points
	    INNER JOIN (
	        SELECT fingerprint, JSONExtractString(labels, 'pod') AS g0
	        FROM signoz_metrics.time_series_v4
	        WHERE <series predicates>
	        GROUP BY fingerprint, g0
	    ) AS series ON points.fingerprint = series.fingerprint
	    WHERE metric_name = ? AND temporality IN ['Cumulative', 'Unspecified']
	      AND unix_milli > <start - range> AND unix_milli <= <end>
	      AND bitAnd(flags, 1) = 0
	    GROUP BY points.fingerprint
	) GROUP BY g0
	SETTINGS allow_experimental_ts_to_grid_aggregate_function = 1

Read it from the inside out.

**The time window** is the selector's semantics, verbatim. Strict `>` on the
lower bound and `<=` on the upper bound is the left-open `(t - w, t]` rule.
The offset shifts the whole window. `bitAnd(flags, 1) = 0` drops stale
markers. PromQL excludes them from range vectors.

**The inner GROUP BY** computes one grid array per series.
`timeSeriesRateToGrid(start, end, step, range)` is a parametric aggregate.
It takes (timestamp, value) pairs and produces `Array(Nullable(Float64))`
with one slot per grid point. It is correct because it implements the
engine's `extrapolatedRate`, decision for decision: counter resets, the
zero-point clamp, the extrapolation thresholds, the two-samples rule, and
the left-open window. We verified this: we fed identical samples to both and
compared slot for slot. The only observed difference is the last bit.
ClickHouse's C++ and Go round the same formula differently. That is the
floating-point floor, not a semantic gap. irate/delta/idelta map to their
own `timeSeries*ToGrid` functions, with the same verification. `increase`
has no function of its own. We emit
`arrayMap(x -> x * <range seconds>, <rate expr>)`. This is exact by
definition: `extrapolatedRate` computes the same extrapolated delta for both
and divides by the range only when `isRate`. The multiplication reverses it
exactly. The grid parameters render as literals, not bound args. They are
aggregate-function parameters. The experimental gate rides as a SETTINGS
clause on the statement itself, so telemetrystore hooks cannot remove it.

The group key is functionally dependent on the fingerprint: one fingerprint
is the hash of one labelset. So the inner query groups by the fingerprint
alone and reads the key columns with `any()`. This is exact, and it makes
the per-row hash key smaller.

**The join** gives each series its group key, in one of two forms.
`by (...)` extracts each listed label as a plain column
(`JSONExtractString(labels, 'pod') AS g0`) and groups on the columns. The
projection is a known short list, and the label names live in Go. To build,
sort, and stringify every label pair per row would be waste. This is correct
because column-tuple equality is label-set equality on the projection. An
extracted `''` means the label is absent. That is Prometheus semantics for
`by()` over missing labels. The empties are skipped when the columns turn
back into labels. `without` and no-aggregation project a label set that
varies per series. They get the canonical key: `toJSONString` of the sorted
[label, value] pairs that the unit projects. `without` excludes the listed
labels plus `__name__`. No-aggregation keeps everything; the name comes off
in Go, per the engine's name-dropping rules. Here the sort is load-bearing.
Stored JSON key order is not canonical across fingerprints. Two orderings of
the same labels must land in one group. Empty values are filtered for the
same absent-label reason. The same string parses back into the output label
set (`labelsFromGroupKey`).

**The outer GROUP BY** is the spatial aggregation. sum/min/max/avg/count
by/without become the `-ForEach` combinators. Element-wise aggregation over
grid arrays is the engine's per-`t_i` aggregation: slot `i` of every input
array refers to the same `t_i`. The combinators skip NULLs. That is the
engine aggregating only the series present at `t_i`. An index where every
series is absent stays NULL. Two edges need explicit handling. First,
`countForEach` wraps in a map of 0 back to NULL. A count over an all-absent
index is an absent point, not 0. Second, a unit without aggregation still
passes through `maxForEach`. That is the identity for the common
one-fingerprint group. It is a deterministic NULL-skipping merge when a
regex `__name__` selector collapses distinct metrics onto one projected
label set. One caveat is inherent: the summation order over series differs
from the engine's. Spatial aggregates can differ in the last ULP. Float
addition is not associative. No ordering reproduces the engine's result
bit-exactly from inside a GROUP BY.

## Instant selectors: staleness needs two aggregates

`unitInstant` uses window = lookback. It must reproduce the shadowing rule:
the point is absent when the latest in-window sample is a stale marker.
`timeSeriesLastToGrid` alone cannot express that. To skip stale rows in
WHERE would resurrect the older real sample that the marker buried. So stale
rows stay in the scan for this kind only. The grid expression compares three
aggregates per slot:

	arrayMap((tall, tok, vok) -> if(tall IS NULL OR tok IS NULL OR tall != tok, NULL, vok),
	         timeSeriesLastToGrid(...)(ts, toFloat64(unix_milli)),                           -- last sample overall
	         timeSeriesLastToGridIf(...)(ts, toFloat64(unix_milli), bitAnd(flags, 1) = 0),   -- last non-stale, its timestamp
	         timeSeriesLastToGridIf(...)(ts, value, bitAnd(flags, 1) = 0))                   -- last non-stale, its value

This is correct by cases on a slot's window. No samples at all: both
timestamp aggregates are NULL, so the slot is NULL. That is absent, as the
engine says. Latest sample non-stale: it is the latest overall and the
latest non-stale. The timestamps agree. The slot takes its value. That is
the engine's pick. Latest sample stale: the last-overall timestamp is the
marker's. The last-non-stale timestamp is older, or NULL when the window
holds only markers. They disagree. The slot is NULL. The marker shadows,
exactly as the engine's rule says. Timestamps are unique per series (ingest
dedups). So timestamp equality identifies "the same sample" without
ambiguity. We probed the `-If` combinator against these experimental
aggregates before we trusted it.

## Windowed *_over_time: whole buckets instead of a grid function

avg/min/max/sum/count `_over_time` aggregate every raw sample in the window.
No `timeSeries*ToGrid` function computes them. (`last_over_time` is the
exception. The last sample of a range vector is exactly
`timeSeriesLastToGrid`. PromQL excludes stale markers from range vectors; we
exclude them in WHERE.) These shapes transpile only when the range is a
whole multiple of the step. Then the window needs no per-sample fan-out.
With `W = range/step`, the window `(t_k - range, t_k]` is exactly the union
of W step buckets. Both are left-open on the same boundaries. So bucket
membership fully determines window membership. Each sample lands in exactly
one bucket:

	intDiv(unix_milli - <start> + <range> - 1, <step>)

This is `ceil((ts - start)/step)` shifted by W-1, so the earliest in-window
sample sits at 0. Slot k's window is buckets in `[k, k+W-1]`. The
alternative fans each sample into all W windows that cover it. That
multiplies rows by W. For a long range over a short step, that is a row
explosion measured in billions. The bucketed form's row count is
series × buckets: the size of the output, for any W.

Each series aggregates in one group. The `-Resample` combinator
(`sumResample`, `countResample`) holds the dense per-bucket partials inside
one group state: a bucket count, plus the function's value aggregate (sum
for sum/avg, min, max). An earlier form grouped by (series, bucket) and
assembled with `groupArrayInsertAt`. At scale that made 37M hash groups, and
per-thread partials scaled memory with the thread count. The slide then
combines each slot's at-most-W bucket partials by direct aggregation
(`arraySum(arraySlice(...))`). Window sums are added the way the engine adds
them. There is no prefix-sum differencing: its large-minus-large
cancellation would drift past the shadow tolerance on counter-sized values.
This is correct per slot because the bucket union is the exact window
multiset, and avg/min/max/sum/count are order-insensitive on a multiset
(sum/avg up to summation order; see the float caveat above). A slot with
zero window count is absent. min/max filter their slices on the bucket
counts. An empty bucket's default can never look like a value: a real sample
can legitimately be +Inf.

Two shapes fall back to the engine path, which is exact: a range that does
not divide the step, and a window wider than `maxWindowBuckets` buckets (the
slide costs W combines per slot). A range narrower than the step needs
neither gate: the windows are pairwise disjoint, one bucket per slot, no
slide. That form is exact only together with the window-sliver predicate
below.

## Scalar ops, full plans, hybrid plans

The scalar-op pipeline runs in Go on the returned arrays
(`applyScalarOps`), slot by slot. Arithmetic operators compute. Comparisons
filter: the slot keeps the vector-side value or becomes NULL. Under `bool`
they return 0/1. This is trivially correct. It is the same float64 operation
the engine applies, to the same slot value, in the same operator order the
AST dictates. Go instead of another SQL layer changes where, not what.

A full plan's arrays map straight to the result matrix. A hybrid plan
materializes each unit's arrays as synthetic series under its
`__signoz_transpiled_N__` name. The engine evaluates the rewritten
expression over a storage that serves synthetic names from memory and
everything else live. Substitution is sound because a unit's output is a
plain instant vector to the engine: same values at same timestamps, under a
different name. The name cannot matter. Plans that group by or match on
`__name__` were refused at classification. Name-keeping units are never
substituted. One subtlety makes it exact: we write stale markers at absent
grid points. Without them, the engine's lookback would resurrect a point
from up to `lookback` earlier. The marker encodes "absent here" the way the
engine itself encodes it. Units evaluate concurrently. Each unit is one
grid statement: the group-key join resolves the matchers, and the samples
primary key takes the metric name straight from the selector. Only a
selector without a static `__name__` runs the series lookup first, to learn
the concrete metric names. A step of 0 is an instant query: a single
evaluation at `end`.

A note on the window sliver: when the window is narrower than the step, the
grid windows cover only `window/step` of the timeline. A sample in a gap
belongs to no window. It cannot move any grid point, but the grid aggregate
would buffer it. A WHERE predicate keeps only the in-window rows:
`positiveModulo(selStart - unix_milli, step) < window`, with the scan capped
at the last grid point. The lattice anchors at the selector start, because
the end can sit off-lattice on unaligned grids. This cut a 36k-series
one-week rate from 74s/28GiB to 16s/4.3GiB on fleet data. Over slivered
rows, `timeSeriesLastToGrid`'s window widening is harmless, so instant
selectors and `last_over_time` transpile at window < step too.

## Series lookup

The engine path resolves matchers once per selector (`selectSeries`); the
transpiled path builds the same conditions into its group-key join. Both
read the same tables. The series tables hold one row per (fingerprint, bucket)
at 1h/6h/1d/1w granularities. The shared schema package
(`pkg/telemetryschema/metricstelemetryschema`) picks the table whose bucket
fits the window. It rounds the window start down to the bucket boundary, so
a window that begins mid-bucket still matches the bucket's row. How matchers
become SQL, and why regexes are anchored, is documented at
`applySeriesConditions`. Empty-valued labels come off at this boundary. An
empty value means "label absent" in Prometheus, but stored attribute JSON
can carry them.

## The engine path

Queries that do not transpile run in the stock engine over this package's
`storage.Querier`. This is still not the v1 path. Samples are fetched per
selector with the engine's per-selector hints, not the query-wide union
window. So `foo / foo offset 1d` reads two narrow windows, not the widest
one twice. Instant selectors of subquery-free queries fetch only the last
sample per step bucket (`lastSamplePerStep`). Buckets anchor at the
selector's first evaluation timestamp. The code recovers it from the hints
as `hints.Start + lookback - 1ms`, the inverse of how the engine derives
`hints.Start`. Bucket boundaries then coincide with evaluation timestamps.
A non-final sample of a bucket can never be the latest sample in
`(t - lookback, t]` for any grid `t`. Real timestamps are preserved, so the
engine's own lookback and staleness handling stay exact. Range selectors
always fetch raw: every sample feeds the range function. The subquery-free
proof travels in the context as `prometheus.QueryTraits`. Subquery selectors
evaluate at the subquery's step, while the hints carry the top-level step.
Row assembly maps stale flags to the engine's StaleNaN. It merges series
with identical label sets (`sortAndMerge`): the engine assumes storages
never emit duplicates.

## Sharding

`samples_v4` and `time_series_v4` (and all their rollups) shard on the same
key: `cityHash64(env, temporality, metric_name, fingerprint)`. So a series'
samples and catalog rows live on the same shard. The transpiled statement
exploits that. The distributed samples table at the top-level FROM makes
ClickHouse rewrite the whole inner query per shard. The join against the
shard-local series table and the per-series grid aggregation run next to
the data. The initiator only merges aggregate states and applies the
spatial `-ForEach` step. This is the same layout as the telemetrymetrics
statement builder. The group-key join alone restricts the transpiled scan
to the matched series. The engine path's samples fetch restricts by the
same predicates as a shard-local semi-join, not a GLOBAL broadcast of the
matched set. The temporality filter on every samples statement is a
semantic no-op: the matched fingerprints already come from those
temporalities. It engages the leading samples primary-key column.
Delta-temporality series stay invisible to PromQL here, exactly as in v1.
The rollout gate is parity with v1. To make Delta visible is its own change
with its own semantics to design. A Delta stream fed to `rate()`
as-if-cumulative would be wrong, not just new.

## Observability

Every statement carries a `log_comment` with
`code.namespace=clickhouse-prometheus-v2` and `code.function.name` naming
the call site (`selectSeries`, `selectSamples`, `transpiledUnit`,
`LabelValues`, `LabelNames`). This provider's work is attributable in
`system.query_log` without guessing from query text.
