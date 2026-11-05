package querier

import (
	"context"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/errors"
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
			name:   "AllSet",
			config: ClickHouseQueryConfig{MaxExecutionTime: time.Minute, MaxMemoryUsage: 1 << 30, MaxResultRows: 1000, MaxResultBytes: 1 << 20},
			want: clickhouse.Settings{
				"max_execution_time":   60,
				"max_memory_usage":     int64(1 << 30),
				"max_result_rows":      int64(1000),
				"max_result_bytes":     int64(1 << 20),
				"result_overflow_mode": "throw",
			},
		},
		{
			name:   "SubSecondTime_RoundsUp",
			config: ClickHouseQueryConfig{MaxExecutionTime: 1500 * time.Millisecond},
			want:   clickhouse.Settings{"max_execution_time": 2},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.config.settings())
		})
	}
}

func TestChSQLQueryBudgetError(t *testing.T) {
	query := &chSQLQuery{budget: ClickHouseQueryConfig{MaxExecutionTime: time.Millisecond}}
	cause := context.DeadlineExceeded

	expired, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
	defer cancel()
	<-expired.Done()

	testCases := []struct {
		name        string
		parentCtx   context.Context
		ctx         context.Context
		wantTimeout bool
	}{
		{name: "BudgetExpired_Timeout", parentCtx: context.Background(), ctx: expired, wantTimeout: true},
		{name: "ParentExpired_PassesThrough", parentCtx: expired, ctx: expired},
		{name: "NotExpired_PassesThrough", parentCtx: context.Background(), ctx: context.Background()},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := query.budgetError(testCase.parentCtx, testCase.ctx, cause)
			if !testCase.wantTimeout {
				assert.Equal(t, cause, err)
				return
			}
			typ, code, _, _, _, _ := errors.Unwrapb(err)
			assert.Equal(t, errors.TypeTimeout, typ)
			assert.Equal(t, ErrCodeClickHouseQueryTimeout, code)
		})
	}
}
