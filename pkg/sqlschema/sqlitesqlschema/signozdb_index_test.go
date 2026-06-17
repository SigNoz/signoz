package sqlitesqlschema

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/stretchr/testify/require"
)

// findSignozDB walks up from the test's working directory looking for a
// signoz.db file (the one the community server creates at the repo root).
func findSignozDB(t *testing.T) string {
	t.Helper()

	dir, err := os.Getwd()
	require.NoError(t, err)

	for {
		candidate := filepath.Join(dir, "signoz.db")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

// TestSignozDBTagUniqueIndex inspects the real signoz.db produced by running the
// community server and verifies the functional unique index added by migration
// 094 on the "tag" table.
//
//   - "MigrationCreatedIndex" is the ground-truth check: it reads the index DDL
//     straight out of sqlite_master and confirms the functional unique index
//     physically exists. This proves the migration ran and sqlite accepted it.
//   - "GetIndicesRoundTrip" exercises the engine's GetIndices read-back path and
//     checks it reconstructs the same index. This is the part your colleague
//     asked about.
func TestSignozDBTagUniqueIndex(t *testing.T) {
	dbPath := findSignozDB(t)
	if dbPath == "" {
		t.Skip("signoz.db not found; start the community server first so it creates the file and runs migrations")
	}
	t.Logf("using signoz.db at %s", dbPath)

	ctx := context.Background()
	cfg := sqlstore.Config{
		Provider: "sqlite",
		Sqlite: sqlstore.SqliteConfig{
			Path:            dbPath,
			Mode:            "wal",
			BusyTimeout:     10 * time.Second,
			TransactionMode: "deferred",
		},
		Connection: sqlstore.ConnectionConfig{MaxOpenConns: 10},
	}

	providerSettings := instrumentationtest.New().ToProviderSettings()
	store, err := sqlitesqlstore.New(ctx, providerSettings, cfg)
	require.NoError(t, err)

	schema, err := New(ctx, providerSettings, sqlschema.Config{}, store)
	require.NoError(t, err)

	expected := &sqlschema.UniqueIndex{
		TableName:   "tag",
		ColumnNames: []sqlschema.ColumnName{"org_id", "kind", "key", "value"},
		Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
	}

	t.Run("MigrationCreatedIndex", func(t *testing.T) {
		var ddl string
		err := store.
			BunDB().
			NewRaw("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'tag' AND name = ?", expected.Name()).
			Scan(ctx, &ddl)
		require.NoError(t, err, "expected unique index %q to exist in signoz.db", expected.Name())
		t.Logf("stored DDL: %s", ddl)

		require.Contains(t, ddl, "UNIQUE")
		require.Contains(t, ddl, "LOWER(key)")
		require.Contains(t, ddl, "LOWER(value)")
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
