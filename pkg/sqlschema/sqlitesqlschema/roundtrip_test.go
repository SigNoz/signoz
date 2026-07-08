//go:build integration

// Stands up a real sqlite store (temp file); excluded from the default test run.
// Run with: go test -tags integration ./...

package sqlitesqlschema

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/stretchr/testify/require"
)

// TestGetIndicesRoundTrip creates each index shape on a fresh sqlite database and
// checks GetIndices reconstructs an equal index, exercising every branch: plain
// vs expression keys parsed from the DDL, multi-key ordering, partial predicate,
// and the skipped functional-partial case.
func TestGetIndicesRoundTrip(t *testing.T) {
	ctx := context.Background()
	cfg := sqlstore.Config{
		Provider: "sqlite",
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "roundtrip.db"),
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

	const table = "sqlschema_roundtrip"

	exec := func(sql string) {
		_, err := store.BunDB().ExecContext(ctx, sql)
		require.NoError(t, err)
	}
	reset := func() {
		exec(`DROP TABLE IF EXISTS ` + table)
		exec(`CREATE TABLE ` + table + ` (a text, b text, c text)`)
	}

	roundTrip := func(t *testing.T, declared sqlschema.Index) {
		reset()
		for _, sql := range schema.Operator().CreateIndex(declared) {
			exec(string(sql))
		}

		indices, err := schema.GetIndices(ctx, table)
		require.NoError(t, err)

		var got sqlschema.Index
		for _, index := range indices {
			if index.Name() == declared.Name() {
				got = index
			}
		}
		require.NotNil(t, got, "GetIndices did not return %q; returned %d indices", declared.Name(), len(indices))
		require.True(t, declared.Equals(got), "round-tripped index should equal the declared one; got %#v", got)
	}

	t.Run("PlainSingleColumn", func(t *testing.T) {
		roundTrip(t, &sqlschema.UniqueIndex{TableName: table, ColumnNames: []sqlschema.ColumnName{"a"}})
	})

	t.Run("PlainMultiColumn", func(t *testing.T) {
		roundTrip(t, &sqlschema.UniqueIndex{TableName: table, ColumnNames: []sqlschema.ColumnName{"a", "b"}})
	})

	t.Run("FunctionalSingleExpression", func(t *testing.T) {
		roundTrip(t, &sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(a)"}})
	})

	t.Run("FunctionalMixedKeys", func(t *testing.T) {
		roundTrip(t, &sqlschema.UniqueIndex{TableName: table, Expressions: []string{"a", "LOWER(b)", "LOWER(c)"}})
	})

	t.Run("PartialUnique", func(t *testing.T) {
		roundTrip(t, &sqlschema.PartialUniqueIndex{TableName: table, ColumnNames: []sqlschema.ColumnName{"a"}, Where: "b IS NOT NULL"})
	})

	t.Run("FunctionalPartialIsSkipped", func(t *testing.T) {
		reset()
		exec(`CREATE UNIQUE INDEX rt_functional_partial ON ` + table + ` (LOWER(a)) WHERE b IS NOT NULL`)

		indices, err := schema.GetIndices(ctx, table)
		require.NoError(t, err)
		require.Empty(t, indices, "functional partial unique index must be skipped, not reconstructed")
	})
}
