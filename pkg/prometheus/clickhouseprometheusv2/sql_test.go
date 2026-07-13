package clickhouseprometheusv2

import (
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func mustMatcher(t *testing.T, mt labels.MatchType, name, value string) *labels.Matcher {
	t.Helper()
	m, err := labels.NewMatcher(mt, name, value)
	require.NoError(t, err)
	return m
}

func TestTimeSeriesTableFor(t *testing.T) {
	base := time.Date(2026, 7, 10, 3, 27, 0, 0, time.UTC).UnixMilli()

	tests := []struct {
		name      string
		span      time.Duration
		wantTable string
		roundTo   time.Duration
	}{
		{"under 6h uses hourly table", 2 * time.Hour, distributedTimeSeriesV4, time.Hour},
		{"under 1d uses 6h table", 12 * time.Hour, distributedTimeSeriesV46hrs, 6 * time.Hour},
		{"under 1w uses 1d table", 3 * 24 * time.Hour, distributedTimeSeriesV41day, 24 * time.Hour},
		{"over 1w uses 1w table", 10 * 24 * time.Hour, distributedTimeSeriesV41week, 7 * 24 * time.Hour},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, table := timeSeriesTableFor(base, base+tt.span.Milliseconds())
			assert.Equal(t, tt.wantTable, table)
			assert.Zero(t, start%tt.roundTo.Milliseconds())
			assert.LessOrEqual(t, start, base)
		})
	}
}

func TestBuildSeriesQuery(t *testing.T) {
	start := int64(1_700_000_000_000)
	end := start + time.Hour.Milliseconds()
	// The series table window rounds down to the table's bucket boundary.
	adjustedStart := start - (start % time.Hour.Milliseconds())

	t.Run("equality name and label matchers", func(t *testing.T) {
		query, args, err := buildSeriesQuery(start, end, []*labels.Matcher{
			mustMatcher(t, labels.MatchEqual, "__name__", "http_requests_total"),
			mustMatcher(t, labels.MatchEqual, "job", "api"),
		})
		require.NoError(t, err)
		assert.Equal(t,
			"SELECT fingerprint, any(labels) FROM signoz_metrics.distributed_time_series_v4 WHERE metric_name = ? AND temporality IN ['Cumulative', 'Unspecified'] AND __normalized = false AND unix_milli >= ? AND unix_milli < ? AND JSONExtractString(labels, ?) = ? GROUP BY fingerprint",
			query,
		)
		assert.Equal(t, []any{"http_requests_total", adjustedStart, end, "job", "api"}, args)
	})

	t.Run("regex matchers are anchored", func(t *testing.T) {
		_, args, err := buildSeriesQuery(start, end, []*labels.Matcher{
			mustMatcher(t, labels.MatchEqual, "__name__", "up"),
			mustMatcher(t, labels.MatchRegexp, "instance", "prod.*"),
			mustMatcher(t, labels.MatchNotRegexp, "env", "dev|test"),
		})
		require.NoError(t, err)
		assert.Equal(t, []any{"up", adjustedStart, end, "instance", "^(?:prod.*)$", "env", "^(?:dev|test)$"}, args)
	})

	t.Run("regex name matcher uses metric_name column", func(t *testing.T) {
		query, args, err := buildSeriesQuery(start, end, []*labels.Matcher{
			mustMatcher(t, labels.MatchRegexp, "__name__", "node_cpu.*|node_memory.*"),
		})
		require.NoError(t, err)
		assert.Contains(t, query, "match(metric_name, ?)")
		assert.NotContains(t, query, "JSONExtractString")
		assert.Equal(t, []any{"^(?:node_cpu.*|node_memory.*)$", adjustedStart, end}, args)
	})

	t.Run("no name matcher omits metric_name condition", func(t *testing.T) {
		query, _, err := buildSeriesQuery(start, end, []*labels.Matcher{
			mustMatcher(t, labels.MatchEqual, "job", "api"),
		})
		require.NoError(t, err)
		assert.NotContains(t, query, "metric_name")
	})
}

func TestBuildSamplesQuery(t *testing.T) {
	start := int64(1_700_000_000_000)
	end := start + time.Hour.Milliseconds()
	adjustedStart := start - (start % time.Hour.Milliseconds())
	matchers := []*labels.Matcher{
		mustMatcher(t, labels.MatchEqual, "__name__", "up"),
		mustMatcher(t, labels.MatchEqual, "job", "api"),
	}

	t.Run("raw with inline fingerprints", func(t *testing.T) {
		query, args, err := buildSamplesQuery(start, end, []string{"up"}, []uint64{7, 42}, matchers, nil)
		require.NoError(t, err)
		assert.Equal(t,
			"SELECT fingerprint, unix_milli, value, flags FROM signoz_metrics.distributed_samples_v4 WHERE metric_name = ? AND temporality IN ['Cumulative', 'Unspecified'] AND fingerprint IN (7, 42) AND unix_milli >= ? AND unix_milli <= ? ORDER BY fingerprint, unix_milli",
			query,
		)
		assert.Equal(t, []any{"up", start, end}, args)
	})

	t.Run("last-sample-per-step groups by step bucket anchored at first eval", func(t *testing.T) {
		lastPerStep := &lastSamplePerStep{firstEvalMs: start + 299_999, stepMs: 60_000}
		query, _, err := buildSamplesQuery(start, end, []string{"up"}, []uint64{7}, matchers, lastPerStep)
		require.NoError(t, err)
		assert.Contains(t, query, "argMax(value, unix_milli) AS val")
		assert.Contains(t, query, "argMax(flags, unix_milli) AS fl")
		assert.Contains(t, query, "GROUP BY fingerprint, if(unix_milli <= 1700000299999, 0, intDiv(unix_milli - 1700000299999 - 1, 60000) + 1)")
		assert.Contains(t, query, "ORDER BY fingerprint, ts")
		// Aliases must not shadow the source columns referenced in WHERE.
		assert.NotContains(t, query, "AS unix_milli")
		assert.NotContains(t, query, "AS value")
		assert.NotContains(t, query, "AS flags")
	})

	t.Run("instant query keeps one bucket", func(t *testing.T) {
		lastPerStep := &lastSamplePerStep{firstEvalMs: end, stepMs: 0}
		query, _, err := buildSamplesQuery(start, end, []string{"up"}, []uint64{7}, matchers, lastPerStep)
		require.NoError(t, err)
		assert.Contains(t, query, "GROUP BY fingerprint ORDER BY fingerprint, ts")
		assert.NotContains(t, query, "intDiv")
	})

	t.Run("over-limit set becomes a shard-local semi-join", func(t *testing.T) {
		query, args, err := buildSamplesQuery(start, end, []string{"up"}, nil, matchers, nil)
		require.NoError(t, err)
		assert.Contains(t, query, "fingerprint IN (SELECT fingerprint FROM signoz_metrics.time_series_v4 WHERE ")
		assert.NotContains(t, query, "GLOBAL IN")
		// Args follow placeholder order: samples metric name, the semi-join's
		// series predicates, then the samples window bounds.
		assert.Equal(t, []any{"up", "up", adjustedStart, end, "job", "api", start, end}, args)
	})

	t.Run("multiple metric names from regex selector", func(t *testing.T) {
		query, args, err := buildSamplesQuery(start, end, []string{"node_cpu", "node_memory"}, []uint64{7}, matchers, nil)
		require.NoError(t, err)
		assert.Contains(t, query, "metric_name IN (?, ?)")
		assert.Equal(t, []any{"node_cpu", "node_memory", start, end}, args)
	})
}
