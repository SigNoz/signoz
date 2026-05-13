package impltag

import (
	"context"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes/tagtypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testKind = coretypes.KindDashboard

func TestModule_Resolve(t *testing.T) {
	t.Run("empty input does not hit store", func(t *testing.T) {
		store := tagtypestest.NewStore()
		m := &module{store: store}

		toCreate, matched, err := m.resolve(context.Background(), valuer.GenerateUUID(), testKind, nil)
		require.NoError(t, err)
		assert.Empty(t, toCreate)
		assert.Empty(t, matched)
		assert.Zero(t, store.ListCallCount, "should not hit store when input is empty")
	})

	t.Run("creates missing pairs and reuses existing", func(t *testing.T) {
		orgID := valuer.GenerateUUID()
		dbTag := tagtypes.NewTag(orgID, testKind, "team", "Pulse")
		dbTag2 := tagtypes.NewTag(orgID, testKind, "Database", "redis")
		store := tagtypestest.NewStore()
		store.Tags = []*tagtypes.Tag{dbTag, dbTag2}
		m := &module{store: store}

		toCreate, matched, err := m.resolve(context.Background(), orgID, testKind, []tagtypes.PostableTag{
			{Key: "team", Value: "events"},    // new
			{Key: "DATABASE", Value: "REDIS"}, // case-only conflict
			{Key: "Brand", Value: "New"},      // new
		})
		require.NoError(t, err)

		createdLowerKVs := []string{}
		for _, tg := range toCreate {
			createdLowerKVs = append(createdLowerKVs, strings.ToLower(tg.Key)+"\x00"+strings.ToLower(tg.Value))
		}
		assert.ElementsMatch(t, []string{"team\x00events", "brand\x00new"}, createdLowerKVs,
			"only the two missing pairs should be returned for insertion")

		require.Len(t, matched, 1, "DATABASE:REDIS should hit the existing 'Database:redis' tag")
		assert.Same(t, dbTag2, matched[0], "matched should return the existing pointer with its authoritative ID")
	})

	t.Run("dedupes inputs that map to the same lower(key)+lower(value)", func(t *testing.T) {
		orgID := valuer.GenerateUUID()
		store := tagtypestest.NewStore()
		m := &module{store: store}

		toCreate, matched, err := m.resolve(context.Background(), orgID, testKind, []tagtypes.PostableTag{
			{Key: "Foo", Value: "Bar"},
			{Key: "foo", Value: "bar"},
			{Key: "FOO", Value: "BAR"},
		})
		require.NoError(t, err)

		require.Empty(t, matched)
		require.Len(t, toCreate, 1, "duplicate inputs must collapse into a single insert")
		assert.Equal(t, "Foo", toCreate[0].Key, "first input's casing wins")
		assert.Equal(t, "Bar", toCreate[0].Value, "first input's casing wins")
	})

	t.Run("preserves existing casing on case-only match", func(t *testing.T) {
		orgID := valuer.GenerateUUID()
		dbTag := tagtypes.NewTag(orgID, testKind, "Team", "Pulse")
		store := tagtypestest.NewStore()
		store.Tags = []*tagtypes.Tag{dbTag}
		m := &module{store: store}

		toCreate, matched, err := m.resolve(context.Background(), orgID, testKind, []tagtypes.PostableTag{
			{Key: "team", Value: "PULSE"},
		})
		require.NoError(t, err)

		assert.Empty(t, toCreate)
		require.Len(t, matched, 1)
		assert.Equal(t, "Team", matched[0].Key)
		assert.Equal(t, "Pulse", matched[0].Value)
	})

	t.Run("propagates validation error from any input", func(t *testing.T) {
		store := tagtypestest.NewStore()
		m := &module{store: store}

		_, _, err := m.resolve(context.Background(), valuer.GenerateUUID(), testKind, []tagtypes.PostableTag{
			{Key: "team", Value: "pulse"},
			{Key: "", Value: "x"},
		})
		require.Error(t, err)
	})

	t.Run("propagates regex validation error", func(t *testing.T) {
		store := tagtypestest.NewStore()
		m := &module{store: store}

		_, _, err := m.resolve(context.Background(), valuer.GenerateUUID(), testKind, []tagtypes.PostableTag{
			{Key: "team!eng", Value: "pulse"},
		})
		require.Error(t, err)
	})
}
