package clickhouseprometheus

import (
	"context"
	"sort"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/stretchr/testify/require"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/huandu/go-sqlbuilder"
	"github.com/prometheus/prometheus/prompb"
	"github.com/stretchr/testify/assert"
)

// Test for querySamples method.
func TestClient_QuerySamples(t *testing.T) {
	ctx := context.Background()
	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "metric_name", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "fingerprint", Type: "UInt64"})
	cols = append(cols, cmock.ColumnType{Name: "unix_milli", Type: "Int64"})
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "flags", Type: "UInt32"})
	tests := []struct {
		name               string
		start              int64
		end                int64
		fingerprints       map[uint64][]prompb.Label
		metricNames        []string
		subQuery           string
		args               []any
		setupMock          func(mock cmock.ClickConnMockCommon, args ...any)
		expectedTimeSeries int
		expectError        bool
		description        string
		result             []*prompb.TimeSeries
	}{
		{
			name:  "successful samples retrieval",
			start: int64(1000),
			end:   int64(2000),
			fingerprints: map[uint64][]prompb.Label{
				123: {
					{Name: "__name__", Value: "cpu_usage"},
					{Name: "instance", Value: "localhost:9090"},
				},
				456: {
					{Name: "__name__", Value: "cpu_usage"},
					{Name: "instance", Value: "localhost:9091"},
				},
			},
			metricNames:        []string{"cpu_usage"},
			subQuery:           "SELECT metric_name, fingerprint, unix_milli, value, flags",
			expectedTimeSeries: 2,
			expectError:        false,
			description:        "Should successfully retrieve samples for multiple time series",
			setupMock: func(mock cmock.ClickConnMockCommon, args ...any) {
				values := [][]interface{}{
					{"cpu_usage", uint64(123), int64(1001), float64(1.1), uint32(0)},
					{"cpu_usage", uint64(123), int64(1001), float64(1.1), uint32(0)},
					{"cpu_usage", uint64(456), int64(1001), float64(1.2), uint32(0)},
					{"cpu_usage", uint64(456), int64(1001), float64(1.2), uint32(0)},
					{"cpu_usage", uint64(456), int64(1001), float64(1.2), uint32(0)},
				}
				mock.ExpectQuery("SELECT metric_name, fingerprint, unix_milli, value, flags").WithArgs(args...).WillReturnRows(
					cmock.NewRows(cols, values),
				)
			},
			result: []*prompb.TimeSeries{
				{
					Labels: []prompb.Label{
						{Name: "__name__", Value: "cpu_usage"},
						{Name: "instance", Value: "localhost:9090"},
					},
					Samples: []prompb.Sample{
						{Timestamp: 1001, Value: 1.1},
					},
				},
				{
					Labels: []prompb.Label{
						{Name: "__name__", Value: "cpu_usage"},
						{Name: "instance", Value: "localhost:9091"},
					},
					Samples: []prompb.Sample{
						{Timestamp: 1001, Value: 1.2},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)
			readClient := client{telemetryStore: telemetryStore}
			if tt.setupMock != nil {
				tt.setupMock(telemetryStore.Mock(), "cpu_usage", tt.start, tt.end)

			}
			result, err := readClient.querySamples(ctx, tt.subQuery, []any{"cpu_usage", tt.start, tt.end}, tt.fingerprints)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedTimeSeries, len(result))
				assert.Equal(t, result, tt.result)
			}

		})
	}
}

