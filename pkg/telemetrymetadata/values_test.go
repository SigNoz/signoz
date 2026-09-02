package telemetrymetadata

import (
	"context"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newMockedMetaStore(t *testing.T) (*telemetryMetaStore, cmock.ClickConnMockCommon) {
	t.Helper()
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	store := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		flaggertest.New(t),
	)
	return store.(*telemetryMetaStore), mockTelemetryStore.Mock()
}

func TestGetAllValuesBoolFieldsSkipTheDatabase(t *testing.T) {
	store, mock := newMockedMetaStore(t)

	// a calculated bool span field is answered from the schema; no query runs
	values, complete, err := store.GetAllValues(context.Background(), valuer.UUID{}, &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "has_error", Signal: telemetrytypes.SignalTraces},
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.Equal(t, []bool{true, false}, values.BoolValues)
	assert.Empty(t, values.StringValues)

	// so is any key the caller declares bool, narrowed by the search text
	values, complete, err = store.GetAllValues(context.Background(), valuer.UUID{}, &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "http.conn.reused", Signal: telemetrytypes.SignalLogs, FieldDataType: telemetrytypes.FieldDataTypeBool},
		Value:            "fa",
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.Equal(t, []bool{false}, values.BoolValues)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetAllValuesFiltersByStartAndReadsBoolRows(t *testing.T) {
	store, mock := newMockedMetaStore(t)

	mock.ExpectQuery(`SELECT DISTINCT string_value, number_value, tag_data_type FROM signoz_traces\.distributed_tag_attributes_v2 WHERE tag_key = \? AND unix_milli >= \? LIMIT \?`).
		WithArgs("flag", int64(1700000000000), 51).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "string_value", Type: "String"},
			{Name: "number_value", Type: "Nullable(Float64)"},
			{Name: "tag_data_type", Type: "String"},
		}, [][]any{
			{"on", float64(0), "string"},
			{"", float64(0), "bool"},
		}))

	values, complete, err := store.GetAllValues(context.Background(), valuer.UUID{}, &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "flag", Signal: telemetrytypes.SignalTraces, StartUnixMilli: 1700000000000},
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.Equal(t, []string{"on"}, values.StringValues)
	assert.Equal(t, []bool{true, false}, values.BoolValues)
	assert.Empty(t, values.NumberValues)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetAllValuesLogsFilterByStart(t *testing.T) {
	store, mock := newMockedMetaStore(t)

	mock.ExpectQuery(`SELECT DISTINCT string_value, number_value, tag_data_type FROM signoz_logs\.distributed_tag_attributes_v2 WHERE tag_key = \? AND unix_milli >= \? AND tag_type = \? LIMIT \?`).
		WithArgs("severity_text", int64(1700000000000), "logfield", 51).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "string_value", Type: "String"},
			{Name: "number_value", Type: "Nullable(Float64)"},
			{Name: "tag_data_type", Type: "String"},
		}, [][]any{
			{"ERROR", float64(0), "string"},
			{"INFO", float64(0), "string"},
		}))

	values, complete, err := store.GetAllValues(context.Background(), valuer.UUID{}, &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Name:           "severity_text",
			Signal:         telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			StartUnixMilli: 1700000000000,
		},
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.Equal(t, []string{"ERROR", "INFO"}, values.StringValues)
	assert.Empty(t, values.BoolValues)

	assert.NoError(t, mock.ExpectationsWereMet())
}
