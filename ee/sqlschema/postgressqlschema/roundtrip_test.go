//go:build integration

// Requires a running postgres (make devenv-postgres); excluded from the default
// test run. Run with: go test -tags integration ./...

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

// TestGetIndicesRoundTrip creates each index shape on a throwaway table in devenv
// postgres and checks GetIndices reconstructs an equal index, exercising every
// query branch: plain vs expression keys, multi-key ordering, partial predicate,
// and the skipped functional-partial case. Skips if postgres is unreachable.
func TestGetIndicesRoundTrip(t *testing.T) {
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
		t.Skipf("postgres unreachable at %s (run `make devenv-postgres`): %v", dsn, err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := store.SQLDB().PingContext(pingCtx); err != nil {
		t.Skipf("postgres unreachable at %s (run `make devenv-postgres`): %v", dsn, err)
	}

	schema, err := New(ctx, providerSettings, sqlschema.Config{}, store)
	require.NoError(t, err)

	const table = "sqlschema_roundtrip"

	exec := func(sql string) {
		_, err := store.BunDB().ExecContext(ctx, sql)
		require.NoError(t, err)
	}
	reset := func() {
		exec(`DROP TABLE IF EXISTS ` + table)
		// email and "Email" are distinct columns in postgres (quoted identifiers
		// are case-sensitive), which the identifier-equivalence cases rely on.
		exec(`CREATE TABLE ` + table + ` (a text, b text, c text, email text, "Email" text)`)
	}
	t.Cleanup(func() { _, _ = store.BunDB().ExecContext(ctx, `DROP TABLE IF EXISTS `+table) })

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

	// Unquoted identifiers are case-insensitive: postgres folds LOWER(Email) to the
	// `email` column and renders it back as lower(email), so it must reconstruct
	// equal to a LOWER(email) declaration.
	t.Run("UnquotedMixedCaseColumnFoldsToLower", func(t *testing.T) {
		roundTripAs(t,
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(Email)"}},
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(email)"}},
		)
	})

	// A quoted simple identifier is equivalent to the unquoted form; postgres
	// renders "email" back unquoted.
	t.Run("QuotedSimpleIdentifierRoundTripsUnquoted", func(t *testing.T) {
		roundTripAs(t,
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{`LOWER("email")`}},
			&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(email)"}},
		)
	})

	// A quoted mixed-case identifier targets the distinct "Email" column: it must
	// round-trip to itself and must NOT equal the lowercased-column index.
	t.Run("QuotedMixedCaseColumnStaysDistinct", func(t *testing.T) {
		reset()
		create := &sqlschema.UniqueIndex{TableName: table, Expressions: []string{`LOWER("Email")`}}
		for _, sql := range schema.Operator().CreateIndex(create) {
			exec(string(sql))
		}

		indices, err := schema.GetIndices(ctx, table)
		require.NoError(t, err)

		var got sqlschema.Index
		for _, index := range indices {
			if index.Name() == create.Name() {
				got = index
			}
		}
		require.NotNil(t, got, "GetIndices did not return %q", create.Name())
		require.True(t, create.Equals(got), "quoted mixed-case index should round-trip equal; got %#v", got)
		require.False(t, (&sqlschema.UniqueIndex{TableName: table, Expressions: []string{"LOWER(email)"}}).Equals(got),
			`LOWER("Email") must not equal LOWER(email); they target different columns`)
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
}
