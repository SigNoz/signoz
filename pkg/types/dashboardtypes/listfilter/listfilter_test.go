package listfilter

import (
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
)

type compileCase struct {
	subtestName              string
	dslQueryToCompile        string
	nilExpected              bool
	expectedSQL              string
	expectedArgs             []any
	expectedErrShouldContain string
}

func runCompileCases(t *testing.T, cases []compileCase) {
	t.Helper()
	for _, c := range cases {
		t.Run(c.subtestName, func(t *testing.T) {
			out, err := Compile(c.dslQueryToCompile, formatter(t))

			if c.expectedErrShouldContain != "" {
				require.Error(t, err)
				assert.Contains(t, strings.ToLower(err.Error()), strings.ToLower(c.expectedErrShouldContain))
				return
			}

			require.NoError(t, err)
			if c.nilExpected {
				assert.Nil(t, out)
				return
			}
			require.NotNil(t, out)

			if c.expectedSQL != "" {
				assert.Equal(t, normalizeSQL(c.expectedSQL), normalizeSQL(out.SQL))
			}
			if c.expectedArgs != nil {
				require.Len(t, out.Args, len(c.expectedArgs))
				for i, want := range c.expectedArgs {
					// time.Time values can carry semantically-equal instants
					// in different *Location representations (UTC vs Local vs
					// FixedZone). Compare via .Equal() instead of DeepEqual.
					if wantT, ok := want.(time.Time); ok {
						gotT, ok := out.Args[i].(time.Time)
						require.True(t, ok, "arg[%d]: want time.Time, got %T", i, out.Args[i])
						assert.True(t, wantT.Equal(gotT), "arg[%d]: want %s, got %s", i, wantT, gotT)
						continue
					}
					assert.Equal(t, want, out.Args[i], "arg[%d]", i)
				}
			}
		})
	}
}

func TestCompile_Empty(t *testing.T) {
	runCompileCases(t, []compileCase{
		{subtestName: "empty query yields nil", dslQueryToCompile: "", nilExpected: true},
	})
}

func TestCompile_Name(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "name =",
			dslQueryToCompile: `name = 'overview'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.data.display.name') = ?`,
			expectedArgs:      []any{"overview"},
		},
		{
			// QUOTED_TEXT in the grammar covers both '…' and "…" — visitor
			// strips whichever quote pair surrounds the value.
			subtestName:       "name = with double-quoted value",
			dslQueryToCompile: `name = "something"`,
			expectedSQL:       `json_extract("dashboard"."data", '$.data.display.name') = ?`,
			expectedArgs:      []any{"something"},
		},
		{
			subtestName:       "name CONTAINS",
			dslQueryToCompile: `name CONTAINS 'overview'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.data.display.name') LIKE ?`,
			expectedArgs:      []any{"%overview%"},
		},
		{
			subtestName:       "name ILIKE — emitted as LOWER(col) LIKE LOWER(?) for dialect parity",
			dslQueryToCompile: `name ILIKE 'Prod%'`,
			expectedSQL:       `lower(json_extract("dashboard"."data", '$.data.display.name')) LIKE LOWER(?)`,
			expectedArgs:      []any{"Prod%"},
		},
		{
			subtestName:       "CONTAINS escapes % in user input",
			dslQueryToCompile: `name CONTAINS '50%'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.data.display.name') LIKE ?`,
			expectedArgs:      []any{`%50\%%`},
		},
	})
}

func TestCompile_CreatedByLocked(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "created_by LIKE",
			dslQueryToCompile: `created_by LIKE '%@signoz.io'`,
			expectedSQL:       `dashboard.created_by LIKE ?`,
			expectedArgs:      []any{"%@signoz.io"},
		},
		{
			subtestName:       "locked = true",
			dslQueryToCompile: `locked = true`,
			expectedSQL:       `dashboard.locked = ?`,
			expectedArgs:      []any{true},
		},
	})
}

func TestCompile_Public(t *testing.T) {
	runCompileCases(t, []compileCase{
		{subtestName: "public = true", dslQueryToCompile: `public = true`, expectedSQL: `pd.id IS NOT NULL`},
		{subtestName: "public = false", dslQueryToCompile: `public = false`, expectedSQL: `pd.id IS NULL`},
		{subtestName: "public != true", dslQueryToCompile: `public != true`, expectedSQL: `pd.id IS NULL`},
	})
}

