package promotetypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestNewMaterializedPromotePath(t *testing.T) {
	testCases := []struct {
		name      string
		key       *telemetrytypes.TelemetryFieldKey
		wantIndex WrappedIndex
		wantErr   bool
	}{
		{
			name:      "StringPath_StringIndex",
			key:       &telemetrytypes.TelemetryFieldKey{Name: "user.id", FieldDataType: telemetrytypes.FieldDataTypeString},
			wantIndex: WrappedIndex{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "bloom_filter(0.01)", Granularity: 64, JSONDataType: telemetrytypes.String},
		},
		{
			name:      "NumberPath_Float64Index",
			key:       &telemetrytypes.TelemetryFieldKey{Name: "retry.count", FieldDataType: telemetrytypes.FieldDataTypeNumber},
			wantIndex: WrappedIndex{FieldDataType: telemetrytypes.FieldDataTypeNumber, Type: "bloom_filter(0.01)", Granularity: 64, JSONDataType: telemetrytypes.Float64},
		},
		{
			name:    "BoolPath_Rejected",
			key:     &telemetrytypes.TelemetryFieldKey{Name: "user.active", FieldDataType: telemetrytypes.FieldDataTypeBool},
			wantErr: true,
		},
		{
			name:    "CardinalPath_Rejected",
			key:     &telemetrytypes.TelemetryFieldKey{Name: "session.550e8400-e29b-41d4-a716-446655440000", FieldDataType: telemetrytypes.FieldDataTypeString},
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			path, err := NewMaterializedPromotePath(NewTracesAttributesTarget(), testCase.key)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, &PromotePath{
				Signal:  "traces",
				Context: "attribute",
				Path:    testCase.key.Name,
				Promote: false,
				Indexes: []WrappedIndex{testCase.wantIndex},
			}, path)
		})
	}
}

func TestIndexMaterializedPathsParamsValidate(t *testing.T) {
	testCases := []struct {
		name    string
		params  IndexMaterializedPathsParams
		wantErr bool
	}{
		{name: "TracesSignal_Valid", params: IndexMaterializedPathsParams{Signal: "traces", DryRun: true}},
		{name: "MissingSignal_Rejected", params: IndexMaterializedPathsParams{}, wantErr: true},
		{name: "UnknownSignal_Rejected", params: IndexMaterializedPathsParams{Signal: "events"}, wantErr: true},
		{name: "LogsSignal_NoAttributeTarget_Rejected", params: IndexMaterializedPathsParams{Signal: "logs"}, wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.params.Validate()
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
