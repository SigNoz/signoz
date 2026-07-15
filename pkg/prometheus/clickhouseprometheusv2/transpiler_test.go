package clickhouseprometheusv2

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
	sql, args, err := buildUnitSQL(unit, []string{"http_requests_total"}, []uint64{7, 42}, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	assert.Contains(t, sql, "timeSeriesRateToGrid(fromUnixTimestamp64Milli(1700000000000), fromUnixTimestamp64Milli(1700003600000), 60, 300)(fromUnixTimestamp64Milli(unix_milli), value)")
	assert.Contains(t, sql, "unix_milli > ? AND unix_milli <= ?")
	assert.Contains(t, sql, "bitAnd(flags, 1) = 0")
	assert.Contains(t, sql, "sumForEach(grid)")
	// The group-key join rides inside the shard query: distributed samples
	// at the top level, the local series table in the join subquery, the
	// grid aggregation grouped per (fingerprint, gkey) shard-side.
	assert.Contains(t, sql, "FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint,")
	assert.Contains(t, sql, "FROM signoz_metrics.time_series_v4 WHERE")
	assert.Contains(t, sql, "GROUP BY points.fingerprint, series.gkey")
	assert.Contains(t, sql, "points.fingerprint IN (7, 42)")
	assert.Contains(t, sql, `toJSONString(arrayFilter(p -> p.2 != '' AND p.1 IN ('pod'),`)
	assert.Contains(t, sql, "SETTINGS allow_experimental_ts_to_grid_aggregate_function = 1")
	// Args follow placeholder order: the joined series subquery renders
	// before the samples WHERE.
	assert.Equal(t, []any{"http_requests_total", int64(1_699_999_200_000), int64(1_700_003_600_000), "http_requests_total", int64(1_699_999_700_000), int64(1_700_003_600_000)}, args)
}

func TestBuildUnitSQLIncreaseAndOffset(t *testing.T) {
	unit := &coreUnit{
		fn:       fnIncrease,
		rangeMs:  600_000,
		offsetMs: 1_800_000,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "errors_total")},
	}
	sql, _, err := buildUnitSQL(unit, nil, []uint64{7}, 1_699_997_600_000, 1_700_001_800_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	// Grid and window shift by the offset; increase multiplies rate by the
	// range in seconds.
	assert.Contains(t, sql, "fromUnixTimestamp64Milli(1699998200000), fromUnixTimestamp64Milli(1700001800000)")
	assert.Contains(t, sql, "arrayMap(x -> x * 600, timeSeriesRateToGrid")
	assert.Contains(t, sql, "maxForEach(grid)")
}

func TestBuildUnitSQLOverLimitJoinOnly(t *testing.T) {
	// Past the inline limit no fingerprint filter is rendered: the series
	// join restricts to the matched fingerprints on its own.
	unit := &coreUnit{
		fn:       fnRate,
		rangeMs:  300_000,
		hasAgg:   true,
		aggOp:    parser.SUM,
		by:       true,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "http_requests_total")},
	}
	sql, _, err := buildUnitSQL(unit, []string{"http_requests_total"}, nil, 1_699_999_700_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	assert.NotContains(t, sql, "points.fingerprint IN")
	assert.Contains(t, sql, "INNER JOIN (SELECT fingerprint,")
	assert.Contains(t, sql, "FROM signoz_metrics.time_series_v4 WHERE")
}