// Regression for the duplicate-series class behind #8563: fingerprints
// sharing one labelset must come back as one merged series, the higher
// fingerprint winning equal timestamps.
func TestClient_QuerySamplesMergesIdenticalLabelSets(t *testing.T) {
	ctx := context.Background()
	cols := []cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "unix_milli", Type: "Int64"},
		{Name: "value", Type: "Float64"},
		{Name: "flags", Type: "UInt32"},
	}

	canary := []prompb.Label{
		{Name: "__name__", Value: "requests"},
		{Name: "group", Value: "canary"},
	}
	production := []prompb.Label{
		{Name: "__name__", Value: "requests"},
		{Name: "group", Value: "production"},
	}
	fingerprints := map[uint64][]prompb.Label{
		100: canary,
		200: canary,
		300: production,
	}

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)
	// Rows arrive ordered by (fingerprint, unix_milli), matching the SQL.
	values := [][]any{
		{"requests", uint64(100), int64(1000), float64(1.0), uint32(0)},
		{"requests", uint64(100), int64(2000), float64(2.0), uint32(0)},
		{"requests", uint64(200), int64(2000), float64(20.0), uint32(0)},
		{"requests", uint64(200), int64(3000), float64(30.0), uint32(0)},
		{"requests", uint64(300), int64(1500), float64(5.0), uint32(0)},
	}
	telemetryStore.Mock().ExpectQuery("SELECT metric_name, fingerprint, unix_milli, value, flags").
		WithArgs("requests", int64(1000), int64(3000)).
		WillReturnRows(cmock.NewRows(cols, values))

	readClient := client{telemetryStore: telemetryStore}
	result, err := readClient.querySamples(ctx, "SELECT metric_name, fingerprint, unix_milli, value, flags", []any{"requests", int64(1000), int64(3000)}, fingerprints)
	require.NoError(t, err)

	assert.Equal(t, []*prompb.TimeSeries{
		{
			Labels: canary,
			Samples: []prompb.Sample{
				{Timestamp: 1000, Value: 1.0},
				{Timestamp: 2000, Value: 20.0},
				{Timestamp: 3000, Value: 30.0},
			},
		},
		{
			Labels: production,
			Samples: []prompb.Sample{
				{Timestamp: 1500, Value: 5.0},
			},
		},
	}, result)
}

func TestClient_getFingerprintsFromClickhouseQuery(t *testing.T) {
	cols := []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "labels", Type: "String"},
	}

	sortLabels := func(ls []prompb.Label) {
		sort.Slice(ls, func(i, j int) bool {
			if ls[i].Name == ls[j].Name {
				return ls[i].Value < ls[j].Value
			}
			return ls[i].Name < ls[j].Name
		})
	}

	tests := []struct {
		name       string
		start, end int64
		metricName string
		subQuery   string
		args       []any
		setupMock  func(m cmock.ClickConnMockCommon, args ...any)
		want       map[uint64][]prompb.Label
		wantNames  []string
		wantErr    bool
	}{
		{
			name:       "happy-path - two fingerprints",
			start:      1000,
			end:        2000,
			metricName: "cpu_usage",
			subQuery:   `SELECT fingerprint,labels`,
			// args slice is empty here, but test‑case still owns it
			args: []any{},

			setupMock: func(m cmock.ClickConnMockCommon, args ...any) {
				rows := [][]any{
					{uint64(123), `{"__name__":"cpu_usage","t1":"s1","t2":"s2"}`},
					{uint64(234), `{"__name__":"cpu_usage","t1":"s1","t2":"s2","empty":""}`},
				}
				m.ExpectQuery(`SELECT fingerprint,labels`).WithArgs(args...).WillReturnRows(
					cmock.NewRows(cols, rows),
				)
			},

			// No synthetic fingerprint label (#8563), empty-valued labels
			// dropped: both fingerprints present one labelset for
			// querySamples to merge.
			want: map[uint64][]prompb.Label{
				123: {
					{Name: "__name__", Value: "cpu_usage"},
					{Name: "t1", Value: "s1"},
					{Name: "t2", Value: "s2"},
				},
				234: {
					{Name: "__name__", Value: "cpu_usage"},
					{Name: "t1", Value: "s1"},
					{Name: "t2", Value: "s2"},
				},
			},
			wantNames: []string{"cpu_usage"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			store := telemetrystoretest.New(
				telemetrystore.Config{Provider: "clickhouse"},
				sqlmock.QueryMatcherRegexp,
			)

			if tc.setupMock != nil {
				tc.setupMock(store.Mock(), tc.args...)
			}

			c := client{telemetryStore: store}

			got, gotNames, err := c.getFingerprintsFromClickhouseQuery(ctx, tc.subQuery, tc.args)
			if tc.wantErr {
				require.Error(t, err)
				require.Nil(t, got)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantNames, gotNames, "discovered metric names mismatch")
			require.Equal(t, len(tc.want), len(got), "fingerprint map length mismatch")
			for fp, expLabels := range tc.want {
				gotLabels, ok := got[fp]
				require.Truef(t, ok, "missing fingerprint %d", fp)

				sortLabels(expLabels)
				sortLabels(gotLabels)

				assert.Equalf(t, expLabels, gotLabels, "labels mismatch for fingerprint %d", fp)
			}
		})
	}
}

