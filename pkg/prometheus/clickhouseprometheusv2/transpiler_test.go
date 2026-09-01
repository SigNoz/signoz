package clickhouseprometheusv2

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestClient(t *testing.T) (*client, *telemetrystoretest.Provider) {
	t.Helper()
	store := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)
	settings := factory.NewScopedProviderSettings(instrumentationtest.New().ToProviderSettings(), "clickhouseprometheusv2_test")
	return newClient(settings, store, prometheus.Config{}), store
}

var unitCols = []cmock.ColumnType{
	{Name: "gkey", Type: "String"},
	{Name: "grid", Type: "Array(Nullable(Float64))"},
}

// anyArgs matches a bound-argument list by count alone: the mock treats a
// nil expected argument as a wildcard.
func anyArgs(n int) []any {
	return make([]any, n)
}

func parse(t *testing.T, q string) parser.Expr {
	t.Helper()
	expr, err := parser.NewParser(parser.Options{}).ParseExpr(q)
	require.NoError(t, err)
	return expr
}

func TestClassifyFullShapes(t *testing.T) {
	tests := []struct {
		name  string
		query string
		check func(t *testing.T, u *coreUnit)
	}{
		{
			name:  "sum by rate",
			query: `sum by (pod) (rate(http_requests_total{job="api"}[5m]))`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, fnRate, u.fn)
				assert.Equal(t, int64(300_000), u.rangeMs)
				assert.True(t, u.hasAgg)
				assert.True(t, u.by)
				assert.Equal(t, []string{"pod"}, u.grouping)
			},
		},
		{
			name:  "bare increase with offset",
			query: `increase(errors_total[10m] offset 30m)`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, fnIncrease, u.fn)
				assert.Equal(t, int64(1_800_000), u.offsetMs)
				assert.False(t, u.hasAgg)
			},
		},
		{
			name:  "avg without over delta",
			query: `avg without (instance) (delta(gauge_metric[15m]))`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, fnDelta, u.fn)
				assert.True(t, u.hasAgg)
				assert.False(t, u.by)
			},
		},
		{
			name:  "scalar pipeline with comparison",
			query: `sum(rate(x[5m])) * 100 > 5`,
			check: func(t *testing.T, u *coreUnit) {
				require.Len(t, u.ops, 2)
				assert.Equal(t, parser.ItemType(parser.MUL), u.ops[0].op)
				assert.Equal(t, 100.0, u.ops[0].scalar)
				assert.Equal(t, parser.ItemType(parser.GTR), u.ops[1].op)
			},
		},
		{
			name:  "scalar on left with unary minus",
			query: `-1 * sum(rate(x[5m]))`,
			check: func(t *testing.T, u *coreUnit) {
				require.Len(t, u.ops, 1)
				assert.True(t, u.ops[0].scalarOnLeft)
				assert.Equal(t, -1.0, u.ops[0].scalar)
			},
		},
		{
			name:  "bool comparison",
			query: `sum(rate(x[5m])) >= bool 0.5`,
			check: func(t *testing.T, u *coreUnit) {
				require.Len(t, u.ops, 1)
				assert.True(t, u.ops[0].returnBool)
			},
		},
		{
			name:  "irate utf8 name",
			query: `sum by ("k8s.pod.name") (irate({"k8s.container.cpu.time"}[2m]))`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, fnIRate, u.fn)
				assert.Equal(t, []string{"k8s.pod.name"}, u.grouping)
			},
		},
		{
			name:  "bare instant selector keeps name",
			query: `up{job="api"}`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitInstant, u.kind)
				assert.True(t, u.keepsName())
			},
		},
		{
			name:  "gauge aggregation",
			query: `sum by (pod) (container_memory offset 5m)`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitInstant, u.kind)
				assert.Equal(t, int64(300_000), u.offsetMs)
				assert.True(t, u.hasAgg)
				assert.False(t, u.keepsName())
			},
		},
		{
			name:  "gauge comparison keeps name",
			query: `container_memory > 100`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitInstant, u.kind)
				assert.True(t, u.keepsName())
			},
		},
		{
			name:  "gauge arithmetic drops name",
			query: `container_memory / 1024`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitInstant, u.kind)
				assert.False(t, u.keepsName())
			},
		},
		{
			name:  "avg_over_time",
			query: `max by (node) (avg_over_time(load1[10m]))`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitOverTime, u.kind)
				assert.Equal(t, "avg", u.overFn)
				assert.Equal(t, int64(600_000), u.rangeMs)
			},
		},
		{
			name:  "last_over_time keeps name",
			query: `last_over_time(load1[10m])`,
			check: func(t *testing.T, u *coreUnit) {
				assert.Equal(t, unitOverTime, u.kind)
				assert.Equal(t, "last", u.overFn)
				assert.True(t, u.keepsName())
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, ok := classify(parse(t, tt.query), testGrid(60_000))
			require.True(t, ok, "expected transpilable")
			require.True(t, plan.full, "expected full compilation")
			require.Len(t, plan.units, 1)
			tt.check(t, &plan.units[0].core)
		})
	}
}

