package impluser

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) (sqlstore.SQLStore, types.UserStore) {
	t.Helper()
	sqlStore, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns: 1,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = sqlStore.BunDB().NewCreateTable().Model((*types.User)(nil)).IfNotExists().Exec(context.Background())
	require.NoError(t, err)

	return sqlStore, NewStore(sqlStore, factorytest.NewSettings())
}

func TestStoreLookupByEmailIgnoresStoredCase(t *testing.T) {
	testCases := []struct {
		name        string
		storedEmail string
	}{
		{name: "StoredLowercase", storedEmail: "first.last@example.com"},
		{name: "StoredMixedCase", storedEmail: "First.Last@Example.com"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ctx := context.Background()
			sqlStore, store := newTestStore(t)
			orgID := valuer.GenerateUUID()

			user, err := types.NewUser("first", valuer.MustNewEmail("first.last@example.com"), orgID, types.UserStatusActive)
			require.NoError(t, err)
			require.NoError(t, store.CreateUser(ctx, user))

			_, err = sqlStore.BunDB().ExecContext(ctx, "UPDATE users SET email = ? WHERE id = ?", testCase.storedEmail, user.ID.StringValue())
			require.NoError(t, err)

			email := valuer.MustNewEmail("FIRST.LAST@example.com")

			users, err := store.GetNonDeletedUsersByEmailAndOrgID(ctx, email, orgID)
			require.NoError(t, err)
			require.Len(t, users, 1)
			assert.Equal(t, user.ID, users[0].ID)

			users, err = store.ListUsersByEmailAndOrgIDs(ctx, email, []valuer.UUID{orgID})
			require.NoError(t, err)
			require.Len(t, users, 1)
			assert.Equal(t, user.ID, users[0].ID)
		})
	}
}
