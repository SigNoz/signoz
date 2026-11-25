package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type regexMatcher struct {
}

func (m *regexMatcher) Match(expectedSQL, actualSQL string) error {
	re, err := regexp.Compile(expectedSQL)
	if err != nil {
		return err
	}
	if !re.MatchString(actualSQL) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expected query to contain %s, got %s", expectedSQL, actualSQL)
	}
	return nil
}

func TestGetFirstSeenFromMetricMetadata(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		flaggertest.New(t),
	)

	lookupKeys := []telemetrytypes.MetricMetadataLookupKey{
		{
			MetricName:     "metric1",
			AttributeName:  "attr1",
			AttributeValue: "val1",
		},
		{
			MetricName:     "metric2",
			AttributeName:  "attr2",
			AttributeValue: "val2",
		},
	}

	// ClickHouse tuple syntax is (x, y, z)
	// the structure should lead to:
	// SELECT ... WHERE (metric_name, attr_name, attr_string_value) IN ((?, ?, ?), (?, ?, ?)) ...

	expectedQuery := `SELECT metric_name, attr_name, attr_string_value, min\(first_reported_unix_milli\) AS first_seen FROM signoz_metrics.distributed_metadata WHERE \(metric_name, attr_name, attr_string_value\) IN \(\(\?, \?, \?\), \(\?, \?, \?\)\) GROUP BY metric_name, attr_name, attr_string_value ORDER BY first_seen`

	// Note: regexMatcher uses regexp.MatchString, so we escape parens and ?

	mock.ExpectQuery(expectedQuery).
		WithArgs("metric1", "attr1", "val1", "metric2", "attr2", "val2").
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "metric_name", Type: "String"},
			{Name: "attr_name", Type: "String"},
			{Name: "attr_string_value", Type: "String"},
			{Name: "first_seen", Type: "UInt64"},
		}, [][]any{
			{"metric1", "attr1", "val1", uint64(1000)},
			{"metric2", "attr2", "val2", uint64(2000)},
		}))

	result, err := metadata.GetFirstSeenFromMetricMetadata(context.Background(), lookupKeys)
	require.NoError(t, err)

	assert.Equal(t, int64(1000), result[lookupKeys[0]])
	assert.Equal(t, int64(2000), result[lookupKeys[1]])

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

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
