package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSynthesizeKeys(t *testing.T) {
	tests := []struct {
		name          string
		field         telemetrytypes.TelemetryFieldKey
		value         any
		wantContexts  []telemetrytypes.FieldContext
		wantDataTypes []telemetrytypes.FieldDataType
	}{
		{
			name:          "bare key with string operand infers string",
			field:         telemetrytypes.TelemetryFieldKey{Name: "error.type"},
			value:         "timeout",
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString},
		},
		{
			name:          "bare key with number operand infers number",
			field:         telemetrytypes.TelemetryFieldKey{Name: "http.status"},
			value:         float64(500),
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeNumber},
		},
		{
			name:          "bare key with bool operand infers bool",
			field:         telemetrytypes.TelemetryFieldKey{Name: "sampled"},
			value:         true,
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeBool},
		},
		{
			name:          "bare key with no operand fans out across variants",
			field:         telemetrytypes.TelemetryFieldKey{Name: "exception.type"},
			value:         nil,
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString, telemetrytypes.FieldDataTypeNumber, telemetrytypes.FieldDataTypeBool},
		},
		{
			name:          "qualified data type honored as-is",
			field:         telemetrytypes.TelemetryFieldKey{Name: "custom.key", FieldDataType: telemetrytypes.FieldDataTypeString},
			value:         nil,
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString},
		},
		{
			name:          "qualified resource context honored as single string key",
			field:         telemetrytypes.TelemetryFieldKey{Name: "k8s.cluster.name", FieldContext: telemetrytypes.FieldContextResource},
			value:         nil,
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextResource},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString},
		},
		{
			name:          "in list with homogeneous strings infers single string variant",
			field:         telemetrytypes.TelemetryFieldKey{Name: "error.type"},
			value:         []any{"a", "b"},
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString},
		},
		{
			name:          "in list with mixed types fans out to present variants",
			field:         telemetrytypes.TelemetryFieldKey{Name: "error.type"},
			value:         []any{"a", float64(1)},
			wantContexts:  []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextAttribute},
			wantDataTypes: []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString, telemetrytypes.FieldDataTypeNumber},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := tt.field
			keys := SynthesizeKeys(&field, tt.value)
			require.Len(t, keys, len(tt.wantDataTypes))
			for i, k := range keys {
				assert.Equal(t, tt.field.Name, k.Name, "name preserved")
				assert.Equal(t, tt.wantContexts[i], k.FieldContext)
				assert.Equal(t, tt.wantDataTypes[i], k.FieldDataType)
			}
		})
	}
}
