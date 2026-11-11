package promotetypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestNewMaterializedPromotePath(t *testing.T) {
	testCases := []struct {
		name        string
		key         *telemetrytypes.TelemetryFieldKey
		wantIndexes []WrappedIndex
		wantErr     bool
	}{
		{
			name: "StringPath_MirrorsColumnIndex",
			key: &telemetrytypes.TelemetryFieldKey{Name: "user.id", FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{IndexType: "bloom_filter", Granularity: 4},
			}},
			wantIndexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "bloom_filter", Granularity: 4, JSONDataType: telemetrytypes.String}},
		},
		{
			name: "StringPath_MirrorsEveryColumnIndex",
			key: &telemetrytypes.TelemetryFieldKey{Name: "tenant.id", FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{IndexType: "tokenbf_v1(10240, 3, 0)", Granularity: 1},
				{IndexType: "bloom_filter(0.01)", Granularity: 2},
			}},
			wantIndexes: []WrappedIndex{
				{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "tokenbf_v1(10240, 3, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "bloom_filter(0.01)", Granularity: 2, JSONDataType: telemetrytypes.String},
			},
		},
		{
			name: "NumberPath_Float64Index",
			key: &telemetrytypes.TelemetryFieldKey{Name: "retry.count", FieldDataType: telemetrytypes.FieldDataTypeNumber, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{IndexType: "minmax", Granularity: 1},
			}},
			wantIndexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeNumber, Type: "minmax", Granularity: 1, JSONDataType: telemetrytypes.Float64}},
		},
		{
			name: "UnsupportedIndexType_Rejected",
			key: &telemetrytypes.TelemetryFieldKey{Name: "user.email", FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{IndexType: "text(tokenizer = 'splitByNonAlpha')", Granularity: 1},
			}},
			wantErr: true,
		},
		{
			name: "BoolPath_Rejected",
			key: &telemetrytypes.TelemetryFieldKey{Name: "user.active", FieldDataType: telemetrytypes.FieldDataTypeBool, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{IndexType: "bloom_filter", Granularity: 1},
			}},
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
				Indexes: testCase.wantIndexes,
			}, path)
		})
	}
}

func TestPostableIndexMaterializedPathsValidate(t *testing.T) {
	testCases := []struct {
		name    string
		req     PostableIndexMaterializedPaths
		wantErr bool
	}{
		{name: "TracesSignal_Valid", req: PostableIndexMaterializedPaths{Signal: "traces", DryRun: true}},
		{name: "MissingSignal_Rejected", req: PostableIndexMaterializedPaths{}, wantErr: true},
		{name: "UnknownSignal_Rejected", req: PostableIndexMaterializedPaths{Signal: "events"}, wantErr: true},
		{name: "LogsSignal_NoAttributeTarget_Rejected", req: PostableIndexMaterializedPaths{Signal: "logs"}, wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.req.Validate()
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
