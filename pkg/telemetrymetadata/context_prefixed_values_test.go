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