func TestClassifyFallbackShapes(t *testing.T) {
	queries := []struct {
		name  string
		query string
		step  int64
	}{
		{"default-resolution subquery", `max_over_time(rate(x[5m])[30m:])`, 60_000},
		{"at modifier", `sum(rate(x[5m] @ 1609746000))`, 60_000},
		{"at modifier on gauge", `sum(container_memory @ 1609746000)`, 60_000},
		{"sub-second step", `sum(rate(x[5m]))`, 500},
		{"sub-second range", `sum(rate(x[1500ms]))`, 60_000},
		{"by __name__ full", `sum by (__name__) (rate({__name__=~"a|b"}[5m]))`, 60_000},
		{"quantile_over_time unsupported", `quantile_over_time(0.9, load1[10m])`, 60_000},
		// Duration expressions resolve into the selectors' static fields only
		// at evaluation time; classification reads those fields as zero, so
		// transpiling would silently use the wrong offset (caught by the
		// conformance corpus' duration_expression.test cases). Offset
		// expressions parse without the experimental-parser flag, so they do
		// reach the transpiler; range-position expressions are rejected at
		// parse (the RangeExpr/StepExpr guards are defense-in-depth).
		{"duration expression offset on instant", `x offset step()`, 60_000},
		{"duration expression offset arithmetic", `x offset -step()*2`, 60_000},
		{"duration expression offset on range", `sum(rate(x[5m] offset max(3s, step())))`, 60_000},
		{"duration expression subquery step", `max_over_time(rate(x[5m])[30m:step()])`, 60_000},
	}
	for _, tt := range queries {
		t.Run(tt.name, func(t *testing.T) {
			_, ok := classify(parse(t, tt.query), testGrid(tt.step))
			assert.False(t, ok, "expected fallback for %s", tt.query)
		})
	}
}

