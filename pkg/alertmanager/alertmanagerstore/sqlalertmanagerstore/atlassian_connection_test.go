package sqlalertmanagerstore

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newConnTestStore(t *testing.T) alertmanagertypes.AtlassianConnectionStore {
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
		Model((*alertmanagertypes.AtlassianConnection)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	// Mirrors the unique index created by the atlassian_connection migration.
	_, err = store.BunDB().NewCreateIndex().
		Model((*alertmanagertypes.AtlassianConnection)(nil)).
		Index("uniq_atlassian_connection_org_id_site_url").
		Column("org_id", "site_url").
		Unique().
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	return NewAtlassianConnectionStore(store)
}

func TestAtlassianConnectionCRUD(t *testing.T) {
	ctx := context.Background()
	store := newConnTestStore(t)

	conn := alertmanagertypes.NewAtlassianConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-1", "refresh-1")
	require.NoError(t, store.Create(ctx, conn))

	got, err := store.GetByID(ctx, "org-1", conn.ID)
	require.NoError(t, err)
	assert.Equal(t, "access-1", got.AccessToken)
	assert.Equal(t, "cloud-1", got.CloudID)

	// Cross-org reads must not leak the connection.
	_, err = store.GetByID(ctx, "org-2", conn.ID)
	assert.Error(t, err)

	bySite, err := store.GetByOrgAndSiteURL(ctx, "org-1", "https://acme.atlassian.net")
	require.NoError(t, err)
	assert.Equal(t, conn.ID, bySite.ID)

	// A site belongs to the org that connected it.
	_, err = store.GetByOrgAndSiteURL(ctx, "org-2", "https://acme.atlassian.net")
	assert.Error(t, err)

	list, err := store.ListByOrg(ctx, "org-1")
	require.NoError(t, err)
	require.Len(t, list, 1)

	got.AccessToken = "access-2"
	got.RefreshToken = "refresh-2"
	require.NoError(t, store.Update(ctx, got))
	after, err := store.GetByID(ctx, "org-1", conn.ID)
	require.NoError(t, err)
	assert.Equal(t, "access-2", after.AccessToken)

	require.NoError(t, store.DeleteByID(ctx, "org-1", conn.ID))
	_, err = store.GetByID(ctx, "org-1", conn.ID)
	assert.Error(t, err)
}

func TestAtlassianConnectionRotatesBothTokens(t *testing.T) {
	ctx := context.Background()
	store := newConnTestStore(t)

	conn := alertmanagertypes.NewAtlassianConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-old", "refresh-old")
	require.NoError(t, store.Create(ctx, conn))

	conn.AccessToken = "access-new"
	conn.RefreshToken = "refresh-new"
	require.NoError(t, store.Update(ctx, conn))

	got, err := store.GetByID(ctx, "org-1", conn.ID)
	require.NoError(t, err)
	assert.Equal(t, "access-new", got.AccessToken)
	assert.Equal(t, "refresh-new", got.RefreshToken)
}

func TestAtlassianConnectionSiteIsUniquePerOrg(t *testing.T) {
	ctx := context.Background()
	store := newConnTestStore(t)

	conn := alertmanagertypes.NewAtlassianConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-1", "refresh-1")
	require.NoError(t, store.Create(ctx, conn))

	duplicate := alertmanagertypes.NewAtlassianConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-2", "refresh-2")
	assert.Error(t, store.Create(ctx, duplicate))

	// The same site connected by a different org is a distinct connection.
	other := alertmanagertypes.NewAtlassianConnection("org-2", "cloud-1", "https://acme.atlassian.net", "access-3", "refresh-3")
	require.NoError(t, store.Create(ctx, other))
}
