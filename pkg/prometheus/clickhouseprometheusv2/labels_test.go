package clickhouseprometheusv2

import (
	"context"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/tsdb/chunkenc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var stringCol = []cmock.ColumnType{{Name: "value", Type: "String"}}

func newTestProvider(t *testing.T) (*provider, *telemetrystoretest.Provider) {
	t.Helper()
	client, store := newTestClient(t)
	return &provider{client: client}, store
}

func TestProviderLabelNames(t *testing.T) {
	start := time.Unix(1_700_000_000, 0)
	end := start.Add(time.Hour)

	testCases := []struct {
		name        string
		matcherSets [][]*labels.Matcher
		limit       int
		mockSetup   func(store *telemetrystoretest.Provider)
		expected    []string
	}{
		{
			name: "MultipleMatchGroups_ORMergedAndDeduplicated",
			matcherSets: [][]*labels.Matcher{
				{mustMatcher(t, labels.MatchEqual, "job", "api")},
				{mustMatcher(t, labels.MatchEqual, "job", "worker")},
			},
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("arrayJoin\\(JSONExtractKeys").WithArgs(anyArgs(4)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"job"}, {"service"}}))
				store.Mock().ExpectQuery("arrayJoin\\(JSONExtractKeys").WithArgs(anyArgs(4)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"job"}, {"pod"}}))
			},
			expected: []string{"job", "pod", "service"},
		},
		{
			// No LIMIT reaches the query: querier.LabelNames would apply it
			// as a bare SQL LIMIT with no ORDER BY, picking an arbitrary
			// rather than the smallest subset. The anchored regex fails the
			// mock match (and so the test) if a LIMIT clause reappears.
			name: "Limit_CapsMergedResultWithoutPushingLimitToSQL",
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().
					ExpectQuery(`arrayJoin\(JSONExtractKeys\(labels\)\) AS name FROM signoz_metrics\.\S+ WHERE temporality IN \['Cumulative', 'Unspecified'\] AND unix_milli >= \? AND unix_milli <= \?$`).
					WithArgs(anyArgs(2)...).
					WillReturnRows(cmock.NewRows(stringCol, [][]any{{"job"}, {"pod"}, {"service"}}))
			},
			limit:    2,
			expected: []string{"job", "pod"},
		},
		{
			name: "NoMatchGroups_RunsOneUnfilteredCall",
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("arrayJoin\\(JSONExtractKeys").WithArgs(anyArgs(2)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"__name__"}}))
			},
			expected: []string{"__name__"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			p, store := newTestProvider(t)
			testCase.mockSetup(store)

			names, err := p.LabelNames(context.Background(), testCase.matcherSets, start, end, testCase.limit)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, names)
		})
	}
}

func TestProviderLabelValues(t *testing.T) {
	start := time.Unix(1_700_000_000, 0)
	end := start.Add(time.Hour)

	testCases := []struct {
		name        string
		labelName   string
		matcherSets [][]*labels.Matcher
		limit       int
		mockSetup   func(store *telemetrystoretest.Provider)
		expected    []string
	}{
		{
			name:      "MultipleMatchGroups_ORMergedAndDeduplicated",
			labelName: "job",
			matcherSets: [][]*labels.Matcher{
				{mustMatcher(t, labels.MatchEqual, "__name__", "up")},
				{mustMatcher(t, labels.MatchEqual, "__name__", "down")},
			},
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("JSONExtractString\\(labels").WithArgs(anyArgs(4)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"api"}}))
				store.Mock().ExpectQuery("JSONExtractString\\(labels").WithArgs(anyArgs(4)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"worker"}, {"api"}}))
			},
			expected: []string{"api", "worker"},
		},
		{
			name:      "MetricNameLabel_ReadsMetricNameColumn",
			labelName: "__name__",
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("DISTINCT metric_name AS value").WithArgs(anyArgs(2)...).WillReturnRows(cmock.NewRows(stringCol, [][]any{{"up"}}))
			},
			expected: []string{"up"},
		},
		{
			// Same reasoning as TestProviderLabelNames's limit case:
			// querier.LabelValues would apply an unordered SQL LIMIT.
			name:      "Limit_CapsMergedResultWithoutPushingLimitToSQL",
			labelName: "job",
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().
					ExpectQuery(`JSONExtractString\(labels, \?\) AS value FROM signoz_metrics\.\S+ WHERE temporality IN \['Cumulative', 'Unspecified'\] AND unix_milli >= \? AND unix_milli <= \? AND value != ''$`).
					WithArgs(anyArgs(3)...).
					WillReturnRows(cmock.NewRows(stringCol, [][]any{{"api"}, {"db"}, {"worker"}}))
			},
			limit:    2,
			expected: []string{"api", "db"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			p, store := newTestProvider(t)
			testCase.mockSetup(store)

			values, err := p.LabelValues(context.Background(), testCase.labelName, testCase.matcherSets, start, end, testCase.limit)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, values)
		})
	}
}