func TestClassifyHybridShapes(t *testing.T) {
	tests := []struct {
		name          string
		query         string
		wantUnits     int
		wantRewritten string
	}{
		{
			name:          "histogram quantile",
			query:         `histogram_quantile(0.95, sum by (le) (rate(http_bucket[5m])))`,
			wantUnits:     1,
			wantRewritten: `histogram_quantile(0.95, __signoz_transpiled_0__)`,
		},
		{
			name:          "topk over compiled",
			query:         `topk(5, sum by (pod) (rate(x[5m])))`,
			wantUnits:     1,
			wantRewritten: `topk(5, __signoz_transpiled_0__)`,
		},
		{
			name:          "ratio of compiled units",
			query:         `sum(rate(a[5m])) / sum(rate(b[5m]))`,
			wantUnits:     2,
			wantRewritten: `__signoz_transpiled_0__ / __signoz_transpiled_1__`,
		},
		{
			name:          "or vector zero",
			query:         `sum(rate(a[5m])) or vector(0)`,
			wantUnits:     1,
			wantRewritten: `__signoz_transpiled_0__ or vector(0)`,
		},
		{
			name:          "quantile agg over compiled rate",
			query:         `quantile(0.9, rate(x[5m]))`,
			wantUnits:     1,
			wantRewritten: `quantile(0.9, __signoz_transpiled_0__)`,
		},
		{
			name:          "non-literal scalar side stays engine-side",
			query:         `sum(rate(x[5m])) * scalar(y)`,
			wantUnits:     1,
			wantRewritten: `__signoz_transpiled_0__ * scalar(y)`,
		},
		{
			name:          "compiled mixed with raw selector",
			query:         `sum by (pod) (rate(a[5m])) / on (pod) group_left () b`,
			wantUnits:     1,
			wantRewritten: `__signoz_transpiled_0__ / on (pod) group_left () b`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, ok := classify(parse(t, tt.query), testGrid(60_000))
			require.True(t, ok)
			assert.False(t, plan.full)
			assert.Len(t, plan.units, tt.wantUnits)
			assert.Equal(t, tt.wantRewritten, plan.rewritten)
		})
	}
}

func TestClassifyHybridGuards(t *testing.T) {
	t.Run("no substitution under on(__name__)", func(t *testing.T) {
		plan, ok := classify(parse(t, `sum(rate(a[5m])) * on (__name__) b`), testGrid(60_000))
		_ = plan
		assert.False(t, ok, "matching on __name__ must not see synthetic names")
	})
	t.Run("no substitution inside @-pinned subquery", func(t *testing.T) {
		_, ok := classify(parse(t, `max_over_time(rate(x[5m])[30m:1m] @ 1609746000)`), testGrid(60_000))
		assert.False(t, ok)
	})
}

// The alert-smoothing idiom: units inside a fixed-resolution subquery
// evaluate on the subquery grid — epoch-aligned multiples of the resolution,
// starting strictly after (outer start - range), exactly as the engine
// derives it.
func TestClassifySubqueryUnits(t *testing.T) {
	grid := gridContext{startMs: 1_700_000_030_000, endMs: 1_700_007_200_000, stepMs: 60_000}

	plan, ok := classify(parse(t, `min_over_time((sum by (ns) (increase(x[5m])))[10m:5m]) > 0`), grid)
	require.True(t, ok)
	require.False(t, plan.full)
	require.Len(t, plan.units, 1)
	assert.Equal(t, `min_over_time(__signoz_transpiled_0__[10m:5m]) > 0`, plan.rewritten)

	unit := plan.units[0]
	// lower bound = outer start - range = 1_699_999_430_000; first multiple
	// of 300_000 strictly greater is 1_699_999_500_000.
	assert.Equal(t, int64(1_699_999_500_000), unit.grid.startMs)
	assert.Equal(t, grid.endMs, unit.grid.endMs)
	assert.Equal(t, int64(300_000), unit.grid.stepMs)
	assert.Equal(t, fnIncrease, unit.core.fn)

	t.Run("subquery offset shifts the grid", func(t *testing.T) {
		plan, ok := classify(parse(t, `max_over_time((sum(rate(x[5m])))[10m:5m] offset 30m)`), grid)
		require.True(t, ok)
		require.Len(t, plan.units, 1)
		// lower = start - offset - range = 1_699_997_630_000 -> first
		// multiple of 300_000 above = 1_699_997_700_000; end shifts too.
		assert.Equal(t, int64(1_699_997_700_000), plan.units[0].grid.startMs)
		assert.Equal(t, grid.endMs-1_800_000, plan.units[0].grid.endMs)
	})

	t.Run("mollusk ratio-inside-subquery idiom", func(t *testing.T) {
		q := `min_over_time(((sum by (a) (rate(m1[5m]))) / (avg by (a) (m2)))[5m:1m])`
		plan, ok := classify(parse(t, q), grid)
		require.True(t, ok)
		// Both sides compile on the subquery grid: the rate side and the
		// gauge aggregation side; the engine joins them and smooths.
		require.Len(t, plan.units, 2)
		assert.Equal(t, int64(60_000), plan.units[0].grid.stepMs)
		assert.Equal(t, unitInstant, plan.units[1].core.kind)
		assert.Contains(t, plan.rewritten, `__signoz_transpiled_0__ / __signoz_transpiled_1__`)
	})
}

