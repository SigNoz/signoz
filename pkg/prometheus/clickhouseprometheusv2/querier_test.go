package clickhouseprometheusv2

import (
	"context"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
)

var (
	seriesCols = []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "labels", Type: "String"},
	}
	samplesCols = []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "unix_milli", Type: "Int64"},
		{Name: "value", Type: "Float64"},
		{Name: "flags", Type: "UInt32"},
	}
)

func newTestClient(t *testing.T, cfg prometheus.ClickhouseV2Config) (*client, *telemetrystoretest.Provider) {
	t.Helper()
	store := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)
	settings := factory.NewScopedProviderSettings(instrumentationtest.New().ToProviderSettings(), "clickhouseprometheusv2_test")
	promCfg := prometheus.Config{ClickhouseV2: cfg}
	return newClient(settings, store, promCfg), store
}

func testMatchers(t *testing.T) []*labels.Matcher {
	t.Helper()
	return []*labels.Matcher{
		mustMatcher(t, labels.MatchEqual, "__name__", "cpu_usage"),
		mustMatcher(t, labels.MatchEqual, "job", "api"),
	}
}

func TestQuerierSelectRawPath(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{})
	q := &querier{mint: 1000, maxt: 2000, client: c}

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("cpu_usage", int64(0), int64(2000), "job", "api").WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(42), `{"__name__":"cpu_usage","job":"api","instance":"a"}`},
		{uint64(7), `{"__name__":"cpu_usage","job":"api","instance":"b"}`},
	}))
	// Inline fingerprints (sorted), raw samples: no traits in ctx -> no
	// last-sample-per-step reduction.
	store.Mock().ExpectQuery("SELECT fingerprint, unix_milli, value, flags FROM signoz_metrics.distributed_samples_v4 WHERE metric_name = \\? AND temporality IN \\['Cumulative', 'Unspecified'\\] AND fingerprint IN \\(7, 42\\)").
		WithArgs("cpu_usage", int64(1000), int64(2000)).
		WillReturnRows(cmock.NewRows(samplesCols, [][]any{
			{uint64(7), int64(1100), 1.5, uint32(0)},
			{uint64(7), int64(1200), 2.5, uint32(0)},
			{uint64(42), int64(1100), 3.5, uint32(1)}, // stale marker
		}))

	hints := &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000}
	set := q.Select(context.Background(), false, hints, testMatchers(t)...)

	var got []*series
	for set.Next() {
		got = append(got, set.At().(*series))
	}
	require.NoError(t, set.Err())
	require.Len(t, got, 2)

	// Sorted by labels: instance=a (fp 42) before instance=b (fp 7).
	assert.Equal(t, "a", got[0].lset.Get("instance"))
	require.Len(t, got[0].ts, 1)
	assert.True(t, got[0].vs[0] != got[0].vs[0], "stale marker must be NaN") //nolint:testifylint

	assert.Equal(t, "b", got[1].lset.Get("instance"))
	assert.Equal(t, []int64{1100, 1200}, got[1].ts)
	assert.Equal(t, []float64{1.5, 2.5}, got[1].vs)

	// No fingerprint label injected.
	assert.Empty(t, got[0].lset.Get("fingerprint"))
}

// Wrong gating silently corrupts range functions (a rate over reduced
// samples loses points), so the decision logic is pinned here even though
// the helper is unexported: the integration suite would catch it too, but
// with far worse failure locality.
func TestLastSamplePerStepFor(t *testing.T) {
	c, _ := newTestClient(t, prometheus.ClickhouseV2Config{})
	q := &querier{mint: 0, maxt: 2000, client: c}
	traitsCtx := prometheus.NewContextWithQueryTraits(context.Background(), prometheus.QueryTraits{SubqueryFree: true})

	tests := []struct {
		name  string
		ctx   context.Context
		hints *storage.SelectHints
		want  *lastSamplePerStep
	}{
		{"no traits in context stays raw", context.Background(), &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000}, nil},
		{"subquery in the query stays raw", prometheus.NewContextWithQueryTraits(context.Background(), prometheus.QueryTraits{SubqueryFree: false}), &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000}, nil},
		{"range selector stays raw", traitsCtx, &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000, Range: 300_000}, nil},
		{"instant selector reduces, anchored at first eval", traitsCtx, &storage.SelectHints{Start: 1000, End: 2_000_000, Step: 60_000}, &lastSamplePerStep{firstEvalMs: 1000 + c.lookbackMs - 1, stepMs: 60_000}},
		{"anchor never passes the window end", traitsCtx, &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000}, &lastSamplePerStep{firstEvalMs: 2000, stepMs: 60_000}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, q.lastSamplePerStepFor(tt.ctx, tt.hints))
		})
	}
}

