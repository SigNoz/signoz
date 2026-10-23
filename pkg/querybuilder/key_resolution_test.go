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

func TestSynthesizeKeysEvolutions(t *testing.T) {
	attributeAll := &telemetrytypes.EvolutionEntry{ColumnName: "attributes", FieldContext: telemetrytypes.FieldContextAttribute, FieldName: telemetrytypes.EvolutionFieldNameAll}
	attributeOwn := &telemetrytypes.EvolutionEntry{ColumnName: "attributes_promoted", FieldContext: telemetrytypes.FieldContextAttribute, FieldName: "http.route"}
	attributeOther := &telemetrytypes.EvolutionEntry{ColumnName: "attributes_promoted", FieldContext: telemetrytypes.FieldContextAttribute, FieldName: "http.method"}
	resourceAll := &telemetrytypes.EvolutionEntry{ColumnName: "resource", FieldContext: telemetrytypes.FieldContextResource, FieldName: telemetrytypes.EvolutionFieldNameAll}
	evolutions := []*telemetrytypes.EvolutionEntry{attributeAll, attributeOwn, attributeOther, resourceAll}

	testCases := []struct {
		name  string
		field telemetrytypes.TelemetryFieldKey
		value any
		want  []*telemetrytypes.EvolutionEntry
	}{
		{
			name:  "BareKey_FanOut_KeepsAttributeRowsOfItsName",
			field: telemetrytypes.TelemetryFieldKey{Name: "http.route", Evolutions: evolutions},
			want:  []*telemetrytypes.EvolutionEntry{attributeAll, attributeOwn},
		},
		{
			name:  "TypedAttributeKey_KeepsAttributeRowsOfItsName",
			field: telemetrytypes.TelemetryFieldKey{Name: "http.route", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString, Evolutions: evolutions},
			value: "/users",
			want:  []*telemetrytypes.EvolutionEntry{attributeAll, attributeOwn},
		},
		{
			name:  "ResourceKey_KeepsResourceRows",
			field: telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, Evolutions: evolutions},
			want:  []*telemetrytypes.EvolutionEntry{resourceAll},
		},
		{
			name:  "NoEvolutions_SynthesizesNone",
			field: telemetrytypes.TelemetryFieldKey{Name: "db.system"},
			value: "mysql",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			keys := SynthesizeKeys(&testCase.field, testCase.value)
			require.NotEmpty(t, keys)
			for _, key := range keys {
				assert.Equal(t, testCase.want, key.Evolutions)
			}
		})
	}
}

func TestWithColumnEvolutions(t *testing.T) {
	columnWide := []*telemetrytypes.EvolutionEntry{{ColumnName: "attributes", FieldContext: telemetrytypes.FieldContextAttribute, FieldName: telemetrytypes.EvolutionFieldNameAll}}
	own := []*telemetrytypes.EvolutionEntry{{ColumnName: "attributes_promoted", FieldContext: telemetrytypes.FieldContextAttribute, FieldName: "http.route"}}

	t.Run("KeyWithoutEvolutions_CopyCarriesColumnWide", func(t *testing.T) {
		key := &telemetrytypes.TelemetryFieldKey{Name: "http.route"}
		got := WithColumnEvolutions(key, columnWide)
		assert.Equal(t, columnWide, got.Evolutions)
		assert.Empty(t, key.Evolutions, "the caller's key is not mutated")
	})
	t.Run("KeyWithEvolutions_ReturnedAsIs", func(t *testing.T) {
		key := &telemetrytypes.TelemetryFieldKey{Name: "http.route", Evolutions: own}
		assert.Same(t, key, WithColumnEvolutions(key, columnWide))
	})
}