func TestBuildUnitSQL(t *testing.T) {
	unit := &coreUnit{
		fn:       fnRate,
		rangeMs:  300_000,
		hasAgg:   true,
		aggOp:    parser.SUM,
		by:       true,
		grouping: []string{"pod"},
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "http_requests_total")},
	}
	sql, args, err := buildUnitSQL(unit, []string{"http_requests_total"}, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	assert.Contains(t, sql, "timeSeriesRateToGrid(fromUnixTimestamp64Milli(1700000000000), fromUnixTimestamp64Milli(1700003600000), 60, 300)(fromUnixTimestamp64Milli(unix_milli), value)")
	assert.Contains(t, sql, "unix_milli > ? AND unix_milli <= ?")
	assert.Contains(t, sql, "bitAnd(flags, 1) = 0")
	assert.Contains(t, sql, "sumForEach(grid)")
	// The group-key join rides inside the shard query: distributed samples
	// at the top level, the local series table in the join subquery, the
	// grid aggregation grouped per (fingerprint, group key) shard-side.
	assert.Contains(t, sql, "FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint,")
	assert.Contains(t, sql, "FROM signoz_metrics.time_series_v4 WHERE")
	// The group key is functionally dependent on the fingerprint (one
	// labelset per fingerprint): any() is exact and the per-row hash key
	// shrinks to the fingerprint alone.
	assert.Contains(t, sql, "any(series.g0) AS g0")
	assert.Contains(t, sql, "GROUP BY points.fingerprint)")
	// No samples-side fingerprint condition: the group-key join restricts.
	assert.NotContains(t, sql, "points.fingerprint IN (")
	// by (pod) extracts the grouped label directly — no per-row JSON
	// build/sort/stringify for a known projection.
	assert.Contains(t, sql, "JSONExtractString(labels, ?) AS g0")
	assert.NotContains(t, sql, "toJSONString")
	assert.Contains(t, sql, "SETTINGS allow_experimental_ts_to_grid_aggregate_function = 1")
	// Args follow placeholder order: the joined series subquery renders
	// before the samples WHERE, and its select list ('pod') renders before
	// its own conditions.
	assert.Equal(t, []any{"pod", "http_requests_total", int64(1_699_999_200_000), int64(1_700_003_600_000), "http_requests_total", int64(1_699_999_700_000), int64(1_700_003_600_000)}, args)
}

func TestBuildUnitSQLIncreaseAndOffset(t *testing.T) {
	unit := &coreUnit{
		fn:       fnIncrease,
		rangeMs:  600_000,
		offsetMs: 1_800_000,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "errors_total")},
	}
	sql, _, err := buildUnitSQL(unit, nil, 1_699_997_600_000, 1_700_001_800_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	// Grid and window shift by the offset; increase multiplies rate by the
	// range in seconds.
	assert.Contains(t, sql, "fromUnixTimestamp64Milli(1699998200000), fromUnixTimestamp64Milli(1700001800000)")
	assert.Contains(t, sql, "arrayMap(x -> x * 600, timeSeriesRateToGrid")
	assert.Contains(t, sql, "maxForEach(grid)")
}

