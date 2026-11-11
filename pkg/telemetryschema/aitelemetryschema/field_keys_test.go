package aitelemetryschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestFieldKeysDataTypeFilter(t *testing.T) {
	testCases := []struct {
		name          string
		fieldDataType telemetrytypes.FieldDataType
		expectTrace   bool
	}{
		{name: "Number_IncludesTraceAggregates", fieldDataType: telemetrytypes.FieldDataTypeNumber, expectTrace: true},
		{name: "Float64_IncludesTraceAggregates", fieldDataType: telemetrytypes.FieldDataTypeFloat64, expectTrace: true},
		{name: "Int64_IncludesTraceAggregates", fieldDataType: telemetrytypes.FieldDataTypeInt64, expectTrace: true},
		{name: "String_ExcludesTraceAggregates", fieldDataType: telemetrytypes.FieldDataTypeString, expectTrace: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			selector := &telemetrytypes.FieldKeySelector{Signal: telemetrytypes.SignalTraces, FieldDataType: testCase.fieldDataType}
			keys := FieldKeys(map[string][]*telemetrytypes.TelemetryFieldKey{}, selector)

			for name := range TraceAggregateFields {
				if !testCase.expectTrace {
					assert.NotContains(t, keys, name)
					continue
				}
				require.Len(t, keys[name], 1)
				assert.Equal(t, telemetrytypes.FieldContextTrace, keys[name][0].FieldContext)
				assert.Equal(t, telemetrytypes.FieldDataTypeNumber, keys[name][0].FieldDataType)
			}
		})
	}
}
