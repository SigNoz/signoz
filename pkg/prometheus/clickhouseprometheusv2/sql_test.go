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
			"SELECT fingerprint, any(labels) FROM signoz_metrics.distributed_time_series_v4 WHERE metric_name = ? AND temporality IN ['Cumulative', 'Unspecified'] AND unix_milli >= ? AND unix_milli <= ? AND JSONExtractString(labels, ?) = ? GROUP BY fingerprint",
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

	t.Run("raw fetch filters by a shard-local semi-join", func(t *testing.T) {
		query, args, err := buildSamplesQuery(start, end, []string{"up"}, matchers, nil)
		require.NoError(t, err)
		assert.Contains(t, query, "fingerprint IN (SELECT fingerprint FROM signoz_metrics.time_series_v4 WHERE ")
		assert.NotContains(t, query, "GLOBAL IN")
		assert.Contains(t, query, "ORDER BY fingerprint, unix_milli")
		// Args follow placeholder order: samples metric name, the semi-join's
		// series predicates, then the samples window bounds.
		assert.Equal(t, []any{"up", "up", adjustedStart, end, "job", "api", start, end}, args)
	})

	t.Run("last-sample-per-step groups by step bucket anchored at first eval", func(t *testing.T) {
		lastPerStep := &lastSamplePerStep{firstEvalMs: start + 299_999, stepMs: 60_000}
		query, _, err := buildSamplesQuery(start, end, []string{"up"}, matchers, lastPerStep)
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
		query, _, err := buildSamplesQuery(start, end, []string{"up"}, matchers, lastPerStep)
		require.NoError(t, err)
		assert.Contains(t, query, "GROUP BY fingerprint ORDER BY fingerprint, ts")
		assert.NotContains(t, query, "intDiv")
	})

	t.Run("multiple metric names from regex selector", func(t *testing.T) {
		query, args, err := buildSamplesQuery(start, end, []string{"node_cpu", "node_memory"}, matchers, nil)
		require.NoError(t, err)
		assert.Contains(t, query, "metric_name IN (?, ?)")
		assert.Equal(t, []any{"node_cpu", "node_memory", "up", adjustedStart, end, "job", "api", start, end}, args)
	})
}