func TestBuildUnitSQLWindowSliver(t *testing.T) {
	// rate[5m] on a 30m grid evaluates only a 5m sliver before each grid
	// point — samples in the gaps belong to no window and would only be
	// buffered by the grid aggregate. The WHERE must keep exactly the
	// in-window rows: positiveModulo anchored at the selector start (end
	// can sit off-lattice on unaligned grids, and samples above the start
	// make the plain modulo dividend negative), and the scan capped at the
	// last grid point — rows past it are equally windowless.
	unit := &coreUnit{
		fn:       fnRate,
		rangeMs:  300_000,
		hasAgg:   true,
		aggOp:    parser.SUM,
		by:       true,
		grouping: []string{"pod"},
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "http_requests_total")},
	}
	sql, args, err := buildUnitSQL(unit, []string{"http_requests_total"}, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 1_800_000, 300_000)
	require.NoError(t, err)

	assert.Contains(t, sql, "positiveModulo(? - unix_milli, ?) < ?")
	assert.Equal(t, []any{"pod", "http_requests_total", int64(1_699_999_200_000), int64(1_700_003_600_000), "http_requests_total", int64(1_699_999_700_000), int64(1_700_003_600_000), int64(1_700_000_000_000), int64(1_800_000), int64(300_000)}, args)

	t.Run("off-lattice end caps the scan at the last grid point", func(t *testing.T) {
		// end - start = 50m at a 30m step: the only grid points are start
		// and start+30m; samples in the trailing 20m serve no window.
		_, args, err := buildUnitSQL(unit, []string{"http_requests_total"}, 1_699_999_700_000, 1_700_003_000_000, 1_700_000_000_000, 1_700_003_000_000, 1_800_000, 300_000)
		require.NoError(t, err)
		assert.Contains(t, args, int64(1_700_001_800_000))
	})

	t.Run("window covering the step keeps plain bounds", func(t *testing.T) {
		sql, _, err := buildUnitSQL(unit, []string{"http_requests_total"}, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
		require.NoError(t, err)
		assert.NotContains(t, sql, "positiveModulo")
	})
}

func TestBuildUnitSQLWindowedBucketsWithoutFanOut(t *testing.T) {
	// The window is W = range/step whole buckets, so each sample lands in
	// exactly one bucket via GROUP BY and the window slides over bucket
	// partials — fanning samples into every covered window (ARRAY JOIN)
	// multiplies rows by W, a row explosion at long ranges.
	unit := &coreUnit{
		kind:     unitOverTime,
		overFn:   "avg",
		rangeMs:  600_000,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "node_load1")},
	}
	sql, _, err := buildUnitSQL(unit, []string{"node_load1"}, 1_699_999_400_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 600_000)
	require.NoError(t, err)

	assert.NotContains(t, sql, "ARRAY JOIN")
	// One group per series with fixed per-bucket arrays (-Resample); the
	// bucket index jj = ceil((ts - start)/step) + W - 1 folded into a single
	// intDiv. Grouping by (series, bucket) instead measured 37M hash groups
	// whose per-thread partials scale memory with max_threads.
	assert.Contains(t, sql, "countResample(0, 71, 1)(value, intDiv(unix_milli - 1700000000000 + 600000 - 1, 60000)) AS cnts")
	assert.Contains(t, sql, "sumResample(0, 71, 1)(value, intDiv(unix_milli - 1700000000000 + 600000 - 1, 60000)) AS vals")
	assert.Contains(t, sql, "any(series.gkey) AS gkey")
	assert.Contains(t, sql, "GROUP BY points.fingerprint)")
	assert.NotContains(t, sql, "jj) AS jj")
	assert.Contains(t, sql, "INNER JOIN (SELECT fingerprint,")
	assert.Contains(t, sql, "FROM signoz_metrics.time_series_v4 WHERE")
	// Slide: W = 10 buckets per slot, absent when the window count is 0.
	assert.Contains(t, sql, "arraySum(arraySlice(cnts, k + 1, 10))")
	assert.Contains(t, sql, "arraySum(arraySlice(vals, k + 1, 10))")
}

