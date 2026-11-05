package telemetrystore

import (
	"context"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
)

func TestQuerySettingsFromContext(t *testing.T) {
	testCases := []struct {
		name string
		ctx  func() context.Context
		want clickhouse.Settings
	}{
		{
			name: "Unset_Nil",
			ctx:  context.Background,
			want: nil,
		},
		{
			name: "NestedCalls_MergeLaterWins",
			ctx: func() context.Context {
				ctx := NewContextWithQuerySettings(context.Background(), clickhouse.Settings{"max_execution_time": 30, "max_memory_usage": 100})
				return NewContextWithQuerySettings(ctx, clickhouse.Settings{"max_execution_time": 10})
			},
			want: clickhouse.Settings{"max_execution_time": 10, "max_memory_usage": 100},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, QuerySettingsFromContext(testCase.ctx()))
		})
	}
}
