package sqlalertmanagerstore

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

type snapshotBytes string

func (s snapshotBytes) MarshalBinary() ([]byte, error) { return []byte(s), nil }
func (s snapshotBytes) Merge([]byte) error             { return nil }

type snapshotSQLStore struct {
	sqlstore.SQLStore
	db *bun.DB
}

func (s *snapshotSQLStore) BunDB() *bun.DB { return s.db }

func newSnapshotStore(t *testing.T, provider string) alertmanagertypes.StateStore {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()
	var db sqlstore.SQLStore
	if provider == "postgres" {
		db = newPostgresSnapshotStore(t)
	} else {
		var err error
		db, err = sqlitesqlstore.New(ctx, factorytest.NewSettings(), sqlstore.Config{
			Provider:   "sqlite",
			Connection: sqlstore.ConnectionConfig{MaxOpenConns: 2},
			Sqlite: sqlstore.SqliteConfig{
				Path:            filepath.Join(t.TempDir(), "state.db"),
				Mode:            "wal",
				BusyTimeout:     5 * time.Second,
				TransactionMode: "immediate",
			},
		})
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, db.SQLDB().Close()) })
	}
	_, err := db.BunDB().NewCreateTable().Model((*alertmanagertypes.StoreableState)(nil)).Exec(ctx)
	require.NoError(t, err)
	_, err = db.BunDB().NewCreateIndex().Model((*alertmanagertypes.StoreableState)(nil)).
		Index("alertmanager_state_org_id_idx").Column("org_id").Unique().Exec(ctx)
	require.NoError(t, err)
	return NewStateStore(db)
}

func newPostgresSnapshotStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	dsn := os.Getenv("SIGNOZ_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("SIGNOZ_TEST_POSTGRES_DSN not set")
	}
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.ConnectTimeout = 5 * time.Second
	admin := stdlib.OpenDB(*config)
	t.Cleanup(func() { require.NoError(t, admin.Close()) })
	schema := "snapshot_" + fmt.Sprintf("%x", time.Now().UnixNano())
	identifier := pgx.Identifier{schema}.Sanitize()
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()
	_, err = admin.ExecContext(ctx, "CREATE SCHEMA "+identifier)
	require.NoError(t, err)
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, err := admin.ExecContext(ctx, "DROP SCHEMA "+identifier+" CASCADE")
		require.NoError(t, err)
	})
	config.RuntimeParams["search_path"] = schema
	config.RuntimeParams["statement_timeout"] = "10000"
	connection := stdlib.OpenDB(*config)
	connection.SetMaxOpenConns(2)
	db := bun.NewDB(connection, pgdialect.New())
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	return &snapshotSQLStore{db: db}
}

func TestStateSnapshots(t *testing.T) {
	for _, provider := range []string{"sqlite", "postgres"} {
		t.Run(provider, func(t *testing.T) {
			store := newSnapshotStore(t, provider)
			t.Run("stale-write-order", func(t *testing.T) { testStateSnapshotOrdering(t, store) })
			t.Run("concurrent-first-writes", func(t *testing.T) { testStateSnapshotFirstWrites(t, store) })
			t.Run("empty-and-isolated", func(t *testing.T) { testStateSnapshotEmptyAndIsolated(t, store) })
			t.Run("invalid-component", func(t *testing.T) {
				ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
				defer cancel()
				input := alertmanagertypes.NewStoreableState(valuer.GenerateUUID().StringValue())
				err := store.Set(ctx, input, alertmanagertypes.StateName{})
				require.True(t, errors.Ast(err, errors.TypeInvalidInput))
				_, err = store.Get(ctx, input.OrgID)
				require.True(t, errors.Ast(err, errors.TypeNotFound))
			})
		})
	}
}