func TestBuildUnitSQLDisjointOverTime(t *testing.T) {
	// avg_over_time[5m] on a 30m grid: the windows are pairwise disjoint,
	// so there is no slide — one Resample bucket per grid slot, read
	// directly. Exact only together with the window-sliver predicate, which
	// removes the gap samples the ceil index would otherwise assign to the
	// window above them.
	unit := &coreUnit{
		kind:     unitOverTime,
		overFn:   "avg",
		rangeMs:  300_000,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "node_load1")},
	}
	sql, _, err := buildUnitSQL(unit, []string{"node_load1"}, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 1_800_000, 300_000)
	require.NoError(t, err)

	assert.NotContains(t, sql, "ARRAY JOIN")
	// gridLen = 3 slots, bucket array the same length — no W tail.
	assert.Contains(t, sql, "countResample(0, 3, 1)(value, intDiv(unix_milli - 1700000000000 + 1800000 - 1, 1800000)) AS cnts")
	assert.Contains(t, sql, "sumResample(0, 3, 1)(value, intDiv(unix_milli - 1700000000000 + 1800000 - 1, 1800000)) AS vals")
	// Single-bucket window: the slide degenerates to reading one slot.
	assert.Contains(t, sql, "arraySum(arraySlice(cnts, k + 1, 1))")
	// The sliver predicate is the correctness precondition of this form.
	assert.Contains(t, sql, "positiveModulo(? - unix_milli, ?) < ?")
}

// TestDisjointWindowLattice brute-forces the disjoint-form arithmetic: a
// sample survives the sliver predicate exactly when some grid window
// contains it, and the ceil bucket index then lands it on that window's
// slot. This is the pure-Go mirror of the SQL expressions — the predicate
// in samplesConditions and jj in windowedInner — over random lattices,
// including off-lattice ends and samples beyond the last grid point.
func TestDisjointWindowLattice(t *testing.T) {
	rng := func(seed *uint64) int64 {
		*seed = *seed*6364136223846793005 + 1442695040888963407
		return int64(*seed >> 33)
	}
	seed := uint64(42)
	for trial := 0; trial < 2000; trial++ {
		stepMs := 1_000 * (1 + rng(&seed)%3600)
		windowMs := 1 + rng(&seed)%(stepMs-1) // strictly below the step
		selStart := 1_700_000_000_000 + rng(&seed)%1_000_000
		selEnd := selStart + rng(&seed)%(50*stepMs) // end may sit off-lattice
		lastIdx := (selEnd - selStart) / stepMs
		upper := selStart + lastIdx*stepMs

		for i := 0; i < 50; i++ {
			u := selStart - windowMs - stepMs + rng(&seed)%(selEnd-selStart+3*stepMs)

			// Oracle: is u inside any window (t_k - window, t_k]?
			inWindow := false
			var slot int64 = -1
			for k := int64(0); k <= lastIdx; k++ {
				tk := selStart + k*stepMs
				if u > tk-windowMs && u <= tk {
					inWindow = true
					slot = k
					break
				}
			}

			// The SQL: fetch bounds, then the sliver predicate
			// positiveModulo(selStart - u, step) < window.
			kept := u > selStart-windowMs && u <= upper
			if kept {
				pmod := (selStart - u) % stepMs
				if pmod < 0 {
					pmod += stepMs
				}
				kept = pmod < windowMs
			}

			require.Equal(t, inWindow, kept,
				"sliver keep mismatch: u=%d selStart=%d step=%d window=%d", u, selStart, stepMs, windowMs)
			if !kept {
				continue
			}
			// jj = ceil((u - selStart)/step) via one intDiv; numerator is
			// positive because u > selStart - window > selStart - step.
			jj := (u - selStart + stepMs - 1) / stepMs
			require.Equal(t, slot, jj,
				"slot mismatch: u=%d selStart=%d step=%d window=%d", u, selStart, stepMs, windowMs)
		}
	}
}