func TestBuildUnitSQLOverLimitWindowedSemiJoin(t *testing.T) {
	// The windowed *_over_time fan-out has no series join, so the over-limit
	// regime falls back to the shard-local semi-join instead of expanding
	// every series of the metric.
	unit := &coreUnit{
		kind:     unitOverTime,
		overFn:   "avg",
		rangeMs:  600_000,
		matchers: []*labels.Matcher{mustMatcher(t, labels.MatchEqual, "__name__", "node_load1")},
	}
	sql, _, err := buildUnitSQL(unit, []string{"node_load1"}, nil, 1_699_999_400_000, 1_700_003_600_000, 1_700_000_000_000, 1_700_003_600_000, 60_000, 300_000)
	require.NoError(t, err)

	assert.Contains(t, sql, "points.fingerprint IN (SELECT fingerprint FROM signoz_metrics.time_series_v4 WHERE ")
	assert.Contains(t, sql, "ARRAY JOIN range(")
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
func TestTryExecuteRange_LastStyleWindowBelowStepFallsBack(t *testing.T) {
	c, _ := newTestClient(t, prometheus.ClickhouseV2Config{})
	e := &executor{client: c, parser: prometheus.NewParser()}

	start := time.UnixMilli(1_700_000_000_000)
	end := time.UnixMilli(1_700_003_600_000)

	_, ok, err := e.TryExecuteRange(context.Background(), `sum by (pod) (up)`, start, end, time.Hour)
	require.NoError(t, err)
	assert.False(t, ok, "instant selection at step > lookback must not transpile")

	_, ok, err = e.TryExecuteRange(context.Background(), `last_over_time(up[10m])`, start, end, time.Hour)
	require.NoError(t, err)
	assert.False(t, ok, "last_over_time at range < step must not transpile")
}

// Transpiled results never pass the engine's sample limiter, so the grid
// cells (series x grid width) must be budgeted before the arrays exist —
// otherwise a wide query rebuilds the OOM this provider exists to prevent.
func TestExecuteUnit_GridCellBudget(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{MaxFetchedSamples: 100})
	e := &executor{client: c, parser: prometheus.NewParser()}

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("up", int64(1_699_999_200_000), int64(1_700_003_600_000)).WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(1), `{"__name__":"up","instance":"a"}`},
		{uint64(2), `{"__name__":"up","instance":"b"}`},
	}))

	plan, ok := classify(parse(t, `sum(rate(up[5m]))`), gridContext{startMs: 1_700_000_000_000, endMs: 1_700_003_600_000, stepMs: 60_000})
	require.True(t, ok)

	var cells atomic.Int64
	// 2 series x 61 grid points = 122 cells > 100.
	_, err := e.executeUnit(context.Background(), &plan.units[0].core, plan.units[0].grid, &cells)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "budget refusal must be typed invalid input, got %v", err)
}

// Two metrics collapsing onto one labelset after the name drop is the
// engine's duplicate-labelset error; silently merging them would invent a
// series no engine would produce.
func TestExecuteUnit_NameCollisionErrors(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{})
	e := &executor{client: c, parser: prometheus.NewParser()}

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("^(?:a|b)$", int64(1_699_999_200_000), int64(1_700_003_600_000)).WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(1), `{"__name__":"a","job":"x"}`},
		{uint64(2), `{"__name__":"b","job":"x"}`},
	}))
	store.Mock().ExpectQuery("SELECT gkey").
		WithArgs("^(?:a|b)$", int64(1_699_999_200_000), int64(1_700_003_600_000), "a", "b", int64(1_699_999_700_000), int64(1_700_003_600_000)).
		WillReturnRows(cmock.NewRows(gkeyCols, [][]any{
			{`[["__name__","a"],["job","x"]]`, []*float64{f64(1)}},
			{`[["__name__","b"],["job","x"]]`, []*float64{f64(2)}},
		}))

	plan, ok := classify(parse(t, `rate({__name__=~"a|b"}[5m])`), gridContext{startMs: 1_700_000_000_000, endMs: 1_700_003_600_000, stepMs: 60_000})
	require.True(t, ok)

	var cells atomic.Int64
	_, err := e.executeUnit(context.Background(), &plan.units[0].core, plan.units[0].grid, &cells)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "vector cannot contain metrics with the same labelset")
}

var gkeyCols = []cmock.ColumnType{
	{Name: "gkey", Type: "String"},
	{Name: "grid", Type: "Array(Nullable(Float64))"},
}

func f64(v float64) *float64 { return &v }
