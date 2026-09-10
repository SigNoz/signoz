package implpromote

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPromoteAttributes(t *testing.T) {
	ctx := context.Background()

	t.Run("promotes new attributes and is idempotent", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		paths := []*promotetypes.PromotePath{
			{Path: "http.method", Promote: true},
			{Path: "span.operation", Promote: true},
		}
		require.NoError(t, m.PromoteAttributes(ctx, paths...))
		assert.True(t, store.PromotedPathsMap["http.method"])
		assert.True(t, store.PromotedPathsMap["span.operation"])

		// promoting again must not fail
		require.NoError(t, m.PromoteAttributes(ctx, paths...))
		assert.Len(t, store.PromotedPathsMap, 2)
	})

	t.Run("non-promote entries are not recorded", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		require.NoError(t, m.PromoteAttributes(ctx, &promotetypes.PromotePath{Path: "http.method"}))
		assert.Empty(t, store.PromotedPathsMap)
	})

	t.Run("indexes are rejected for trace attributes", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		err := m.PromoteAttributes(ctx, &promotetypes.PromotePath{
			Path:    "http.method",
			Promote: true,
			Indexes: []promotetypes.WrappedIndex{
				{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
			},
		})
		require.Error(t, err)
		assert.Empty(t, store.PromotedPathsMap)
	})

	t.Run("column prefixed and empty paths are rejected", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		require.Error(t, m.PromoteAttributes(ctx, &promotetypes.PromotePath{Path: "attributes.http.method", Promote: true}))
		require.Error(t, m.PromoteAttributes(ctx, &promotetypes.PromotePath{Path: "", Promote: true}))
		assert.Empty(t, store.PromotedPathsMap)
	})

	t.Run("empty request is rejected", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		require.Error(t, m.PromoteAttributes(ctx))
	})
}

func TestListPromotedAttributes(t *testing.T) {
	ctx := context.Background()
	store := telemetrytypestest.NewMockMetadataStore()
	store.PromotedPathsMap["http.method"] = true
	m := NewModule(store, nil)

	paths, err := m.ListPromotedAttributes(ctx)
	require.NoError(t, err)
	require.Len(t, paths, 1)
	assert.Equal(t, "http.method", paths[0].Path)
	assert.True(t, paths[0].Promote)
	assert.Empty(t, paths[0].Indexes)
}

func TestPromoteAndIndexPaths(t *testing.T) {
	ctx := context.Background()

	t.Run("promotes body path with prefix stripped", func(t *testing.T) {
		store := telemetrytypestest.NewMockMetadataStore()
		m := NewModule(store, nil)

		require.NoError(t, m.PromoteAndIndexPaths(ctx, &promotetypes.PromotePath{Path: "body.user.name", Promote: true}))
		assert.True(t, store.PromotedPathsMap["user.name"])
	})
}

func TestListPromotedAndIndexedPaths(t *testing.T) {
	ctx := context.Background()
	store := telemetrytypestest.NewMockMetadataStore()
	store.PromotedPathsMap["user.name"] = true
	store.LogsJSONIndexes = []telemetrytypes.TelemetryFieldKeySkipIndex{
		{
			Name:          "user.name",
			FieldContext:  telemetrytypes.FieldContextBody,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			BaseColumn:    "body_promoted.",
			IndexType:     "ngrambf_v1(4, 1024, 2, 0)",
			Granularity:   1,
		},
		{
			Name:          "request.duration",
			FieldContext:  telemetrytypes.FieldContextBody,
			FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			BaseColumn:    "body_v2.",
			IndexType:     "minmax",
			Granularity:   1,
		},
	}
	m := NewModule(store, nil)

	paths, err := m.ListPromotedAndIndexedPaths(ctx)
	require.NoError(t, err)
	require.Len(t, paths, 2)

	byPath := map[string]promotetypes.PromotePath{}
	for _, p := range paths {
		byPath[p.Path] = p
	}

	// the promoted path carries its index from the promoted column
	promoted := byPath["body.user.name"]
	assert.True(t, promoted.Promote)
	require.Len(t, promoted.Indexes, 1)
	assert.Equal(t, telemetrytypes.FieldDataTypeString, promoted.Indexes[0].FieldDataType)
	assert.Equal(t, "ngrambf_v1(4, 1024, 2, 0)", promoted.Indexes[0].Type)

	// an indexed but not promoted path shows up without the promote flag
	indexed := byPath["body.request.duration"]
	assert.False(t, indexed.Promote)
	require.Len(t, indexed.Indexes, 1)
	assert.Equal(t, telemetrytypes.FieldDataTypeFloat64, indexed.Indexes[0].FieldDataType)
}
