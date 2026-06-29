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

func newConnTestStore(t *testing.T) alertmanagertypes.JsmOpsConnectionStore {
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
		Model((*alertmanagertypes.JsmOpsConnection)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	return NewJsmOpsConnectionStore(store)
}

func TestJsmOpsConnectionCRUD(t *testing.T) {
	ctx := context.Background()
	store := newConnTestStore(t)

	conn := alertmanagertypes.NewJsmOpsConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-1", "refresh-1")
	require.NoError(t, store.Create(ctx, conn))

	got, err := store.GetByID(ctx, "org-1", conn.ID)
	require.NoError(t, err)
	assert.Equal(t, "access-1", got.AccessToken)
	assert.Equal(t, "cloud-1", got.CloudID)

	// Cross-org reads must not leak the connection.
	_, err = store.GetByID(ctx, "org-2", conn.ID)
	assert.Error(t, err)

	byCloud, err := store.GetByOrgAndCloudID(ctx, "org-1", "cloud-1")
	require.NoError(t, err)
	assert.Equal(t, conn.ID, byCloud.ID)

	list, err := store.ListByOrg(ctx, "org-1")
	require.NoError(t, err)
	require.Len(t, list, 1)

	// Update rotates the stored tokens.
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

func TestJsmOpsConnectionUpdateTokensByRefreshToken(t *testing.T) {
	ctx := context.Background()
	store := newConnTestStore(t)

	conn := alertmanagertypes.NewJsmOpsConnection("org-1", "cloud-1", "https://acme.atlassian.net", "access-old", "refresh-old")
	require.NoError(t, store.Create(ctx, conn))

	rows, err := store.UpdateTokensByRefreshToken(ctx, "refresh-old", "access-new", "refresh-new")
	require.NoError(t, err)
	assert.Equal(t, int64(1), rows)

	got, err := store.GetByID(ctx, "org-1", conn.ID)
	require.NoError(t, err)
	assert.Equal(t, "access-new", got.AccessToken)
	assert.Equal(t, "refresh-new", got.RefreshToken)

	// A stale refresh token matches nothing.
	rows, err = store.UpdateTokensByRefreshToken(ctx, "refresh-old", "x", "y")
	require.NoError(t, err)
	assert.Equal(t, int64(0), rows)
}