// Regression for nameless/regex-name selectors silently returning empty:
// the old code reduced every __name__ matcher to `metric_name = <value>`
// (empty string when absent). Regexes must come out anchored — Prometheus
// matcher semantics, while ClickHouse match() substring-matches.
func TestQueryToClickhouseQueryNameMatchers(t *testing.T) {
	query := func(matchers ...*prompb.LabelMatcher) *prompb.Query {
		return &prompb.Query{StartTimestampMs: 0, EndTimestampMs: 1000, Matchers: matchers}
	}

	tests := []struct {
		name     string
		query    *prompb.Query
		contains []string
		absent   []string
		args     []any
	}{
		{
			name:     "exact name",
			query:    query(&prompb.LabelMatcher{Type: prompb.LabelMatcher_EQ, Name: "__name__", Value: "cpu_usage"}),
			contains: []string{"metric_name = ?"},
			args:     []any{"cpu_usage"},
		},
		{
			name:     "regex name is anchored",
			query:    query(&prompb.LabelMatcher{Type: prompb.LabelMatcher_RE, Name: "__name__", Value: ".+"}),
			contains: []string{"match(metric_name, ?)"},
			args:     []any{"^(?:.+)$"},
		},
		{
			name: "nameless selector has no metric_name condition",
			query: query(
				&prompb.LabelMatcher{Type: prompb.LabelMatcher_EQ, Name: "job", Value: "api"},
				&prompb.LabelMatcher{Type: prompb.LabelMatcher_NRE, Name: "group", Value: "can.*"},
			),
			contains: []string{
				"JSONExtractString(labels, ?) = ?",
				"not match(JSONExtractString(labels, ?), ?)",
			},
			absent: []string{"metric_name"},
			args:   []any{"job", "api", "group", "^(?:can.*)$"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lookup, err := seriesLookupQuery(tt.query, false)
			require.NoError(t, err)
			sql, args := lookup.BuildWithFlavor(sqlbuilder.ClickHouse)
			for _, want := range tt.contains {
				assert.Contains(t, sql, want)
			}
			for _, notWant := range tt.absent {
				assert.NotContains(t, sql, notWant)
			}
			assert.Equal(t, tt.args, args)
		})
	}
}

// The samples query narrows by the metric names the lookup discovered and
// embeds the series lookup as a subquery, the builder merging its args in
// render order.
func TestBuildSamplesQueryMetricNames(t *testing.T) {
	sub := sqlbuilder.NewSelectBuilder()
	sub.Select("fingerprint")
	sub.From("t")
	sub.Where(sub.E("k", "v"))

	sql, args := buildSamplesQuery(5, 9, []string{"a_total", "b_total"}, sub)
	assert.Contains(t, sql, "metric_name IN (?, ?)")
	assert.Contains(t, sql, "fingerprint GLOBAL IN (SELECT fingerprint FROM t WHERE k = ?)")
	assert.Contains(t, sql, "unix_milli >= ? AND unix_milli <= ?")
	assert.Equal(t, []any{"a_total", "b_total", "v", int64(5), int64(9)}, args)

	sub2 := sqlbuilder.NewSelectBuilder()
	sub2.Select("fingerprint")
	sub2.From("t")
	sql, args = buildSamplesQuery(5, 9, nil, sub2)
	assert.NotContains(t, sql, "metric_name IN")
	assert.Equal(t, []any{int64(5), int64(9)}, args)
}

// Hash grouping must stay order-insensitive (stored JSON key order is not
// canonical across fingerprints), and a 64-bit hash collision between
// distinct labelsets must not merge them — splitByLabelSet is that guard.
func TestLabelsHashAndCollisionSplit(t *testing.T) {
	lbls := []prompb.Label{
		{Name: "__name__", Value: "requests"},
		{Name: "job", Value: "api"},
		{Name: "instance", Value: "0"},
	}
	reversed := []prompb.Label{lbls[2], lbls[1], lbls[0]}
	assert.Equal(t, labelsHash(lbls), labelsHash(reversed))

	a := &prompb.TimeSeries{Labels: []prompb.Label{{Name: "job", Value: "x"}}}
	b := &prompb.TimeSeries{Labels: []prompb.Label{{Name: "job", Value: "y"}}}
	c := &prompb.TimeSeries{Labels: []prompb.Label{{Name: "job", Value: "x"}}}
	got := splitByLabelSet([]*prompb.TimeSeries{a, b, c})
	require.Len(t, got, 2)
	assert.Equal(t, []*prompb.TimeSeries{a, c}, got[0])
	assert.Equal(t, []*prompb.TimeSeries{b}, got[1])
}
