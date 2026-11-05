package querier

import (
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestClickHouseQueryConfigSettings(t *testing.T) {
	allSet := ClickHouseQueryConfig{MaxExecutionTime: time.Minute, MaxMemoryUsage: 1 << 30, MaxResultRows: 1000, MaxResultBytes: 1 << 20}

	testCases := []struct {
		name        string
		config      ClickHouseQueryConfig
		requestType qbtypes.RequestType
		want        clickhouse.Settings
	}{
		{
			name:        "AllZero_NoSettings",
			config:      ClickHouseQueryConfig{},
			requestType: qbtypes.RequestTypeRaw,
			want:        clickhouse.Settings{},
		},
		{
			name:        "AllSet_Raw_NoExecutionTimeSetting",
			config:      allSet,
			requestType: qbtypes.RequestTypeRaw,
			want: clickhouse.Settings{
				"max_memory_usage":     int64(1 << 30),
				"max_result_rows":      int64(1000),
				"max_result_bytes":     int64(1 << 20),
				"result_overflow_mode": "throw",
			},
		},
		{
			name:        "AllSet_TimeSeries_NoRowLimit",
			config:      allSet,
			requestType: qbtypes.RequestTypeTimeSeries,
			want: clickhouse.Settings{
				"max_memory_usage":     int64(1 << 30),
				"max_result_bytes":     int64(1 << 20),
				"result_overflow_mode": "throw",
			},
		},
		{
			name:        "RowsOnly_Scalar_NoSettings",
			config:      ClickHouseQueryConfig{MaxResultRows: 1000},
			requestType: qbtypes.RequestTypeScalar,
			want:        clickhouse.Settings{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.config.settings(testCase.requestType))
		})
	}
}