func TestCompile_Timestamps(t *testing.T) {
	ist := time.FixedZone("+05:30", 5*60*60+30*60)
	runCompileCases(t, []compileCase{
		{
			subtestName:       "created_at >= RFC3339",
			dslQueryToCompile: `created_at >= '2026-03-10T00:00:00Z'`,
			expectedSQL:       `dashboard.created_at >= ?`,
			expectedArgs:      []any{time.Date(2026, 3, 10, 0, 0, 0, 0, time.UTC)},
		},
		{
			subtestName:       "updated_at BETWEEN",
			dslQueryToCompile: `updated_at BETWEEN '2026-03-10T00:00:00Z' AND '2026-03-20T00:00:00Z'`,
			expectedSQL:       `dashboard.updated_at BETWEEN ? AND ?`,
			expectedArgs: []any{
				time.Date(2026, 3, 10, 0, 0, 0, 0, time.UTC),
				time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC),
			},
		},
		{
			subtestName:       "created_at >= IST timestamp",
			dslQueryToCompile: `created_at >= '2026-03-10T05:30:00+05:30'`,
			expectedSQL:       `dashboard.created_at >= ?`,
			expectedArgs:      []any{time.Date(2026, 3, 10, 5, 30, 0, 0, ist)},
		},
	})
}

// Tag operators wrap each predicate in EXISTS / NOT EXISTS.
func TestCompile_Tag(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "tag = wraps in EXISTS",
			dslQueryToCompile: `tag = 'database'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name = ?
				)`,
			expectedArgs: []any{"database"},
		},
		{
			subtestName:       "tag != wraps in NOT EXISTS with positive inner",
			dslQueryToCompile: `tag != 'database'`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name = ?
				)`,
			expectedArgs: []any{"database"},
		},
		{
			subtestName:       "tag IN — inner is single placeholder list",
			dslQueryToCompile: `tag IN ['team/pulse', 'team/events']`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name IN (?, ?)
				)`,
			expectedArgs: []any{"team/pulse", "team/events"},
		},
		{
			subtestName:       "tag NOT IN",
			dslQueryToCompile: `tag NOT IN ['database/redis', 'database/mongo']`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name IN (?, ?)
				)`,
			expectedArgs: []any{"database/redis", "database/mongo"},
		},
		{
			subtestName:       "tag LIKE — hierarchy match",
			dslQueryToCompile: `tag LIKE 'prod/%'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name LIKE ?
				)`,
			expectedArgs: []any{"prod/%"},
		},
		{
			subtestName:       "tag NOT LIKE",
			dslQueryToCompile: `tag NOT LIKE 'tests/%'`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name LIKE ?
				)`,
			expectedArgs: []any{"tests/%"},
		},
		{
			subtestName:       "tag EXISTS — bare predicate, no tag table join needed",
			dslQueryToCompile: `tag EXISTS`,
			expectedSQL:       `EXISTS (SELECT 1 FROM tag_relations tr WHERE tr.entity_id = dashboard.id)`,
			expectedArgs:      []any{},
		},
		{
			subtestName:       "tag NOT EXISTS",
			dslQueryToCompile: `tag NOT EXISTS`,
			expectedSQL:       `NOT EXISTS (SELECT 1 FROM tag_relations tr WHERE tr.entity_id = dashboard.id)`,
			expectedArgs:      []any{},
		},
	})
}

func TestCompile_BooleanComposition(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "AND chain — flat arg list",
			dslQueryToCompile: `locked = true AND public = true`,
			expectedSQL:       `dashboard.locked = ? AND pd.id IS NOT NULL`,
			expectedArgs:      []any{true},
		},
		{
			subtestName:       "OR chain",
			dslQueryToCompile: `locked = true OR public = true`,
			expectedSQL:       `dashboard.locked = ? OR pd.id IS NOT NULL`,
			expectedArgs:      []any{true},
		},
		{
			subtestName:       "parens preserve precedence",
			dslQueryToCompile: `(locked = true OR public = true) AND created_by = 'a@b.com'`,
			expectedSQL:       `(dashboard.locked = ? OR pd.id IS NOT NULL) AND dashboard.created_by = ?`,
			expectedArgs:      []any{true, "a@b.com"},
		},
	})
}