func TestTryExecuteRange_WindowedGateFallsBack(t *testing.T) {
	c, store := newTestClient(t)
	e := &executor{client: c, parser: prometheus.NewParser()}

	start := time.UnixMilli(1_700_000_000_000)
	end := time.UnixMilli(1_700_003_600_000)

	// 10m range at 90s step: the window is not a whole number of buckets.
	_, ok, err := e.TryExecuteRange(context.Background(), `avg_over_time(up[10m])`, start, end, 90*time.Second)
	require.NoError(t, err)
	assert.False(t, ok, "range not divisible by step must not transpile")

	// 1d range at 60s step: 1440 bucket combines per slot, over the cap.
	_, ok, err = e.TryExecuteRange(context.Background(), `avg_over_time(up[1d])`, start, end, time.Minute)
	require.NoError(t, err)
	assert.False(t, ok, "range/step above maxWindowBuckets must not transpile")

	// 1m range at 5m step: the windows are disjoint slivers — no
	// divisibility or width requirement, so this transpiles.
	store.Mock().ExpectQuery("FROM signoz_metrics\\.distributed_samples_v4").WithArgs(anyArgs(9)...).WillReturnRows(cmock.NewRows(unitCols, [][]any{}))
	_, ok, err = e.TryExecuteRange(context.Background(), `avg_over_time(up[1m])`, start, end, 5*time.Minute)
	require.NoError(t, err)
	assert.True(t, ok, "range below step is the disjoint form and must transpile")
}

func TestApplyScalarOps(t *testing.T) {
	f := func(v float64) *float64 { return &v }

	t.Run("arithmetic chain", func(t *testing.T) {
		values := []*float64{f(2), nil, f(4)}
		applyScalarOps([]scalarOp{{op: parser.MUL, scalar: 100}, {op: parser.ADD, scalar: 1}}, values)
		require.NotNil(t, values[0])
		assert.Equal(t, 201.0, *values[0])
		assert.Nil(t, values[1])
		assert.Equal(t, 401.0, *values[2])
	})

	t.Run("comparison filters points", func(t *testing.T) {
		values := []*float64{f(1), f(10)}
		applyScalarOps([]scalarOp{{op: parser.GTR, scalar: 5}}, values)
		assert.Nil(t, values[0])
		require.NotNil(t, values[1])
		assert.Equal(t, 10.0, *values[1], "filter comparisons keep the original value")
	})

	t.Run("bool comparison emits 0/1", func(t *testing.T) {
		values := []*float64{f(1), f(10)}
		applyScalarOps([]scalarOp{{op: parser.GTR, scalar: 5, returnBool: true}}, values)
		assert.Equal(t, 0.0, *values[0])
		assert.Equal(t, 1.0, *values[1])
	})

	t.Run("scalar on left division", func(t *testing.T) {
		values := []*float64{f(4)}
		applyScalarOps([]scalarOp{{op: parser.DIV, scalar: 100, scalarOnLeft: true}}, values)
		assert.Equal(t, 25.0, *values[0])
	})
}

func TestLabelsFromGroupKey(t *testing.T) {
	lset, err := labelsFromGroupKey(`[["pod","api-0"],["ns","prod"]]`)
	require.NoError(t, err)
	assert.Equal(t, "api-0", lset.Get("pod"))
	assert.Equal(t, "prod", lset.Get("ns"))

	empty, err := labelsFromGroupKey(`[]`)
	require.NoError(t, err)
	assert.True(t, empty.IsEmpty())
}

// testGrid is a 2h query grid ending on a round timestamp.
func testGrid(stepMs int64) gridContext {
	return gridContext{startMs: 1_700_000_000_000, endMs: 1_700_007_200_000, stepMs: stepMs}
}

// A bool comparison returns 0/1, not the sample, so the engine drops
// __name__; keeping it would change downstream vector matching.
func TestKeepsName_BoolComparisonDropsName(t *testing.T) {
	plan, ok := classify(parse(t, `up > bool 0`), testGrid(60_000))
	require.True(t, ok)
	assert.False(t, plan.units[0].core.keepsName())

	plan, ok = classify(parse(t, `up > 0`), testGrid(60_000))
	require.True(t, ok)
	assert.True(t, plan.units[0].core.keepsName())
}

