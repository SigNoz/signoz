package promotetypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateAndSetDefaultsLogsBody(t *testing.T) {
	target := NewLogsBodyTarget()

	testCases := []struct {
		name             string
		path             *PromotePath
		wantErr          bool
		wantPath         string
		wantJSONDataType telemetrytypes.JSONDataType
	}{
		{
			name:     "ValidPath_BodyPrefixStripped",
			path:     &PromotePath{Path: "body.user.name", Promote: true},
			wantPath: "user.name",
		},
		{
			name:    "PathWithoutBodyPrefix_Rejected",
			path:    &PromotePath{Path: "user.name", Promote: true},
			wantErr: true,
		},
		{
			name:    "BodyV2PrefixedPath_Rejected",
			path:    &PromotePath{Path: "body_v2.user.name", Promote: true},
			wantErr: true,
		},
		{
			name:    "BodyPromotedPrefixedPath_Rejected",
			path:    &PromotePath{Path: "body_promoted.user.name", Promote: true},
			wantErr: true,
		},
		{
			name:    "EmptyPath_Rejected",
			path:    &PromotePath{Path: "", Promote: true},
			wantErr: true,
		},
		{
			name:    "SpacedPath_Rejected",
			path:    &PromotePath{Path: "body.my path", Promote: true},
			wantErr: true,
		},
		{
			name:    "ArrayIndexPath_Rejected",
			path:    &PromotePath{Path: "body.users[].id", Promote: true},
			wantErr: true,
		},
		{
			name:    "ArrayWildcardPath_Rejected",
			path:    &PromotePath{Path: "body.users[*].id", Promote: true},
			wantErr: true,
		},
		{
			name:    "CardinalPath_Rejected",
			path:    &PromotePath{Path: "body.request.550e8400-e29b-41d4-a716-446655440000", Promote: true},
			wantErr: true,
		},
		{
			name: "ValidIndex_JSONDataTypeDefaulted",
			path: &PromotePath{
				Path: "body.user.name",
				Indexes: []WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
				},
			},
			wantPath:         "user.name",
			wantJSONDataType: telemetrytypes.String,
		},
		{
			name: "UnsupportedColumnTypeIndex_Rejected",
			path: &PromotePath{
				Path:    "body.user.active",
				Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeBool, Type: "minmax", Granularity: 1}},
			},
			wantErr: true,
		},
		{
			name: "IndexWithoutType_Rejected",
			path: &PromotePath{
				Path:    "body.user.name",
				Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Granularity: 1}},
			},
			wantErr: true,
		},
		{
			name: "IndexWithoutGranularity_Rejected",
			path: &PromotePath{
				Path:    "body.user.name",
				Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "minmax"}},
			},
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.path.ValidateAndSetDefaults(target)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.wantPath, testCase.path.Path)
			if testCase.wantJSONDataType != (telemetrytypes.JSONDataType{}) {
				require.Len(t, testCase.path.Indexes, 1)
				assert.Equal(t, testCase.wantJSONDataType, testCase.path.Indexes[0].JSONDataType)
			}
		})
	}
}

func TestValidateAndSetDefaultsTracesAttributes(t *testing.T) {
	target := NewTracesAttributesTarget()

	testCases := []struct {
		name     string
		path     *PromotePath
		wantErr  bool
		wantPath string
	}{
		{
			name:     "BareAttributeName_KeptAsIs",
			path:     &PromotePath{Path: "http.method", Promote: true},
			wantPath: "http.method",
		},
		{
			name:    "AttributesPrefixedPath_Rejected",
			path:    &PromotePath{Path: "attributes.http.method", Promote: true},
			wantErr: true,
		},
		{
			name:    "AttributesPromotedPrefixedPath_Rejected",
			path:    &PromotePath{Path: "attributes_promoted.http.method", Promote: true},
			wantErr: true,
		},
		{
			name:    "EmptyPath_Rejected",
			path:    &PromotePath{Path: "", Promote: true},
			wantErr: true,
		},
		{
			name:    "SpacedPath_Rejected",
			path:    &PromotePath{Path: "my attr", Promote: true},
			wantErr: true,
		},
		{
			name:    "ArrayIndexPath_Rejected",
			path:    &PromotePath{Path: "tags[].id", Promote: true},
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.path.ValidateAndSetDefaults(target)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.wantPath, testCase.path.Path)
		})
	}
}
