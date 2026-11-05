package querier

import (
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
)

func TestClickHouseQueryConfigSettings(t *testing.T) {
	testCases := []struct {
		name   string
		config ClickHouseQueryConfig
		want   clickhouse.Settings
	}{
		{
			name:   "AllZero_NoSettings",
			config: ClickHouseQueryConfig{},
			want:   clickhouse.Settings{},
		},
		{
			name:   "AllSet_NoExecutionTimeSetting",
			config: ClickHouseQueryConfig{MaxExecutionTime: time.Minute, MaxMemoryUsage: 1 << 30, MaxResultRows: 1000, MaxResultBytes: 1 << 20},
			want: clickhouse.Settings{
				"max_memory_usage":     int64(1 << 30),
				"max_result_rows":      int64(1000),
				"max_result_bytes":     int64(1 << 20),
				"result_overflow_mode": "throw",
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.config.settings())
		})
	}
}
