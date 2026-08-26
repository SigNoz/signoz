package implquickfilter

import (
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTelemetryFieldKeysFromLegacy(t *testing.T) {
	fieldKeys, err := newTelemetryFieldKeysFromLegacy([]v3.AttributeKey{
		{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString},
		{Key: "http.method", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
		{Key: "duration_nano", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeFloat64},
		{Key: "code_line", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeInt64},
	})
	require.NoError(t, err)
	require.Len(t, fieldKeys, 4)

	assert.Equal(t, telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}, fieldKeys[0])
	assert.Equal(t, telemetrytypes.FieldContextAttribute, fieldKeys[1].FieldContext)
	assert.Equal(t, telemetrytypes.FieldDataTypeNumber, fieldKeys[2].FieldDataType)
	assert.Equal(t, telemetrytypes.FieldDataTypeNumber, fieldKeys[3].FieldDataType)

	t.Run("rejects a filter without a key", func(t *testing.T) {
		_, err := newTelemetryFieldKeysFromLegacy([]v3.AttributeKey{{DataType: v3.AttributeKeyDataTypeString}})
		require.Error(t, err)
	})
}

func TestNewLegacySignalFiltersFromSignalFilters(t *testing.T) {
	legacy := newLegacySignalFiltersFromSignalFilters(&quickfiltertypes.SignalFilters{
		Signal: quickfiltertypes.SignalTraces,
		Filters: []telemetrytypes.TelemetryFieldKey{
			{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
			{Name: "http.method", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
			{Name: "duration_nano", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
			{Name: "host.name", Signal: telemetrytypes.SignalMetrics},
		},
	})

	assert.Equal(t, quickfiltertypes.SignalTraces, legacy.Signal)
	require.Len(t, legacy.Filters, 4)
	assert.Equal(t, v3.AttributeKey{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString}, legacy.Filters[0])
	assert.Equal(t, v3.AttributeKeyTypeTag, legacy.Filters[1].Type)
	assert.Equal(t, v3.AttributeKeyDataTypeFloat64, legacy.Filters[2].DataType)
	assert.Equal(t, v3.AttributeKey{Key: "host.name"}, legacy.Filters[3])
}