func TestProviderSeries(t *testing.T) {
	start := time.Unix(1_700_000_000, 0)
	end := start.Add(time.Hour)
	seriesCols := []cmock.ColumnType{{Name: "fingerprint", Type: "UInt64"}, {Name: "labels", Type: "String"}}

	testCases := []struct {
		name        string
		matcherSets [][]*labels.Matcher
		limit       int
		mockSetup   func(store *telemetrystoretest.Provider)
		expected    []labels.Labels
	}{
		{
			name: "MultipleMatchGroups_ORMergedAndDeduplicated",
			matcherSets: [][]*labels.Matcher{
				{mustMatcher(t, labels.MatchEqual, "__name__", "up")},
				{mustMatcher(t, labels.MatchEqual, "__name__", "down")},
			},
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\) FROM").WithArgs(anyArgs(3)...).
					WillReturnRows(cmock.NewRows(seriesCols, [][]any{{uint64(1), `{"__name__":"up","job":"api"}`}}))
				store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\) FROM").WithArgs(anyArgs(3)...).
					WillReturnRows(cmock.NewRows(seriesCols, [][]any{
						{uint64(2), `{"__name__":"down","job":"api"}`},
						{uint64(3), `{"__name__":"up","job":"api"}`}, // same labelset as group 1, different fingerprint
					}))
			},
			expected: []labels.Labels{
				labels.FromStrings("__name__", "down", "job", "api"),
				labels.FromStrings("__name__", "up", "job", "api"),
			},
		},
		{
			name:        "Limit_CapsMergedResult",
			matcherSets: [][]*labels.Matcher{{mustMatcher(t, labels.MatchEqual, "__name__", "up")}},
			mockSetup: func(store *telemetrystoretest.Provider) {
				store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\) FROM").WithArgs(anyArgs(3)...).
					WillReturnRows(cmock.NewRows(seriesCols, [][]any{
						{uint64(1), `{"__name__":"up","job":"api"}`},
						{uint64(2), `{"__name__":"up","job":"worker"}`},
					}))
			},
			limit: 1,
			expected: []labels.Labels{
				labels.FromStrings("__name__", "up", "job", "api"),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			p, store := newTestProvider(t)
			testCase.mockSetup(store)

			series, err := p.Series(context.Background(), testCase.matcherSets, start, end, testCase.limit)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, series)
		})
	}
}

// TestQuerierSelectSeriesFuncSkipsSampleFetch locks in that a series-only
// Select (hints.Func == "series", as Series sets) never runs the samples
// query: only the series-lookup expectation below is registered, so the
// mock fails the test if fetchSamples still runs.
func TestQuerierSelectSeriesFuncSkipsSampleFetch(t *testing.T) {
	start := time.Unix(1_700_000_000, 0)
	end := start.Add(time.Hour)
	client, store := newTestClient(t)
	q := &querier{mint: start.UnixMilli(), maxt: end.UnixMilli(), client: client}

	seriesCols := []cmock.ColumnType{{Name: "fingerprint", Type: "UInt64"}, {Name: "labels", Type: "String"}}
	store.Mock().
		ExpectQuery("SELECT fingerprint, any\\(labels\\) FROM").
		WithArgs(anyArgs(3)...).
		WillReturnRows(cmock.NewRows(seriesCols, [][]any{{uint64(1), `{"__name__":"up","job":"api"}`}}))

	hints := &storage.SelectHints{Start: start.UnixMilli(), End: end.UnixMilli(), Func: "series"}
	ss := q.Select(context.Background(), false, hints, mustMatcher(t, labels.MatchEqual, "__name__", "up"))

	require.True(t, ss.Next())
	assert.Equal(t, labels.FromStrings("__name__", "up", "job", "api"), ss.At().Labels())
	assert.Equal(t, chunkenc.ValNone, ss.At().Iterator(nil).Next(), "a series-only Select must carry no samples")
	assert.False(t, ss.Next())
	require.NoError(t, ss.Err())
}
