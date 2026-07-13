// Package clickhouseprometheusv2 is the second-generation ClickHouse-backed
// Prometheus provider. It exists because the v1 provider fetches every raw
// sample of a query's union window through the remote-read protobuf layer
// and hands it to the engine — the cost is a function of ingested data, not
// of the question asked, which is how a dashboard of PromQL panels takes an
// instance down.
//
// Every query runs in one of two ways, decided per query:
//
//   - Transpiled: the query is evaluated entirely inside ClickHouse and only
//     final (or near-final) per-group grid arrays come back, built on the
//     timeSeries*ToGrid aggregate functions (the supported ClickHouse floor
//     is >= 25.6, so they are assumed available).
//   - Engine: the stock promql engine evaluates over this package's native
//     storage.Querier. This is the path for everything not transpilable.
//
// Correctness is the constraint that shaped both paths: a PromQL result that
// differs from upstream Prometheus is a lost user, so anything that cannot
// reproduce engine semantics exactly falls back rather than approximate.
// The rest of this comment is the PromQL -> SQL story, because that mapping
// is where correctness is won or lost.
//
// # The evaluation model the SQL must reproduce
//
// A PromQL range query is an instant query evaluated at every grid point
// t_i = start + i*step, i = 0..(end-start)/step. At each t_i:
//
//   - an instant selector resolves to the latest sample in the left-open
//     lookback window (t_i - lookback, t_i], and to nothing when that latest
//     sample is a stale marker — even if older real samples sit inside the
//     window;
//   - a range selector [r] collects every sample in (t_i - r, t_i], stale
//     markers excluded;
//   - offset d shifts both windows to (t_i - d - w, t_i - d].
//
// The transpilation invariant follows from this: every transpiled construct
// produces, per output series, one array with exactly one slot per grid
// point — slot i holds the value at t_i, NULL means absent. This is what
// makes composition correct, not just convenient: the engine evaluates
// these operators independently per t_i, so any representation that gets
// every slot right gets the whole query right, and spatial aggregation over
// arrays is sound because it combines values that belong to the same t_i by
// construction. Slot index i maps back to t_i = start + i*step at scan time
// (toMatrix). Everything below is about filling those slots with exactly
// the numbers the engine would compute — and each equivalence was validated
// against the vendored engine on live data before its shape entered the
// allowlist; anything unproven stays on the engine path.
//
// # Classification: finding what a statement can answer
//
// classify walks the parsed AST looking for "core units" — maximal subtrees
// of the shape
//
//	[agg by/without (...)] [fn(] selector[range] [offset d] [)] [op scalar]...
//
// classifyCore peels that chain from the outside in: an optional
// sum/min/max/avg/count aggregation, then one of the allowlisted functions
// or a bare instant selector, then the selector with its offset; on the way
// out it accumulates number-literal arithmetic, comparisons (including
// bool) and unary minus into a scalar-op pipeline. A node qualifies only if
// its type, arguments and children are in the proven set — an allowlist, so
// an overlooked construct becomes a fallback instead of a wrong number.
//
// Three unit kinds come out of this, each with its own SQL form:
// unitRange (rate, irate, increase, delta, idelta over a range selector),
// unitInstant (instant vector selection, bare or comparison-filtered) and
// unitOverTime (avg/min/max/sum/count/last _over_time).
//
// If the entire tree is one unit, the plan is "full": the statement's rows
// are the query result. Otherwise every maximal unit is cut out and replaced
// in the expression with a synthetic selector __signoz_transpiled_N__, and
// the rewritten expression runs in the engine over the units' materialized
// results ("hybrid") — histogram_quantile, topk, or/and/unless and vector
// matching keep exact engine semantics while their expensive inputs were
// aggregated server-side.
//
// Classification refuses when exact semantics cannot be guaranteed
// server-side: the @ modifier anywhere and default-resolution subqueries
// (their resolution is a server runtime setting the transpiler cannot see);
// steps or ranges that are not whole seconds (the grid functions take
// whole-second parameters); grouping by or matching on __name__ in hybrid
// plans (the synthetic name would leak into results); name-keeping units —
// bare/comparison instant selectors and last_over_time keep their real
// __name__ (keepsName), which substitution would replace, so they transpile
// only as full plans; and every function outside the allowlist (changes,
// resets, quantile_over_time, absent, native-histogram functions, ...).
//
// Units inside a fixed-resolution subquery evaluate on the subquery's own
// grid instead of the query grid: epoch-aligned multiples of the resolution
// strictly after outerStart - offset - range, ending at outer end - offset —
// the exact derivation the engine uses, because a grid shifted by one step
// changes which samples every window sees.
//
// # From one unit to one statement
//
// buildUnitSQL renders each unit as a single statement. For
// sum by (pod) (rate(m{job="api"}[5m])) the skeleton is:
//
//	SELECT gkey, sumForEach(grid) AS grid FROM (
//	    SELECT series.gkey AS gkey,
//	           timeSeriesRateToGrid(<start>, <end>, <step>, <range>)(fromUnixTimestamp64Milli(unix_milli), value) AS grid
//	    FROM signoz_metrics.distributed_samples_v4 AS points
//	    INNER JOIN (
//	        SELECT fingerprint, <group key expr> AS gkey
//	        FROM signoz_metrics.time_series_v4
//	        WHERE <series predicates>
//	        GROUP BY fingerprint, gkey
//	    ) AS series ON points.fingerprint = series.fingerprint
//	    WHERE metric_name = ? AND temporality IN ['Cumulative', 'Unspecified']
//	      AND points.fingerprint IN (<matched fingerprints>)
//	      AND unix_milli > <start - range> AND unix_milli <= <end>
//	      AND bitAnd(flags, 1) = 0
//	    GROUP BY points.fingerprint, series.gkey
//	) GROUP BY gkey
//	SETTINGS allow_experimental_ts_to_grid_aggregate_function = 1
//
// Reading it inside out:
//
// The time window is the selector's semantics verbatim: strict > on the
// lower bound and <= on the upper is the left-open (t - w, t] rule, with the
// whole window shifted by the offset. bitAnd(flags, 1) = 0 drops stale
// markers, which PromQL excludes from range vectors.
//
// The inner GROUP BY computes one grid array per series.
// timeSeriesRateToGrid(start, end, step, range) is a parametric aggregate:
// fed (timestamp, value) pairs it produces Array(Nullable(Float64)) with one
// slot per grid point. Correct because it implements the engine's
// extrapolatedRate decision for decision — counter resets, the zero-point
// clamp, the extrapolation thresholds, the >= 2 samples rule, the left-open
// window — verified by feeding identical samples to both and comparing
// slot for slot: the only difference ever observed is the last bit
// (ClickHouse's C++ and Go round the same formula differently), which is
// the floating-point floor, not a semantic gap. irate/delta/idelta map to
// their own timeSeries*ToGrid functions with the same verification;
// increase has no function of its own and is emitted as
// arrayMap(x -> x * <range seconds>, <rate expr>), exact by definition —
// extrapolatedRate computes the same extrapolated delta for both and
// divides by the range only when isRate, so multiplying it back is the
// identity, not an approximation. The grid parameters are rendered as
// literals, not bound args — they are aggregate-function parameters — and
// the experimental gate rides as a SETTINGS clause on the statement itself
// so telemetrystore hooks cannot clobber it.
//
// The join annotates each series with its group key: toJSONString of the
// sorted [label, value] pairs the unit projects, extracted from the stored
// labels JSON. by keeps the listed labels, without excludes them plus
// __name__, no aggregation keeps everything minus __name__ unless the unit
// keeps its name — the engine's name-dropping rules. Correct as a grouping
// key because the pairs are sorted and empty values are filtered: key
// equality is then exactly label-set equality on the projection —
// Prometheus treats an empty label value as the label being absent, and
// stored attribute JSON can carry empties that must not split groups — and
// the same canonical string parses back into the output label set
// (labelsFromGroupKey).
//
// The outer GROUP BY is the spatial aggregation: sum/min/max/avg/count
// by/without become the -ForEach combinators. Element-wise aggregation over
// grid arrays is the engine's per-t_i aggregation, because slot i of every
// input array refers to the same t_i; the combinators skip NULLs, which is
// the engine aggregating only the series present at t_i, and an index where
// every series is absent stays NULL. Two edges need explicit handling:
// countForEach wraps in a mapping of 0 back to NULL, because a count over
// an all-absent index is an absent point, not 0; and a unit without
// aggregation still passes through maxForEach — the identity for the common
// one-fingerprint group, and a deterministic NULL-skipping merge when a
// regex __name__ selector collapses distinct metrics onto one projected
// label set. One caveat is inherent: summation order over series differs
// from the engine's, so spatial aggregates can differ in the last ULP —
// float addition is not associative; no ordering reproduces the engine's
// bit-exactly from inside a GROUP BY.
//
// # Instant selectors: staleness needs two aggregates
//
// unitInstant uses window = lookback and must reproduce the shadowing rule:
// the point is absent when the latest in-window sample is a stale marker.
// timeSeriesLastToGrid alone cannot express that — skipping stale rows in
// WHERE would resurrect the older real sample the marker was written to
// bury. So stale rows stay in the scan for this kind only, and the grid
// expression compares three aggregates per slot:
//
//	arrayMap((tall, tok, vok) -> if(tall IS NULL OR tok IS NULL OR tall != tok, NULL, vok),
//	         timeSeriesLastToGrid(...)(ts, toFloat64(unix_milli)),                           -- last sample overall
//	         timeSeriesLastToGridIf(...)(ts, toFloat64(unix_milli), bitAnd(flags, 1) = 0),   -- last non-stale, its timestamp
//	         timeSeriesLastToGridIf(...)(ts, value, bitAnd(flags, 1) = 0))                   -- last non-stale, its value
//
// Correct by cases on a slot's window. No samples at all: both timestamp
// aggregates are NULL, the slot is NULL — absent, as the engine says. Latest
// sample non-stale: it is the latest overall and the latest non-stale, the
// timestamps agree, the slot takes its value — the engine's pick. Latest
// sample stale: the last-overall timestamp is the marker's, the
// last-non-stale timestamp is older (or NULL when only markers are in
// window), they disagree, the slot is NULL — the marker shadows, exactly
// the engine's rule. Timestamps are unique per series (ingest dedups), so
// timestamp equality identifies "the same sample" without ambiguity. The
// -If combinator's applicability to these experimental aggregates was
// probed before being trusted, not assumed.
//
// # Windowed *_over_time: fan-out instead of a grid function
//
// avg/min/max/sum/count _over_time aggregate every raw sample in the window,
// and no timeSeries*ToGrid function computes them. (last_over_time is the
// exception: the last sample of a range vector — stale markers excluded from
// range vectors by PromQL, excluded here in WHERE — is exactly
// timeSeriesLastToGrid.) Instead, each sample is fanned out to every grid
// index whose window contains it:
//
//	ARRAY JOIN range(toUInt64(greatest(0, intDiv(unix_milli - <start> + <step> - 1, <step>))),
//	                 toUInt64(least(<lastIdx>, intDiv(unix_milli + <range> - 1 - <start>, <step>)) + 1)) AS k
//
// Correct because the bounds solve the window condition for k. A sample at
// ts contributes to slot k iff t_k - range < ts <= t_k. The right side
// gives t_k >= ts, so the first index is ceil((ts - start)/step) — a sample
// at exactly t_k belongs to k, the window is right-closed. The left side
// gives t_k < ts + range, and with millisecond-integer timestamps that is
// t_k <= ts + range - 1, so the last index is
// floor((ts + range - 1 - start)/step) — a sample at exactly t_k - range is
// excluded, the window is left-open. Clamped to the grid, the fan-out
// therefore lands each sample in exactly the slots whose windows contain
// it, and GROUP BY (fingerprint, k) with the plain aggregate (avg(value),
// min(value), ...) computes per slot over precisely the engine's sample
// multiset — the same numbers, since avg/min/max/sum/count are
// order-insensitive on a given multiset (sum/avg up to summation order, the
// float caveat above). A second level assembles the positional array with
// groupArray + indexOf, mapping missing indices to NULL — groupArrayInsertAt
// would coerce NULL defaults to 0, which is a value, not absence. The
// group-key join happens at the initiator here, over rows already reduced
// to per-(series, index); see the sharding section for why that costs
// nothing.
//
// # Scalar ops, full plans, hybrid plans
//
// The scalar-op pipeline applies in Go to the returned arrays
// (applyScalarOps), slot by slot: arithmetic operators compute, comparisons
// filter (the slot keeps the vector-side value or becomes NULL) or return
// 0/1 under bool. Correct trivially: it is the same float64 operation the
// engine would apply to the same slot value, in the same operator order the
// AST dictates — running it in Go instead of another SQL layer changes
// where, not what.
//
// A full plan's arrays map straight to the result matrix. A hybrid plan
// materializes each unit's arrays as synthetic series under its
// __signoz_transpiled_N__ name and evaluates the rewritten expression over
// a storage that serves synthetic names from memory and everything else
// live. Substitution is sound because a unit's output is a plain instant
// vector to the engine — same values at same timestamps under a different
// name, and the name cannot matter: plans that group by or match on
// __name__ were refused at classification, and name-keeping units are never
// substituted. One subtlety makes it exact: stale markers are written at
// absent grid points, because the engine's lookback would otherwise
// resurrect a point from up to lookback earlier — the marker encodes
// "absent here" the way the engine itself encodes it. Units evaluate
// concurrently; each is one series lookup plus one grid statement. A step
// of 0 is an instant query: a single evaluation at end.
//
// # Series lookup
//
// Both paths resolve matchers the same way, once per selector
// (selectSeries): __name__ matchers translate to the metric_name column —
// all four matcher types; the v1 client silently returned nothing for regex
// metric names — and every other matcher to a JSONExtractString condition on
// the labels column (applySeriesConditions). Regexes are anchored before
// they reach match(): PromQL matchers match the whole value, ClickHouse
// match() searches for a substring, and without anchoring =~"api" would
// also select "x-api-y". An equality matcher against "" matches series
// without the label, mirroring PromQL, because JSONExtractString returns ""
// for missing keys. The series tables hold one row per (fingerprint, bucket)
// at 1h/6h/1d/1w granularities; timeSeriesTableFor picks the table whose
// bucket fits the window and rounds the window start down to the bucket
// boundary. The resulting label sets drop what v1 leaked into results: the
// synthetic fingerprint label (it would take part in without() grouping and
// vector matching) and empty-valued labels. MaxFetchedSeries fails the
// lookup with a typed invalid-input error past the ceiling — v1's behavior
// for an oversized selector was to buffer everything and OOM, and a 4xx the
// user can narrow beats a dead process serving nobody.
//
// # The engine path
//
// Queries that do not transpile run in the stock engine over this package's
// storage.Querier, which is still not the v1 path. Samples are fetched per
// selector using the engine's per-selector hints, not the query-wide union
// window, so foo / foo offset 1d reads two narrow windows instead of the
// widest one twice. Instant selectors of subquery-free queries fetch only
// the last sample per step bucket (lastSamplePerStep): buckets anchor at the
// selector's first evaluation timestamp — recovered from the hints as
// hints.Start + lookback - 1ms, the inverse of how the engine derives
// hints.Start — so bucket boundaries coincide with evaluation timestamps and
// a non-final sample of a bucket can never be the latest sample in
// (t - lookback, t] for any grid t. Real timestamps are preserved, so the
// engine's own lookback and staleness handling stay exact. Range selectors
// always fetch raw — every sample feeds the range function — and the
// subquery-free proof travels in the context as prometheus.QueryTraits,
// because subquery selectors evaluate at the subquery's step while the
// hints carry the top-level step. Row assembly counts rows against
// MaxFetchedSamples while scanning, keeps the first of consecutive equal
// timestamps, maps stale flags to the engine's StaleNaN, and merges series
// with identical label sets (sortAndMerge) — the engine assumes storages
// never emit duplicates. A {job="rawsql", query="..."} selector bypasses all
// of this and runs the query matcher's value verbatim.
//
// # Sharding
//
// samples_v4 and time_series_v4 (and all their rollups) shard on the same
// key — cityHash64(env, temporality, metric_name, fingerprint) — so a
// series' samples and catalog rows live on the same shard. The transpiled
// statement above exploits that: the distributed samples table at the
// top-level FROM makes ClickHouse rewrite the whole inner query per shard,
// where the join against the shard-local series table and the per-series
// grid aggregation run next to the data; the initiator only merges
// aggregate states and applies the spatial -ForEach step. Same layout as
// the telemetrymetrics statement builder. Fingerprint filters follow suit:
// matched sets inline as sorted literals up to inlineFingerprintsLimit
// (literals engage the samples primary key; sorting keeps statements
// deterministic), beyond it the group-key join alone restricts — a
// semi-join on the same predicates would only rescan the series table —
// except the windowed *_over_time fan-out, which has no join and keeps a
// shard-local IN subquery rather than expand every series of the metric.
// The engine path's over-limit filter is the same shard-local subquery, not
// a GLOBAL broadcast of the matched set. The temporality filter on every
// samples statement is a semantic no-op — the matched fingerprints already
// come from those temporalities — that engages the leading samples
// primary-key column. Delta-temporality series stay invisible to PromQL
// here exactly as they are in v1: the rollout gate is parity with v1, and
// making Delta visible is its own change with its own semantics to design —
// a Delta stream fed to rate() as-if-cumulative would be wrong, not just
// new.
//
// # Observability
//
// Every statement carries a log_comment with
// code.namespace=clickhouse-prometheus-v2 and code.function.name naming the
// call site (selectSeries, selectSamples, transpiledUnit, LabelValues,
// LabelNames), so this provider's work is attributable in system.query_log
// without guessing from query text.
package clickhouseprometheusv2
