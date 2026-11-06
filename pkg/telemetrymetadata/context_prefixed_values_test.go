package telemetrymetadata

import (
	"context"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestGetAllValuesExactNameFirst(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()
	metadata := NewTelemetryMetaStore(instrumentationtest.New().ToProviderSettings(), mockTelemetryStore, flaggertest.New(t))

	boolColumns := []cmock.ColumnType{{Name: "1", Type: "UInt8"}}
	valueColumns := []cmock.ColumnType{{Name: "string_value", Type: "String"}, {Name: "number_value", Type: "Float64"}}

	mock.ExpectQuery(`SELECT 1 FROM .*tag_key = \? AND tag_data_type = \? LIMIT`).
		WithArgs("log.level", "bool", 1).
		WillReturnRows(cmock.NewRows(boolColumns, [][]any{}))
	mock.ExpectQuery(`SELECT DISTINCT string_value, number_value FROM .*tag_key = \? AND tag_data_type <> \? LIMIT`).
		WithArgs("log.level", "bool", 3).
		WillReturnRows(cmock.NewRows(valueColumns, [][]any{{"warn", float64(0)}, {"info", float64(0)}}))
	mock.ExpectQuery(`SELECT 1 FROM .*tag_key = \? AND tag_data_type = \? AND tag_type = \?`).
		WithArgs("level", "bool", "logfield", 1).
		WillReturnRows(cmock.NewRows(boolColumns, [][]any{}))
	mock.ExpectQuery(`SELECT DISTINCT string_value, number_value FROM .*tag_key = \? AND tag_data_type <> \? AND tag_type = \?`).
		WithArgs("level", "bool", "logfield", 3).
		WillReturnRows(cmock.NewRows(valueColumns, [][]any{{"info", float64(0)}, {"debug", float64(0)}}))

	selector := telemetrytypes.NewFieldValueSelectorFromPostableFieldValueParams(telemetrytypes.PostableFieldValueParams{
		Name:                    "log.level",
		PostableFieldKeysParams: telemetrytypes.PostableFieldKeysParams{Signal: telemetrytypes.SignalLogs, Limit: 2},
	})

	values, complete, err := metadata.GetAllValues(context.Background(), valuer.GenerateUUID(), selector)
	require.NoError(t, err)

	assert.Equal(t, []string{"warn", "info"}, values.StringValues)
	assert.False(t, complete)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMergeFieldValues(t *testing.T) {
	testCases := []struct {
		name             string
		limit            int
		values           []*telemetrytypes.TelemetryFieldValues
		expected         *telemetrytypes.TelemetryFieldValues
		expectedComplete bool
	}{
		{
			name:             "BoolValuesOutsideLimit",
			limit:            1,
			values:           []*telemetrytypes.TelemetryFieldValues{{BoolValues: []bool{true, false}}, {StringValues: []string{"a"}}},
			expected:         &telemetrytypes.TelemetryFieldValues{StringValues: []string{"a"}, BoolValues: []bool{true, false}},
			expectedComplete: true,
		},
		{
			name:             "DuplicateAtLimitKeepsComplete",
			limit:            1,
			values:           []*telemetrytypes.TelemetryFieldValues{{StringValues: []string{"prod"}}, {StringValues: []string{"prod"}}},
			expected:         &telemetrytypes.TelemetryFieldValues{StringValues: []string{"prod"}},
			expectedComplete: true,
		},
		{
			name:             "DroppedValueMarksIncomplete",
			limit:            1,
			values:           []*telemetrytypes.TelemetryFieldValues{{StringValues: []string{"prod"}}, {StringValues: []string{"dev"}}},
			expected:         &telemetrytypes.TelemetryFieldValues{StringValues: []string{"prod"}},
			expectedComplete: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			merged, complete := mergeFieldValues(testCase.limit, testCase.values...)
			assert.Equal(t, testCase.expected, merged)
			assert.Equal(t, testCase.expectedComplete, complete)
		})
	}
}
