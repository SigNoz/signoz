package querier

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestValueSize(t *testing.T) {
	body := "token rejected"
	testCases := []struct {
		name  string
		value any
		want  uint64
	}{
		{name: "String", value: "abc", want: 3},
		{name: "PointerToString", value: &body, want: uint64(len(body))},
		{name: "NilPointer", value: (*string)(nil), want: 0},
		{name: "Bytes", value: []byte("abcd"), want: 4},
		{name: "StringMap", value: map[string]string{"k8s.pod.name": "api-0"}, want: 17},
		{name: "NumberMap", value: map[string]float64{"code": 401}, want: 12},
		{name: "StringSlice", value: []string{"a", "bc"}, want: 3},
		{name: "Uint64", value: uint64(7), want: 8},
		{name: "Time", value: time.Unix(0, 0), want: uint64(reflect.TypeFor[time.Time]().Size())},
		{name: "Nil", value: nil, want: 0},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, valueSize(reflect.ValueOf(testCase.value)))
		})
	}
}

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

func TestChSQLQueryExecute_ResultBudget(t *testing.T) {
	testCases := []struct {
		name           string
		maxResultRows  int64
		maxResultBytes int64
		wantErrCode    *errors.Code
		wantRows       int
	}{
		{name: "UnderBudget_ReturnsRows", maxResultBytes: 1 << 20, wantRows: 3},
		{name: "NoBudget_ReturnsRows", maxResultBytes: 0, wantRows: 3},
		{name: "OverByteBudget_ResultTooLarge", maxResultBytes: 2000, wantErrCode: &ErrCodeClickHouseQueryResultTooLarge},
		{name: "AtRowBudget_ReturnsRows", maxResultRows: 3, wantRows: 3},
		{name: "OverRowBudget_ResultTooLarge", maxResultRows: 2, wantErrCode: &ErrCodeClickHouseQueryResultTooLarge},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
			cols := []cmock.ColumnType{{Name: "id", Type: "String"}, {Name: "body", Type: "String"}}
			telemetryStore.Mock().ExpectQuery("SELECT").WillReturnRows(cmock.NewRows(cols, [][]any{
				{"1", strings.Repeat("a", 1000)},
				{"2", strings.Repeat("b", 1000)},
				{"3", strings.Repeat("c", 1000)},
			}))

			query := newchSQLQuery(
				instrumentationtest.New().Logger(),
				telemetryStore,
				qbtypes.ClickHouseQuery{Name: "A", Query: "SELECT id, body FROM signoz_logs.distributed_logs_v2"},
				nil,
				qbtypes.TimeRange{From: 1, To: 2},
				qbtypes.RequestTypeRaw,
				nil,
				ClickHouseQueryConfig{MaxResultRows: testCase.maxResultRows, MaxResultBytes: testCase.maxResultBytes},
			)

			result, err := query.Execute(context.Background())
			if testCase.wantErrCode != nil {
				require.Error(t, err)
				_, code, _, _, _, _ := errors.Unwrapb(err)
				assert.Equal(t, *testCase.wantErrCode, code)
				return
			}
			require.NoError(t, err)
			raw, ok := result.Value.(*qbtypes.RawData)
			require.True(t, ok)
			assert.Len(t, raw.Rows, testCase.wantRows)
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