func testStateSnapshotOrdering(t *testing.T, store alertmanagertypes.StateStore) {
	for _, first := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
		t.Run(first.String(), func(t *testing.T) {
			ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
			defer cancel()
			orgID := valuer.GenerateUUID().StringValue()
			initial := alertmanagertypes.NewStoreableState(orgID)
			_, err := initial.Set(alertmanagertypes.SilenceStateName, snapshotBytes("old silence"))
			require.NoError(t, err)
			_, err = initial.Set(alertmanagertypes.NFLogStateName, snapshotBytes("old nflog"))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, initial, alertmanagertypes.SilenceStateName))
			require.NoError(t, store.Set(ctx, initial, alertmanagertypes.NFLogStateName))

			silences, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			nflog, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			_, err = silences.Set(alertmanagertypes.SilenceStateName, snapshotBytes("new silence"))
			require.NoError(t, err)
			_, err = nflog.Set(alertmanagertypes.NFLogStateName, snapshotBytes("new nflog"))
			require.NoError(t, err)

			if first == alertmanagertypes.SilenceStateName {
				require.NoError(t, store.Set(ctx, silences, alertmanagertypes.SilenceStateName))
				require.NoError(t, store.Set(ctx, nflog, alertmanagertypes.NFLogStateName))
			} else {
				require.NoError(t, store.Set(ctx, nflog, alertmanagertypes.NFLogStateName))
				require.NoError(t, store.Set(ctx, silences, alertmanagertypes.SilenceStateName))
			}
			stored, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			silenceData, err := stored.Get(alertmanagertypes.SilenceStateName)
			require.NoError(t, err)
			nflogData, err := stored.Get(alertmanagertypes.NFLogStateName)
			require.NoError(t, err)
			require.Equal(t, "new silence", silenceData)
			require.Equal(t, "new nflog", nflogData)
			require.Equal(t, initial.ID, stored.ID)
			require.WithinDuration(t, initial.CreatedAt, stored.CreatedAt, time.Microsecond)
		})
	}
}

func testStateSnapshotFirstWrites(t *testing.T, store alertmanagertypes.StateStore) {
	ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
	defer cancel()
	for range 10 {
		orgID := valuer.GenerateUUID().StringValue()
		start := make(chan struct{})
		results := make(chan error, 2)
		var wg sync.WaitGroup
		for _, component := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
			input := alertmanagertypes.NewStoreableState(orgID)
			_, err := input.Set(component, snapshotBytes(component.String()))
			require.NoError(t, err)
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-start
				results <- store.Set(ctx, input, component)
			}()
		}
		close(start)
		completed := make(chan struct{})
		go func() {
			wg.Wait()
			close(completed)
		}()
		select {
		case <-completed:
		case <-ctx.Done():
			t.Fatal("concurrent snapshot writes timed out")
		}
		close(results)
		for err := range results {
			require.NoError(t, err)
		}
		stored, err := store.Get(ctx, orgID)
		require.NoError(t, err)
		for _, component := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
			data, err := stored.Get(component)
			require.NoError(t, err)
			require.Equal(t, component.String(), data)
		}
	}
}

func testStateSnapshotEmptyAndIsolated(t *testing.T, store alertmanagertypes.StateStore) {
	for _, component := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
		t.Run(component.String(), func(t *testing.T) {
			ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
			defer cancel()
			other := alertmanagertypes.NFLogStateName
			if component == other {
				other = alertmanagertypes.SilenceStateName
			}
			input := alertmanagertypes.NewStoreableState(valuer.GenerateUUID().StringValue())
			_, err := input.Set(other, snapshotBytes("must not be inserted"))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, input, component))
			stored, err := store.Get(ctx, input.OrgID)
			require.NoError(t, err)
			require.Empty(t, stored.Silences)
			require.Empty(t, stored.NFLog)

			_, err = input.Set(component, snapshotBytes("to clear"))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, input, component))
			sibling := alertmanagertypes.NewStoreableState(input.OrgID)
			_, err = sibling.Set(other, snapshotBytes("keep sibling"))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, sibling, other))
			isolated := alertmanagertypes.NewStoreableState(valuer.GenerateUUID().StringValue())
			_, err = isolated.Set(component, snapshotBytes("keep other org"))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, isolated, component))

			_, err = input.Set(component, snapshotBytes(""))
			require.NoError(t, err)
			require.NoError(t, store.Set(ctx, input, component))
			stored, err = store.Get(ctx, input.OrgID)
			require.NoError(t, err)
			_, err = stored.Get(component)
			require.True(t, errors.Ast(err, errors.TypeNotFound))
			data, err := stored.Get(other)
			require.NoError(t, err)
			require.Equal(t, "keep sibling", data)
			var cleared sql.NullString
			column := "silences"
			if component == alertmanagertypes.NFLogStateName {
				column = "nflog"
			}
			err = store.(*state).sqlstore.BunDB().NewSelect().Model((*alertmanagertypes.StoreableState)(nil)).
				Column(column).Where("org_id = ?", input.OrgID).Scan(ctx, &cleared)
			require.NoError(t, err)
			require.False(t, cleared.Valid)
			stored, err = store.Get(ctx, isolated.OrgID)
			require.NoError(t, err)
			data, err = stored.Get(component)
			require.NoError(t, err)
			require.Equal(t, "keep other org", data)
		})
	}
}
