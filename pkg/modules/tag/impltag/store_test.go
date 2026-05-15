package impltag

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
)

func newTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            dbPath,
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*tagtypes.Tag)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_org_kind_lower_key_lower_value ON tag (org_id, kind, LOWER(key), LOWER(value))`)
	require.NoError(t, err)
	return store
}

var dashboardKind = coretypes.KindDashboard

func tagsByLowerKeyValue(t *testing.T, db *bun.DB) map[string]*tagtypes.Tag {
	t.Helper()
	all := make([]*tagtypes.Tag, 0)
	require.NoError(t, db.NewSelect().Model(&all).Scan(context.Background()))
	out := map[string]*tagtypes.Tag{}
	for _, tag := range all {
		out[strings.ToLower(tag.Key)+"\x00"+strings.ToLower(tag.Value)] = tag
	}
	return out
}

func TestStore_Create_PopulatesIDsOnFreshInsert(t *testing.T) {
	ctx := context.Background()
	sqlstore := newTestStore(t)
	s := NewStore(sqlstore)

	orgID := valuer.GenerateUUID()
	tagA := tagtypes.NewTag(orgID, dashboardKind, "tag", "Database")
	tagB := tagtypes.NewTag(orgID, dashboardKind, "team", "BLR")
	preIDA := tagA.ID
	preIDB := tagB.ID

	got, err := s.CreateOrGet(ctx, []*tagtypes.Tag{tagA, tagB})
	require.NoError(t, err)
	require.Len(t, got, 2)

	// No race → pre-generated IDs stand. The slice is what we passed in,
	// confirming Scan didn't reallocate.
	assert.Equal(t, preIDA, got[0].ID)
	assert.Equal(t, preIDB, got[1].ID)

	// And the rows are in the DB.
	stored := tagsByLowerKeyValue(t, sqlstore.BunDB())
	require.Contains(t, stored, "tag\x00database")
	require.Contains(t, stored, "team\x00blr")
	assert.Equal(t, preIDA, stored["tag\x00database"].ID)
	assert.Equal(t, preIDB, stored["team\x00blr"].ID)
}

// todo (@namanverma): uncomment once unique index is there.
//
// func TestStore_Create_ConflictReturnsExistingRowID(t *testing.T) {
// 	ctx := context.Background()
// 	sqlstore := newTestStore(t)
// 	s := NewStore(sqlstore)

// 	orgID := valuer.GenerateUUID()

// 	// Simulate a concurrent insert: someone else has already inserted "tag:Database".
// 	winner := tagtypes.NewTag(orgID, dashboardKind, "tag", "Database")
// 	_, err := s.CreateOrGet(ctx, []*tagtypes.Tag{winner})
// 	require.NoError(t, err)
// 	winnerID := winner.ID

// 	// Now our request runs with a different pre-generated ID for the same
// 	// (key, value) — case differs but the functional unique index collapses
// 	// them. RETURNING should overwrite our stale ID with winner's ID.
// 	loser := tagtypes.NewTag(orgID, dashboardKind, "TAG", "DATABASE")
// 	loserPreID := loser.ID
// 	require.NotEqual(t, winnerID, loserPreID, "pre-generated IDs must differ for this test to be meaningful")

// 	got, err := s.CreateOrGet(ctx, []*tagtypes.Tag{loser})
// 	require.NoError(t, err)
// 	require.Len(t, got, 1)

// 	assert.Equal(t, winnerID, got[0].ID, "returned slice should carry the existing row's ID, not our stale one")
// 	assert.Equal(t, winnerID, loser.ID, "input slice element is mutated in place")

// 	// And the DB still has exactly one row for that (lower(key), lower(value)) — winner's, with winner's casing.
// 	stored := tagsByLowerKeyValue(t, sqlstore.BunDB())
// 	require.Len(t, stored, 1)
// 	assert.Equal(t, winnerID, stored["tag\x00database"].ID)
// 	assert.Equal(t, "tag", stored["tag\x00database"].Key, "winner's casing preserved in key")
// 	assert.Equal(t, "Database", stored["tag\x00database"].Value, "winner's casing preserved in value")
// }

// func TestStore_Create_MixedFreshAndConflict(t *testing.T) {
// 	ctx := context.Background()
// 	sqlstore := newTestStore(t)
// 	s := NewStore(sqlstore)

// 	orgID := valuer.GenerateUUID()
// 	pre := tagtypes.NewTag(orgID, dashboardKind, "tag", "Database")
// 	_, err := s.CreateOrGet(ctx, []*tagtypes.Tag{pre})
// 	require.NoError(t, err)
// 	preExistingID := pre.ID

// 	conflict := tagtypes.NewTag(orgID, dashboardKind, "tag", "Database")
// 	fresh := tagtypes.NewTag(orgID, dashboardKind, "team", "BLR")
// 	freshPreID := fresh.ID

// 	got, err := s.CreateOrGet(ctx, []*tagtypes.Tag{conflict, fresh})
// 	require.NoError(t, err)
// 	require.Len(t, got, 2)

// 	assert.Equal(t, preExistingID, got[0].ID, "conflicting row's ID overwritten with the existing row's")
// 	assert.Equal(t, freshPreID, got[1].ID, "fresh row's pre-generated ID is preserved")
// }
