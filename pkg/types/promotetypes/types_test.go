package promotetypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	testLogsBodyTarget = Target{
		Entry: telemetrytypes.EvolutionEntry{
			Signal:       telemetrytypes.SignalLogs,
			ColumnName:   "body_promoted",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextBody,
		},
		DBName:             "signoz_logs",
		LocalTableName:     "logs_v2",
		BaseColumn:         "body_v2",
		RequiredPathPrefix: telemetrytypes.BodyJSONStringSearchPrefix,
		IndexesSupported:   true,
	}

	testTracesAttributesTarget = Target{
		Entry: telemetrytypes.EvolutionEntry{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "attributes_promoted",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextAttribute,
		},
		DBName:             "signoz_traces",
		LocalTableName:     "signoz_index_v3",
		BaseColumn:         "attributes",
		RequiredPathPrefix: "",
		IndexesSupported:   false,
	}
)

func TestValidateAndSetDefaultsLogsBody(t *testing.T) {
	t.Run("valid path gets body prefix stripped", func(t *testing.T) {
		p := &PromotePath{Path: "body.user.name", Promote: true}
		require.NoError(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
		assert.Equal(t, "user.name", p.Path)
	})

	t.Run("path without body prefix is rejected", func(t *testing.T) {
		p := &PromotePath{Path: "user.name", Promote: true}
		require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
	})

	t.Run("column prefixes are rejected", func(t *testing.T) {
		for _, path := range []string{"body_v2.user.name", "body_promoted.user.name"} {
			p := &PromotePath{Path: path, Promote: true}
			require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget), path)
		}
	})

	t.Run("empty, spaced and array paths are rejected", func(t *testing.T) {
		for _, path := range []string{"", "body.my path", "body.users[].id", "body.users[*].id"} {
			p := &PromotePath{Path: path, Promote: true}
			require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget), path)
		}
	})

	t.Run("cardinal paths are rejected", func(t *testing.T) {
		p := &PromotePath{Path: "body.request.550e8400-e29b-41d4-a716-446655440000", Promote: true}
		require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
	})

	t.Run("valid index gets json data type default", func(t *testing.T) {
		p := &PromotePath{
			Path: "body.user.name",
			Indexes: []WrappedIndex{
				{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
			},
		}
		require.NoError(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
		assert.Equal(t, telemetrytypes.String, p.Indexes[0].JSONDataType)
	})

	t.Run("index with unsupported column type is rejected", func(t *testing.T) {
		p := &PromotePath{
			Path:    "body.user.active",
			Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeBool, Type: "minmax", Granularity: 1}},
		}
		require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
	})

	t.Run("index without type or granularity is rejected", func(t *testing.T) {
		p := &PromotePath{
			Path:    "body.user.name",
			Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Granularity: 1}},
		}
		require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget))

		p = &PromotePath{
			Path:    "body.user.name",
			Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "minmax"}},
		}
		require.Error(t, p.ValidateAndSetDefaults(testLogsBodyTarget))
	})
}

func TestValidateAndSetDefaultsTracesAttributes(t *testing.T) {
	t.Run("bare attribute name is kept as is", func(t *testing.T) {
		p := &PromotePath{Path: "http.method", Promote: true}
		require.NoError(t, p.ValidateAndSetDefaults(testTracesAttributesTarget))
		assert.Equal(t, "http.method", p.Path)
	})

	t.Run("column prefixes are rejected", func(t *testing.T) {
		for _, path := range []string{"attributes.http.method", "attributes_promoted.http.method"} {
			p := &PromotePath{Path: path, Promote: true}
			require.Error(t, p.ValidateAndSetDefaults(testTracesAttributesTarget), path)
		}
	})

	t.Run("empty, spaced and array paths are rejected", func(t *testing.T) {
		for _, path := range []string{"", "my attr", "tags[].id"} {
			p := &PromotePath{Path: path, Promote: true}
			require.Error(t, p.ValidateAndSetDefaults(testTracesAttributesTarget), path)
		}
	})

	t.Run("indexes are rejected for a target without index support", func(t *testing.T) {
		p := &PromotePath{
			Path:    "http.method",
			Indexes: []WrappedIndex{{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1}},
		}
		require.Error(t, p.ValidateAndSetDefaults(testTracesAttributesTarget))
	})
}