func TestQuerierSelectSeriesBudget(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{MaxFetchedSeries: 1})
	q := &querier{mint: 1000, maxt: 2000, client: c}

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("cpu_usage", int64(0), int64(2000), "job", "api").WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(1), `{"__name__":"cpu_usage","instance":"a"}`},
		{uint64(2), `{"__name__":"cpu_usage","instance":"b"}`},
	}))

	set := q.Select(context.Background(), false, &storage.SelectHints{Start: 1000, End: 2000}, testMatchers(t)...)
	assert.False(t, set.Next())
	require.Error(t, set.Err())
	assert.True(t, errors.Ast(set.Err(), errors.TypeInvalidInput), "budget error must be typed invalid input, got %v", set.Err())
}

func TestQuerierSelectSamplesBudget(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{MaxFetchedSamples: 2})
	q := &querier{mint: 1000, maxt: 2000, client: c}

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("cpu_usage", int64(0), int64(2000)).WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(7), `{"__name__":"cpu_usage"}`},
	}))
	store.Mock().ExpectQuery("SELECT fingerprint, unix_milli, value, flags").
		WithArgs("cpu_usage", int64(1000), int64(2000)).
		WillReturnRows(cmock.NewRows(samplesCols, [][]any{
			{uint64(7), int64(1100), 1.0, uint32(0)},
			{uint64(7), int64(1200), 2.0, uint32(0)},
			{uint64(7), int64(1300), 3.0, uint32(0)},
		}))

	set := q.Select(context.Background(), false, &storage.SelectHints{Start: 1000, End: 2000},
		mustMatcher(t, labels.MatchEqual, "__name__", "cpu_usage"))
	assert.False(t, set.Next())
	require.Error(t, set.Err())
	assert.True(t, errors.Ast(set.Err(), errors.TypeInvalidInput))
}

func TestQuerierSelectSubqueryFilterOverInlineLimit(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{})
	q := &querier{mint: 1000, maxt: 2000, client: c}

	seriesRows := make([][]any, inlineFingerprintsLimit+1)
	for i := range seriesRows {
		seriesRows[i] = []any{uint64(i + 1), fmt.Sprintf(`{"__name__":"cpu_usage","instance":"i%d"}`, i)}
	}
	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WithArgs("cpu_usage", int64(0), int64(2000), "job", "api").WillReturnRows(cmock.NewRows(seriesCols, seriesRows))
	// The over-limit samples query embeds the semi-join against the
	// shard-local series table (fingerprint co-locality), not a GLOBAL
	// broadcast; args follow placeholder order — samples metric name, then
	// the semi-join's series predicates, then the samples window bounds.
	store.Mock().ExpectQuery("fingerprint IN \\(SELECT fingerprint FROM signoz_metrics\\.time_series_v4").
		WithArgs("cpu_usage", "cpu_usage", int64(0), int64(2000), "job", "api", int64(1000), int64(2000)).
		WillReturnRows(cmock.NewRows(samplesCols, [][]any{}))

	set := q.Select(context.Background(), false, &storage.SelectHints{Start: 1000, End: 2000}, testMatchers(t)...)
	assert.False(t, set.Next())
	require.NoError(t, set.Err())
}

func TestQuerierSelectRawSQLPassthrough(t *testing.T) {
	c, store := newTestClient(t, prometheus.ClickhouseV2Config{})
	q := &querier{mint: 1000, maxt: 2000, client: c}

	rawCols := []cmock.ColumnType{
		{Name: "le", Type: "String"},
		{Name: "value", Type: "Float64"},
	}
	store.Mock().ExpectQuery("SELECT le, avg\\(v\\) AS value FROM t").WillReturnRows(cmock.NewRows(rawCols, [][]any{
		{"0.5", 12.5},
	}))

	set := q.Select(context.Background(), false, &storage.SelectHints{Start: 1000, End: 2000},
		mustMatcher(t, labels.MatchEqual, "job", "rawsql"),
		mustMatcher(t, labels.MatchEqual, "query", "SELECT le, avg(v) AS value FROM t"),
	)

	require.True(t, set.Next())
	s := set.At()
	assert.Equal(t, "0.5", s.Labels().Get("le"))
	it := s.Iterator(nil)
	require.NotNil(t, it)
	_, v := func() (int64, float64) { it.Next(); return it.At() }()
	assert.Equal(t, 12.5, v)
	assert.False(t, set.Next())
}

func TestCaptureQuerierRecordsWithoutExecuting(t *testing.T) {
	c, _ := newTestClient(t, prometheus.ClickhouseV2Config{})
	recorder := &statementRecorder{}
	cq := &captureQuerier{querier: querier{mint: 1000, maxt: 2000, client: c}, recorder: recorder}

	ctx := prometheus.NewContextWithQueryTraits(context.Background(), prometheus.QueryTraits{SubqueryFree: true})
	set := cq.Select(ctx, false, &storage.SelectHints{Start: 1000, End: 2000, Step: 60_000}, testMatchers(t)...)
	assert.False(t, set.Next())
	require.NoError(t, set.Err())

	statements := recorder.Statements()
	require.Len(t, statements, 1)
	assert.Contains(t, statements[0].Query, "IN (SELECT fingerprint FROM signoz_metrics.time_series_v4")
	assert.Contains(t, statements[0].Query, "argMax(value, unix_milli)")
}
