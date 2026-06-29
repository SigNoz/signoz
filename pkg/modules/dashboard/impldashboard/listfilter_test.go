package impldashboard

import (
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

type compileCase struct {
	subtestName              string
	dslQueryToCompile        string
	emptyQueryExpected       bool
	expectedSQL              string
	expectedArgs             []any
	expectedErrShouldContain string
}

// kindArg is the tag_relation.kind value bound into every tag EXISTS subquery
// (stored double-encoded, hence the embedded quotes). It leads each tag
// predicate's args, ahead of the tag key.
const kindArg = `"dashboard"`

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
			if c.emptyQueryExpected {
				assert.True(t, out.IsEmpty())
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
		{subtestName: "empty query yields nil", dslQueryToCompile: "", emptyQueryExpected: true},
	})
}

func TestCompile_Name(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "name =",
			dslQueryToCompile: `name = 'overview'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.spec.display.name') = ?`,
			expectedArgs:      []any{"overview"},
		},
		{
			// QUOTED_TEXT in the grammar covers both '…' and "…" — visitor
			// strips whichever quote pair surrounds the value.
			subtestName:       "name = with double-quoted value",
			dslQueryToCompile: `name = "something"`,
			expectedSQL:       `json_extract("dashboard"."data", '$.spec.display.name') = ?`,
			expectedArgs:      []any{"something"},
		},
		{
			subtestName:       "name CONTAINS",
			dslQueryToCompile: `name CONTAINS 'overview'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{"%overview%"},
		},
		{
			subtestName:       "name ILIKE — emitted as LOWER(col) LIKE LOWER(?) for dialect parity",
			dslQueryToCompile: `name ILIKE 'Prod%'`,
			expectedSQL:       `lower(json_extract("dashboard"."data", '$.spec.display.name')) LIKE LOWER(?) ESCAPE '\'`,
			expectedArgs:      []any{"Prod%"},
		},
		{
			subtestName:       "CONTAINS escapes % in user input",
			dslQueryToCompile: `name CONTAINS '50%'`,
			expectedSQL:       `json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{`%50\%%`},
		},
	})
}

func TestCompile_CreatedByLocked(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "created_by LIKE",
			dslQueryToCompile: `created_by LIKE '%@signoz.io'`,
			expectedSQL:       `dashboard.created_by LIKE ? ESCAPE '\'`,
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

// Tag operators wrap each predicate in EXISTS / NOT EXISTS. Any non-reserved
// key is a tag key — `team = 'pulse'` matches a tag with key=team value=pulse,
// `tag = 'prod'` matches a tag with key=tag value=prod, and so on.
func TestCompile_Tag(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "team = wraps in EXISTS",
			dslQueryToCompile: `team = 'pulse'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value = ?
				)`,
			expectedArgs: []any{kindArg, "team", "pulse"},
		},
		{
			subtestName:       "tag = is just a regular tag-key filter",
			dslQueryToCompile: `tag = 'database'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value = ?
				)`,
			expectedArgs: []any{kindArg, "tag", "database"},
		},
		{
			subtestName:       "team != wraps in NOT EXISTS with positive inner",
			dslQueryToCompile: `team != 'pulse'`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value = ?
				)`,
			expectedArgs: []any{kindArg, "team", "pulse"},
		},
		{
			subtestName:       "team IN — inner is single placeholder list on t.value",
			dslQueryToCompile: `team IN ['pulse', 'events']`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value IN (?, ?)
				)`,
			expectedArgs: []any{kindArg, "team", "pulse", "events"},
		},
		{
			subtestName:       "team NOT IN",
			dslQueryToCompile: `team NOT IN ['pulse', 'events']`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value IN (?, ?)
				)`,
			expectedArgs: []any{kindArg, "team", "pulse", "events"},
		},
		{
			subtestName:       "team LIKE — wildcard on value",
			dslQueryToCompile: `team LIKE 'pulse%'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value LIKE ? ESCAPE '\'
				)`,
			expectedArgs: []any{kindArg, "team", "pulse%"},
		},
		{
			subtestName:       "team NOT LIKE",
			dslQueryToCompile: `team NOT LIKE 'staging%'`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value LIKE ? ESCAPE '\'
				)`,
			expectedArgs: []any{kindArg, "team", "staging%"},
		},
		{
			subtestName:       "database EXISTS — asserts a tag with key=database is present",
			dslQueryToCompile: `database EXISTS`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
				)`,
			expectedArgs: []any{kindArg, "database"},
		},
		{
			subtestName:       "database NOT EXISTS",
			dslQueryToCompile: `database NOT EXISTS`,
			expectedSQL: `
				NOT EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
				)`,
			expectedArgs: []any{kindArg, "database"},
		},
		{
			subtestName:       "tag-key matching is case-insensitive — TEAM lowercased",
			dslQueryToCompile: `TEAM = 'pulse'`,
			expectedSQL: `
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value = ?
				)`,
			expectedArgs: []any{kindArg, "team", "pulse"},
		},
	})
}

func TestCompile_BooleanComposition(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "AND chain — flat arg list",
			dslQueryToCompile: `locked = true AND created_by = 'a@b.com'`,
			expectedSQL:       `(dashboard.locked = ? AND dashboard.created_by = ?)`,
			expectedArgs:      []any{true, "a@b.com"},
		},
		{
			subtestName:       "OR chain",
			dslQueryToCompile: `locked = true OR created_by = 'a@b.com'`,
			expectedSQL:       `(dashboard.locked = ? OR dashboard.created_by = ?)`,
			expectedArgs:      []any{true, "a@b.com"},
		},
		{
			subtestName:       "parens preserve precedence",
			dslQueryToCompile: `(locked = true OR locked = false) AND created_by = 'a@b.com'`,
			expectedSQL:       `((dashboard.locked = ? OR dashboard.locked = ?) AND dashboard.created_by = ?)`,
			expectedArgs:      []any{true, false, "a@b.com"},
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
			expectedSQL:       `NOT (json_extract("dashboard"."data", '$.spec.display.name') = ?)`,
			expectedArgs:      []any{"foo"},
		},
		{
			subtestName:       "NOT binds tightly to its primary in an AND chain",
			dslQueryToCompile: `NOT name = 'foo' AND created_by = 'alice'`,
			expectedSQL:       `(NOT (json_extract("dashboard"."data", '$.spec.display.name') = ?) AND dashboard.created_by = ?)`,
			expectedArgs:      []any{"foo", "alice"},
		},
		{
			subtestName:       "NOT applied to the second term in an AND chain",
			dslQueryToCompile: `locked = true AND NOT name = 'foo'`,
			expectedSQL:       `(dashboard.locked = ? AND NOT (json_extract("dashboard"."data", '$.spec.display.name') = ?))`,
			expectedArgs:      []any{true, "foo"},
		},
		{
			subtestName:       "NOT around a parenthesized OR",
			dslQueryToCompile: `NOT (locked = true OR created_by = 'a@b.com')`,
			expectedSQL:       `NOT ((dashboard.locked = ? OR dashboard.created_by = ?))`,
			expectedArgs:      []any{true, "a@b.com"},
		},
		{
			subtestName:       "double NOT via parens",
			dslQueryToCompile: `NOT (NOT name = 'foo')`,
			expectedSQL:       `NOT (NOT (json_extract("dashboard"."data", '$.spec.display.name') = ?))`,
			expectedArgs:      []any{"foo"},
		},
		{
			subtestName:       "NOT on a tag equality",
			dslQueryToCompile: `NOT team = 'pulse'`,
			expectedSQL: `
				NOT (
					EXISTS (
						SELECT 1 FROM tag_relation tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.kind = ? AND tr.resource_id = dashboard.id
						AND LOWER(t.key) = LOWER(?)
						AND t.value = ?
					)
				)`,
			expectedArgs: []any{kindArg, "team", "pulse"},
		},
		{
			subtestName:       "NOT team = ... AND name = ...",
			dslQueryToCompile: `NOT team = 'pulse' AND name = 'overview'`,
			expectedSQL: `
				(
				NOT (
					EXISTS (
						SELECT 1 FROM tag_relation tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.kind = ? AND tr.resource_id = dashboard.id
						AND LOWER(t.key) = LOWER(?)
						AND t.value = ?
					)
				)
				AND json_extract("dashboard"."data", '$.spec.display.name') = ?)`,
			expectedArgs: []any{kindArg, "team", "pulse", "overview"},
		},
	})
}

func TestCompile_ComplexExamples(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "name CONTAINS + tag LIKE + created_by + database =",
			dslQueryToCompile: `name CONTAINS 'overview' AND tag LIKE 'prod%' AND created_by = 'naman.verma@signoz.io' AND database = 'mongo'`,
			expectedSQL: `
				(
				json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'
				AND EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value LIKE ? ESCAPE '\'
				)
				AND dashboard.created_by = ?
				AND EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value = ?
				))`,
			expectedArgs: []any{"%overview%", kindArg, "tag", "prod%", "naman.verma@signoz.io", kindArg, "database", "mongo"},
		},
		{
			subtestName:       "team IN AND database EXISTS",
			dslQueryToCompile: `team IN ['pulse', 'events'] AND database EXISTS`,
			expectedSQL: `
				(
				EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
					AND t.value IN (?, ?)
				)
				AND EXISTS (
					SELECT 1 FROM tag_relation tr
					JOIN tag t ON t.id = tr.tag_id
					WHERE tr.kind = ? AND tr.resource_id = dashboard.id
					AND LOWER(t.key) = LOWER(?)
				))`,
			expectedArgs: []any{kindArg, "team", "pulse", "events", kindArg, "database"},
		},
		{
			subtestName:       "nested OR / AND with parens",
			dslQueryToCompile: `(database IN ['sql', 'redis', 'mongo'] OR name LIKE '%database%') AND (team = 'pulse' OR name LIKE '%pulse%')`,
			expectedSQL: `
				(
				(
					EXISTS (
						SELECT 1 FROM tag_relation tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.kind = ? AND tr.resource_id = dashboard.id
						AND LOWER(t.key) = LOWER(?)
						AND t.value IN (?, ?, ?)
					)
					OR json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'
				)
				AND (
					EXISTS (
						SELECT 1 FROM tag_relation tr
						JOIN tag t ON t.id = tr.tag_id
						WHERE tr.kind = ? AND tr.resource_id = dashboard.id
						AND LOWER(t.key) = LOWER(?)
						AND t.value = ?
					)
					OR json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'
				))`,
			expectedArgs: []any{kindArg, "database", "sql", "redis", "mongo", "%database%", kindArg, "team", "pulse", "%pulse%"},
		},
	})
}

func TestCompile_Rejections(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:              "rejects op outside per-reserved-key allowlist",
			dslQueryToCompile:        `name BETWEEN 'a' AND 'z'`,
			expectedErrShouldContain: "operator",
		},
		{
			subtestName:              "rejects BETWEEN on a tag key",
			dslQueryToCompile:        `team BETWEEN 'a' AND 'z'`,
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

// Every key in dashboardtypes.ReservedOps must have a matching case in
// visitComparisonForReservedKeys; a key that's reserved but unhandled falls
// through to the "no handler for reserved key" error. Equal is accepted by all
// reserved keys, so `key = 'x'` always reaches the dispatch switch — a missing
// handler surfaces as that error regardless of whether the value type-checks.
func TestCompileReservedKeysAllHandled(t *testing.T) {
	for key := range dashboardtypes.ReservedOps {
		t.Run(string(key), func(t *testing.T) {
			_, err := Compile(string(key)+` = 'x'`, formatter(t))
			if err != nil {
				assert.NotContains(t, err.Error(), "no handler for reserved key",
					"reserved key %q has no handler in visitComparisonForReservedKeys", key)
			}
		})
	}
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
