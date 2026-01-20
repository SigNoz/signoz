package clickhouseprometheus

import (
	"context"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"sort"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/prometheus/prometheus/prompb"
	"github.com/stretchr/testify/assert"
)

// Test for querySamples method
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
		metricName         string
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
			metricName:         "cpu_usage",
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
				tt.setupMock(telemetryStore.Mock(), tt.metricName, tt.start, tt.end)

			}
			result, err := readClient.querySamples(ctx, tt.start, tt.end, tt.fingerprints, tt.metricName, tt.subQuery, tt.args)

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
					{uint64(123), `{"t1":"s1","t2":"s2"}`},
					{uint64(234), `{"t1":"s1","t2":"s2"}`},
				}
				m.ExpectQuery(`SELECT fingerprint,labels`).WithArgs(args...).WillReturnRows(
					cmock.NewRows(cols, rows),
				)
			},

			want: map[uint64][]prompb.Label{
				123: {
					{Name: "fingerprint", Value: "123"},
					{Name: "t1", Value: "s1"},
					{Name: "t2", Value: "s2"},
				},
				234: {
					{Name: "fingerprint", Value: "234"},
					{Name: "t1", Value: "s1"},
					{Name: "t2", Value: "s2"},
				},
			},
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

			got, err := c.getFingerprintsFromClickhouseQuery(ctx, tc.subQuery, tc.args)
			if tc.wantErr {
				require.Error(t, err)
				require.Nil(t, got)
				return
			}
			require.NoError(t, err)
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