// Distinct from operator-suffix negation (NOT IN / NOT LIKE / NOT EXISTS).
// Driven by the unaryExpression rule (`NOT? primary`), so NOT binds to
// exactly one primary and only widens via parens.
func TestCompile_NOT(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "NOT on a single comparison",
			dslQueryToCompile: `NOT name = 'foo'`,
			expectedSQL:       `NOT (json_extract("dashboard"."data", '$.data.display.name') = ?)`,
			expectedArgs:      []any{"foo"},
		},
		{
			subtestName:       "NOT binds tightly to its primary in an AND chain",
			dslQueryToCompile: `NOT name = 'foo' AND created_by = 'alice'`,
			expectedSQL:       `NOT (json_extract("dashboard"."data", '$.data.display.name') = ?) AND dashboard.created_by = ?`,
			expectedArgs:      []any{"foo", "alice"},
		},
		{
			subtestName:       "NOT applied to the second term in an AND chain",
			dslQueryToCompile: `locked = true AND NOT name = 'foo'`,
			expectedSQL:       `dashboard.locked = ? AND NOT (json_extract("dashboard"."data", '$.data.display.name') = ?)`,
			expectedArgs:      []any{true, "foo"},
		},
		{
			subtestName:       "NOT around a parenthesized OR",
			dslQueryToCompile: `NOT (locked = true OR public = true)`,
			expectedSQL:       `NOT ((dashboard.locked = ? OR pd.id IS NOT NULL))`,
			expectedArgs:      []any{true},
		},
		{
			subtestName:       "double NOT via parens",
			dslQueryToCompile: `NOT (NOT name = 'foo')`,
			expectedSQL:       `NOT ((NOT (json_extract("dashboard"."data", '$.data.display.name') = ?)))`,
			expectedArgs:      []any{"foo"},
		},
		{
			subtestName:       "NOT on a tag equality",
			dslQueryToCompile: `NOT tag = 'database'`,
			expectedSQL: `
				NOT (
					EXISTS (
						SELECT 1 FROM tag_relations tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.entity_id = dashboard.id AND t.name = ?
					)
				)`,
			expectedArgs: []any{"database"},
		},
		{
			subtestName:       "NOT tag = ... AND name = ...",
			dslQueryToCompile: `NOT tag = 'database' AND name = 'overview'`,
			expectedSQL: `
				NOT (
					EXISTS (
						SELECT 1 FROM tag_relations tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.entity_id = dashboard.id AND t.name = ?
					)
				)
				AND json_extract("dashboard"."data", '$.data.display.name') = ?`,
			expectedArgs: []any{"database", "overview"},
		},
	})
}

func TestCompile_ComplexExamples(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "name CONTAINS + tag LIKE + created_by + tag",
			dslQueryToCompile: `name CONTAINS 'overview' AND tag LIKE 'prod/%' AND created_by = 'naman.verma@signoz.io' AND tag = 'database'`,
			expectedSQL: `
				json_extract("dashboard"."data", '$.data.display.name') LIKE ?
				AND EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name LIKE ?
				)
				AND dashboard.created_by = ?
				AND EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name = ?
				)`,
			expectedArgs: []any{"%overview%", "prod/%", "naman.verma@signoz.io", "database"},
		},
		{
			subtestName:       "tag IN AND tag =",
			dslQueryToCompile: `tag IN ['team/pulse', 'team/events'] AND tag = 'database'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name IN (?, ?)
				)
				AND EXISTS (
					SELECT 1 FROM tag_relations tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.entity_id = dashboard.id AND t.name = ?
				)`,
			expectedArgs: []any{"team/pulse", "team/events", "database"},
		},
		{
			subtestName:       "nested OR / AND with parens",
			dslQueryToCompile: `(tag IN ['sql', 'redis', 'mongo'] OR name LIKE '%database%') AND (tag = 'team/pulse' OR name LIKE '%pulse%')`,
			expectedSQL: `
				(
					EXISTS (
						SELECT 1 FROM tag_relations tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.entity_id = dashboard.id AND t.name IN (?, ?, ?)
					)
					OR json_extract("dashboard"."data", '$.data.display.name') LIKE ?
				)
				AND (
					EXISTS (
						SELECT 1 FROM tag_relations tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.entity_id = dashboard.id AND t.name = ?
					)
					OR json_extract("dashboard"."data", '$.data.display.name') LIKE ?
				)`,
			expectedArgs: []any{"sql", "redis", "mongo", "%database%", "team/pulse", "%pulse%"},
		},
	})
}

func TestCompile_Rejections(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:              "rejects unknown key",
			dslQueryToCompile:        `foo = 'bar'`,
			expectedErrShouldContain: "unknown key",
		},
		{
			subtestName:              "rejects op outside per-key allowlist",
			dslQueryToCompile:        `name BETWEEN 'a' AND 'z'`,
			expectedErrShouldContain: "operator",
		},
		{
			subtestName:              "rejects non-bool on locked",
			dslQueryToCompile:        `locked = 'yes'`,
			expectedErrShouldContain: "boolean",
		},
		{
			subtestName:              "rejects non-RFC3339 timestamp",
			dslQueryToCompile:        `created_at >= 'not-a-date'`,
			expectedErrShouldContain: "RFC3339",
		},
		{
			subtestName:              "rejects REGEXP — not yet supported",
			dslQueryToCompile:        `name REGEXP '.*'`,
			expectedErrShouldContain: "REGEXP",
		},
		{
			subtestName:              "rejects syntax error from grammar",
			dslQueryToCompile:        `name = `,
			expectedErrShouldContain: "syntax",
		},
	})
}

func formatter(t *testing.T) sqlstore.SQLFormatter {
	t.Helper()
	p := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	return p.Formatter()
}

func normalizeSQL(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	s = strings.ReplaceAll(s, "( ", "(")
	s = strings.ReplaceAll(s, " )", ")")
	return s
}
