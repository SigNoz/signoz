package clickhouseprometheus

import (
	"context"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
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
