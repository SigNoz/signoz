package agentConf

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func newTestRepo(t *testing.T) Repo {
	t.Helper()
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "rwc",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	// Create the tables used by agentConf
	_, err = store.BunDB().NewCreateTable().
		Model((*opamptypes.AgentConfigVersion)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*opamptypes.AgentConfigElement)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	// Also create org table stub for foreign key references (if any)
	_, err = store.BunDB().Exec(`
		CREATE TABLE IF NOT EXISTS organizations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			display_name TEXT
		)
	`)
	require.NoError(t, err)

	_, err = store.BunDB().Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			display_name TEXT,
			email TEXT,
			org_id TEXT
		)
	`)
	require.NoError(t, err)

	return Repo{store: store}
}

func seedOrg(t *testing.T, repo Repo) valuer.UUID {
	t.Helper()
	orgID := valuer.GenerateUUID()
	_, err := repo.store.BunDB().Exec(
		`INSERT INTO organizations (id, created_at, updated_at, display_name) VALUES (?, ?, ?, ?)`,
		orgID.StringValue(), time.Now(), time.Now(), "test-org",
	)
	require.NoError(t, err)
	return orgID
}

// TestInsertConfig_HappyPath verifies that a valid insertConfig call persists
// both the version row and all element rows.
func TestInsertConfig_HappyPath(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	cfg := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
	elements := []string{"elem-1", "elem-2", "elem-3"}

	err := repo.insertConfig(context.Background(), orgID, userID, cfg, elements)
	require.NoError(t, err)
	require.Equal(t, 1, cfg.Version) // first version

	// Version row must exist
	var versions []opamptypes.AgentConfigVersion
	err = repo.store.BunDB().NewSelect().
		Model(&versions).
		Where("org_id = ?", orgID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, versions, 1)
	require.Equal(t, 1, versions[0].Version)

	// All elements must be persisted
	var elems []opamptypes.AgentConfigElement
	err = repo.store.BunDB().NewSelect().
		Model(&elems).
		Where("version_id = ?", cfg.ID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, elems, 3)
}

// TestInsertConfig_EmptyElementsAllowedForLogPipelines verifies that deleting
// all pipelines (empty element list) is permitted for LogPipelines type only.
func TestInsertConfig_EmptyElementsAllowedForLogPipelines(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	cfg := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
	err := repo.insertConfig(context.Background(), orgID, userID, cfg, []string{})
	require.NoError(t, err)

	var versions []opamptypes.AgentConfigVersion
	err = repo.store.BunDB().NewSelect().
		Model(&versions).
		Where("org_id = ?", orgID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, versions, 1)
}

// TestInsertConfig_VersionIncrements verifies that successive inserts get
// monotonically increasing version numbers.
func TestInsertConfig_VersionIncrements(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	for i := 1; i <= 3; i++ {
		cfg := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
		err := repo.insertConfig(context.Background(), orgID, userID, cfg, []string{"e"})
		require.NoError(t, err)
		require.Equal(t, i, cfg.Version)
	}

	var versions []opamptypes.AgentConfigVersion
	err := repo.store.BunDB().NewSelect().
		Model(&versions).
		Where("org_id = ?", orgID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, versions, 3)
}

// TestInsertConfig_CancelledContextLeavesNoPartialData is the regression test for
// GitHub issue #12092. Before the fix, a cancelled request context caused the
// cleanup defer to fail silently, leaving a partial agent_config_version row in
// the DB. The next list call returned this partial version as "latest", making
// some pipelines appear to disappear.
//
// With the fix (RunInTxCtx), a cancelled context causes the DB transaction to
// roll back atomically — no partial rows survive.
func TestInsertConfig_CancelledContextLeavesNoPartialData(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	// First, insert a good version with 3 pipelines.
	cfg1 := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
	err := repo.insertConfig(context.Background(), orgID, userID, cfg1, []string{"p1", "p2", "p3"})
	require.NoError(t, err)
	require.Equal(t, 1, cfg1.Version)

	// Now simulate a save that fails mid-way due to a cancelled context.
	// We cancel immediately so the transaction itself will fail.
	cancelledCtx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before the call

	cfg2 := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
	err = repo.insertConfig(cancelledCtx, orgID, userID, cfg2, []string{"p1", "p2", "p3"})
	require.Error(t, err, "should fail with cancelled context")

	// CRITICAL: The DB must not contain any partial data from cfg2.
	// Specifically, the version count must still be 1 (only the original good version).
	var versions []opamptypes.AgentConfigVersion
	err = repo.store.BunDB().NewSelect().
		Model(&versions).
		Where("org_id = ?", orgID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, versions, 1, "no partial version row should survive a cancelled insert")
	require.Equal(t, 1, versions[0].Version, "only the original version should remain")

	// Also verify no orphan elements from cfg2 exist.
	var elems []opamptypes.AgentConfigElement
	err = repo.store.BunDB().NewSelect().
		Model(&elems).
		Where("version_id = ?", cfg2.ID).
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, elems, 0, "no orphan elements should survive a cancelled insert")
}

// TestInsertConfig_RejectsPresetVersion verifies that callers cannot assign a
// version number — it must be auto-assigned.
func TestInsertConfig_RejectsPresetVersion(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	cfg := opamptypes.NewAgentConfigVersion(orgID, userID, opamptypes.ElementTypeLogPipelines)
	cfg.Version = 99 // manually set — should be rejected

	err := repo.insertConfig(context.Background(), orgID, userID, cfg, []string{"e"})
	require.Error(t, err)

	// No rows should be inserted.
	var versions []opamptypes.AgentConfigVersion
	_ = repo.store.BunDB().NewSelect().
		Model(&versions).
		Where("org_id = ?", orgID).
		Scan(context.Background())
	require.Len(t, versions, 0)
}

// TestInsertConfig_RejectsEmptyElementType validates the element type check.
func TestInsertConfig_RejectsEmptyElementType(t *testing.T) {
	repo := newTestRepo(t)
	orgID := seedOrg(t, repo)
	userID := valuer.GenerateUUID()

	cfg := &opamptypes.AgentConfigVersion{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        orgID,
	}
	// ElementType is zero-value (empty string)

	err := repo.insertConfig(context.Background(), orgID, userID, cfg, []string{"e"})
	require.Error(t, err)
}
