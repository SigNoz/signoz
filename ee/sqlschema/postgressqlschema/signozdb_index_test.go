package postgressqlschema

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/stretchr/testify/require"
)

// devenvPostgresDSN is the DSN for the postgres started by `make devenv-postgres`.
// Override with TEST_POSTGRES_DSN to point at a different instance.
const devenvPostgresDSN = "postgres://postgres:password@localhost:5432/signoz?sslmode=disable"

// TestSignozDBTagUniqueIndex inspects the real postgres database the enterprise
// server migrates and verifies the functional unique index added by migration
// 094 on the "tag" table.
//
//   - "MigrationCreatedIndex" is the ground-truth check: it reads the index
//     definition straight out of pg_indexes and confirms the functional unique
//     index physically exists. This proves the migration ran and postgres
//     accepted it.
//   - "GetIndicesRoundTrip" exercises the engine's GetIndices read-back path and
//     checks it reconstructs the same index. This is the part your colleague
//     asked about.
//
// It mirrors the sqlite signoz.db test, but talks to the devenv postgres
// container instead of a local file. The test skips if postgres is unreachable
// (run `make devenv-postgres` and the enterprise server first).
func TestSignozDBTagUniqueIndex(t *testing.T) {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		dsn = devenvPostgresDSN
	}

	ctx := context.Background()
	cfg := sqlstore.Config{
		Provider:   "postgres",
		Postgres:   sqlstore.PostgresConfig{DSN: dsn},
		Connection: sqlstore.ConnectionConfig{MaxOpenConns: 10, MaxConnLifetime: time.Minute},
	}

	providerSettings := instrumentationtest.New().ToProviderSettings()
	store, err := postgressqlstore.New(ctx, providerSettings, cfg)
	if err != nil {
		t.Skipf("postgres unreachable at %s (run `make devenv-postgres` and the enterprise server): %v", dsn, err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := store.SQLDB().PingContext(pingCtx); err != nil {
		t.Skipf("postgres unreachable at %s (run `make devenv-postgres` and the enterprise server): %v", dsn, err)
	}
	t.Logf("using postgres at %s", dsn)

	schema, err := New(ctx, providerSettings, sqlschema.Config{}, store)
	require.NoError(t, err)

	expected := &sqlschema.UniqueIndex{
		TableName:   "tag",
		ColumnNames: []sqlschema.ColumnName{"org_id", "kind", "key", "value"},
		Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
	}

	t.Run("MigrationCreatedIndex", func(t *testing.T) {
		var def string
		err := store.
			BunDB().
			NewRaw("SELECT indexdef FROM pg_indexes WHERE tablename = 'tag' AND indexname = ?", expected.Name()).
			Scan(ctx, &def)
		require.NoError(t, err, "expected unique index %q to exist in postgres", expected.Name())
		t.Logf("stored indexdef: %s", def)

		require.Contains(t, def, "UNIQUE")
		// postgres normalizes function names to lowercase.
		require.Contains(t, def, "lower(key)")
		require.Contains(t, def, "lower(value)")
	})

	t.Run("GetIndicesRoundTrip", func(t *testing.T) {
		indices, err := schema.GetIndices(ctx, "tag")
		require.NoError(t, err)

		t.Logf("GetIndices returned %d indices", len(indices))
		var got sqlschema.Index
		for _, idx := range indices {
			t.Logf("  name=%q type=%s columns=%v create=%s", idx.Name(), idx.Type(), idx.Columns(), string(idx.ToCreateSQL(schema.Formatter())))
			if idx.Name() == expected.Name() {
				got = idx
			}
		}

		require.NotNil(t, got, "GetIndices did not return the functional unique index %q", expected.Name())
		require.True(t, expected.Equals(got), "round-tripped index should equal the original definition")
	})
}
