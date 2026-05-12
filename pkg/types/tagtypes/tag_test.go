package tagtypes

import (
	"context"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidatePostableTag(t *testing.T) {
	tests := []struct {
		name      string
		input     PostableTag
		wantKey   string
		wantValue string
		wantError bool
	}{
		{name: "simple pair", input: PostableTag{Key: "team", Value: "pulse"}, wantKey: "team", wantValue: "pulse"},
		{name: "preserves casing", input: PostableTag{Key: "Team", Value: "Pulse"}, wantKey: "Team", wantValue: "Pulse"},
		{name: "trims key", input: PostableTag{Key: "  team  ", Value: "pulse"}, wantKey: "team", wantValue: "pulse"},
		{name: "trims value", input: PostableTag{Key: "team", Value: "  pulse  "}, wantKey: "team", wantValue: "pulse"},

		{name: "empty key rejected", input: PostableTag{Key: "", Value: "pulse"}, wantError: true},
		{name: "empty value rejected", input: PostableTag{Key: "team", Value: ""}, wantError: true},
		{name: "whitespace-only key rejected", input: PostableTag{Key: "   ", Value: "pulse"}, wantError: true},
		{name: "whitespace-only value rejected", input: PostableTag{Key: "team", Value: "   "}, wantError: true},

		{name: "slash in key rejected", input: PostableTag{Key: "team/eng", Value: "pulse"}, wantError: true},
		{name: "slash in value rejected", input: PostableTag{Key: "team", Value: "pulse/events"}, wantError: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotKey, gotValue, err := validatePostableTag(tc.input)
			if tc.wantError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantKey, gotKey)
			assert.Equal(t, tc.wantValue, gotValue)
		})
	}
}

var testKind = coretypes.KindDashboard

type fakeStore struct {
	tags          []*Tag
	listCallCount int
}

func (f *fakeStore) List(_ context.Context, _ valuer.UUID, _ coretypes.Kind) ([]*Tag, error) {
	f.listCallCount++
	out := make([]*Tag, len(f.tags))
	copy(out, f.tags)
	return out, nil
}

func (f *fakeStore) Create(_ context.Context, tags []*Tag) ([]*Tag, error) {
	return tags, nil
}

func (f *fakeStore) CreateRelations(_ context.Context, _ []*TagRelation) error {
	return nil
}

func (f *fakeStore) ListByEntity(_ context.Context, _ coretypes.Kind, _ valuer.UUID) ([]*Tag, error) {
	return []*Tag{}, nil
}

func (f *fakeStore) ListByEntities(_ context.Context, _ coretypes.Kind, _ []valuer.UUID) (map[valuer.UUID][]*Tag, error) {
	return map[valuer.UUID][]*Tag{}, nil
}

func (f *fakeStore) DeleteRelationsExcept(_ context.Context, _ coretypes.Kind, _ valuer.UUID, _ []valuer.UUID) error {
	return nil
}

func (f *fakeStore) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return cb(ctx)
}

func TestResolve(t *testing.T) {
	t.Run("empty input does not hit store", func(t *testing.T) {
		store := &fakeStore{}
		toCreate, matched, err := Resolve(context.Background(), store, valuer.GenerateUUID(), testKind, nil, "u@signoz.io")
		require.NoError(t, err)
		assert.Empty(t, toCreate)
		assert.Empty(t, matched)
		assert.Zero(t, store.listCallCount, "should not hit store when input is empty")
	})

	t.Run("creates missing pairs and reuses existing", func(t *testing.T) {
		orgID := valuer.GenerateUUID()
		dbTag := NewTag(orgID, testKind, "team", "Pulse", "seed")
		dbTag2 := NewTag(orgID, testKind, "Database", "redis", "seed")
		store := &fakeStore{tags: []*Tag{dbTag, dbTag2}}

		toCreate, matched, err := Resolve(context.Background(), store, orgID, testKind, []PostableTag{
			{Key: "team", Value: "events"},    // new
			{Key: "DATABASE", Value: "REDIS"}, // case-only conflict
			{Key: "Brand", Value: "New"},      // new
		}, "u@signoz.io")
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
		store := &fakeStore{}

		toCreate, matched, err := Resolve(context.Background(), store, orgID, testKind, []PostableTag{
			{Key: "Foo", Value: "Bar"},
			{Key: "foo", Value: "bar"},
			{Key: "FOO", Value: "BAR"},
		}, "u@signoz.io")
		require.NoError(t, err)

		require.Empty(t, matched)
		require.Len(t, toCreate, 1, "duplicate inputs must collapse into a single insert")
		assert.Equal(t, "Foo", toCreate[0].Key, "first input's casing wins")
		assert.Equal(t, "Bar", toCreate[0].Value, "first input's casing wins")
	})

	t.Run("preserves existing casing on case-only match", func(t *testing.T) {
		orgID := valuer.GenerateUUID()
		dbTag := NewTag(orgID, testKind, "Team", "Pulse", "seed")
		store := &fakeStore{tags: []*Tag{dbTag}}

		toCreate, matched, err := Resolve(context.Background(), store, orgID, testKind, []PostableTag{
			{Key: "team", Value: "PULSE"},
		}, "u@signoz.io")
		require.NoError(t, err)

		assert.Empty(t, toCreate)
		require.Len(t, matched, 1)
		assert.Equal(t, "Team", matched[0].Key)
		assert.Equal(t, "Pulse", matched[0].Value)
	})

	t.Run("propagates validation error from any input", func(t *testing.T) {
		store := &fakeStore{}
		_, _, err := Resolve(context.Background(), store, valuer.GenerateUUID(), testKind, []PostableTag{
			{Key: "team", Value: "pulse"},
			{Key: "", Value: "x"},
		}, "u@signoz.io")
		require.Error(t, err)
	})

	t.Run("propagates slash validation error", func(t *testing.T) {
		store := &fakeStore{}
		_, _, err := Resolve(context.Background(), store, valuer.GenerateUUID(), testKind, []PostableTag{
			{Key: "team/eng", Value: "pulse"},
		}, "u@signoz.io")
		require.Error(t, err)
		assert.True(t, strings.Contains(err.Error(), "/"), "error should reference the disallowed character")
	})
}
