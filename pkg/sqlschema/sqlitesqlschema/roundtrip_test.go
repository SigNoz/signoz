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
		exec(`CREATE TABLE ` + table + ` (a text, b text, c text, email text)`)
	}

	// roundTripAs creates `create`, reads the indices back, and asserts the
	// reconstructed index equals `want` — which may be a differently-spelled but
	// equivalent declaration (e.g. created LOWER(Email) vs expected LOWER(email)).
	roundTripAs := func(t *testing.T, create, want sqlschema.Index) {
		reset()
		for _, sql := range schema.Operator().CreateIndex(create) {
			exec(string(sql))
		}

		indices, err := schema.GetIndices(ctx, table)
		require.NoError(t, err)

		var got sqlschema.Index
		for _, index := range indices {
			if index.Name() == want.Name() {
				got = index
			}
		}
		require.NotNil(t, got, "GetIndices did not return %q; returned %d indices", want.Name(), len(indices))
		require.True(t, want.Equals(got), "reconstructed index should equal %#v; got %#v", want, got)
	}
	roundTrip := func(t *testing.T, declared sqlschema.Index) {
		roundTripAs(t, declared, declared)
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

	// Unquoted identifiers are case-insensitive: LOWER(Email) indexes the `email`
	// column, so it must reconstruct equal to a LOWER(email) declaration.
	t.Run("UnquotedMixedCaseColumnFoldsToLower", func(t *testing.T) {
		roundTripAs(t,
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(Email)"}},
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(email)"}},
		)
	})

	// A quoted simple identifier is equivalent to the unquoted form.
	t.Run("QuotedSimpleIdentifierRoundTripsUnquoted", func(t *testing.T) {
		roundTripAs(t,
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{`LOWER("email")`}},
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(email)"}},
		)
	})

	// assertCaseInsensitiveValues proves a functional unique index on keyExpr
	// applies LOWER() to the column's values, so 'Foo' and 'foo' collide while a
	// different value is accepted — something a plain unique index would not do.
	// This is about content, distinct from the identifier-case handling above.
	assertCaseInsensitiveValues := func(t *testing.T, keyExpr string) {
		reset()
		for _, sql := range schema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: table, Expressions: []string{keyExpr}}) {
			exec(string(sql))
		}

		_, err := store.BunDB().ExecContext(ctx, `INSERT INTO `+table+` (a) VALUES ('Foo')`)
		require.NoError(t, err)

		_, err = store.BunDB().ExecContext(ctx, `INSERT INTO `+table+` (a) VALUES ('foo')`)
		require.Error(t, err, "case-variant value must violate the functional unique index")

		_, err = store.BunDB().ExecContext(ctx, `INSERT INTO `+table+` (a) VALUES ('bar')`)
		require.NoError(t, err)
	}

	// The bare and quoted-identifier expression forms must behave identically.
	t.Run("FunctionalIndexEnforcesCaseInsensitiveValues", func(t *testing.T) {
		assertCaseInsensitiveValues(t, "LOWER(a)")
	})
	t.Run("QuotedIdentifierFunctionalIndexEnforcesCaseInsensitiveValues", func(t *testing.T) {
		assertCaseInsensitiveValues(t, `LOWER("a")`)
	})

	// SQLite identifiers are case-insensitive, so two columns differing only by
	// case collide. This is why the "quoted mixed-case stays distinct" round-trip
	// case is postgres-only — sqlite can't even create the distinct column.
	t.Run("CaseVariantColumnNamesRejected", func(t *testing.T) {
		_, err := store.BunDB().ExecContext(ctx, `CREATE TABLE rt_case_dupe (email text, "Email" text)`)
		require.Error(t, err, "sqlite must reject two columns whose names differ only by case")
	})
}