// timeSeriesLastToGrid widens its window to max(window, step) — probed on
// 25.12 — so Last-style units at window < step must fall back or they would
// resurrect samples the engine's lookback already dropped.
func TestTryExecuteRange_LastStyleWindowBelowStepTranspiles(t *testing.T) {
	// These used to fall back because timeSeriesLastToGrid widens its window
	// to max(window, step). Over sliver-filtered rows the widening is
	// harmless — the widened window intersected with the data IS the
	// lookback window — so the gate is gone and both shapes transpile. The
	// mock returns no series: the point here is the routing, the value
	// semantics are the parity suite's job.
	c, store := newTestClient(t)
	e := &executor{client: c, parser: prometheus.NewParser()}

	start := time.UnixMilli(1_700_000_000_000)
	end := time.UnixMilli(1_700_003_600_000)

	store.Mock().ExpectQuery("timeSeriesLastToGrid").WithArgs(anyArgs(10)...).WillReturnRows(cmock.NewRows(unitCols, [][]any{}))
	_, ok, err := e.TryExecuteRange(context.Background(), `sum by (pod) (up)`, start, end, time.Hour)
	require.NoError(t, err)
	assert.True(t, ok, "instant selection at step > lookback must transpile")

	store.Mock().ExpectQuery("timeSeriesLastToGrid").WithArgs(anyArgs(9)...).WillReturnRows(cmock.NewRows(unitCols, [][]any{}))
	_, ok, err = e.TryExecuteRange(context.Background(), `last_over_time(up[10m])`, start, end, time.Hour)
	require.NoError(t, err)
	assert.True(t, ok, "last_over_time at range < step must transpile")
}

// A nameless selector can span metrics whose series alternate in time (one
// dies inside the lookback before the other appears); after the name drop
// the engine merges them into ONE series and errors only when two samples
// share an evaluation timestamp. Pinned by conformance cases
// operators.test:994/997 (-{job="api"} over http_requests/http_errors).
func TestMergeSameLabelsetSeries(t *testing.T) {
	f := func(v float64) *float64 { return &v }
	api := labels.FromStrings("job", "api")

	out, err := mergeSameLabelsetSeries([]transpiledSeries{
		{lset: api, values: []*float64{f(-2), nil}},
		{lset: api, values: []*float64{nil, f(-4)}},
		{lset: labels.FromStrings("job", "web"), values: []*float64{f(7), nil}},
	})
	require.NoError(t, err)
	require.Len(t, out, 2)
	assert.Equal(t, []*float64{f(-2), f(-4)}, out[0].values, "temporally disjoint twins must merge into one series")

	_, err = mergeSameLabelsetSeries([]transpiledSeries{
		{lset: api, values: []*float64{f(1), nil}},
		{lset: api, values: []*float64{f(2), nil}},
	})
	require.Error(t, err, "two values on one evaluation timestamp is the engine's duplicate error")
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
}

// Hybrid twin case: stripping the synthetic __name__ can leave two engine
// output series distinguishable only by those names (-metric_a or -metric_b:
// both {} once real names are dropped). Pinned by conformance cases
// name_label_dropping.test:137 and operators.test:1016.
func TestMergeMatrixByLabelset(t *testing.T) {
	empty := labels.EmptyLabels()

	out, err := mergeMatrixByLabelset(promql.Matrix{
		{Metric: empty, Floats: []promql.FPoint{{T: 0, F: -1}}},
		{Metric: empty, Floats: []promql.FPoint{{T: 600_000, F: -4}}},
	})
	require.NoError(t, err)
	require.Len(t, out, 1)
	assert.Equal(t, []promql.FPoint{{T: 0, F: -1}, {T: 600_000, F: -4}}, out[0].Floats)

	_, err = mergeMatrixByLabelset(promql.Matrix{
		{Metric: empty, Floats: []promql.FPoint{{T: 0, F: -1}}},
		{Metric: empty, Floats: []promql.FPoint{{T: 0, F: -3}}},
	})
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
}
