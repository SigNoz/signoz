package sqlrulestore

import (
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

type compileCase struct {
	subtestName              string
	dslQueryToCompile        string
	emptyQueryExpected       bool
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

func TestCompileEmpty(t *testing.T) {
	runCompileCases(t, []compileCase{
		{subtestName: "empty query yields nil", dslQueryToCompile: "", emptyQueryExpected: true},
		{subtestName: "whitespace query yields nil", dslQueryToCompile: "   ", emptyQueryExpected: true},
	})
}

func TestCompileName(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "name equals",
			dslQueryToCompile: "name = 'payment latency'",
			expectedSQL:       `json_extract("rule"."data", '$.alert') = ?`,
			expectedArgs:      []any{"payment latency"},
		},
		{
			subtestName:       "name contains escapes wildcards",
			dslQueryToCompile: "name CONTAINS '50%'",
			expectedSQL:       `json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{`%50\%%`},
		},
		{
			subtestName:       "name ilike",
			dslQueryToCompile: "name ILIKE 'Prod%'",
			expectedSQL:       `lower(json_extract("rule"."data", '$.alert')) LIKE LOWER(?) ESCAPE '\'`,
			expectedArgs:      []any{"Prod%"},
		},
		{
			subtestName:       "name in list",
			dslQueryToCompile: "name IN ['a', 'b']",
			expectedSQL:       `json_extract("rule"."data", '$.alert') IN (?, ?)`,
			expectedArgs:      []any{"a", "b"},
		},
		{
			subtestName:              "range operator rejected on name",
			dslQueryToCompile:        "name > 'x'",
			expectedErrShouldContain: `operator > is not allowed for key "name"`,
		},
		{
			subtestName:              "regexp rejected on name",
			dslQueryToCompile:        "name REGEXP 'x.*'",
			expectedErrShouldContain: `operator REGEXP is not allowed for key "name"`,
		},
	})
}

func TestCompileSeverityAndLabels(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "severity equals targets labels map",
			dslQueryToCompile: "severity = 'critical'",
			expectedSQL:       `json_extract("rule"."data", '$.labels."severity"') = ?`,
			expectedArgs:      []any{"critical"},
		},
		{
			subtestName:       "severity negation includes rules without severity",
			dslQueryToCompile: "severity != 'critical'",
			expectedSQL:       `(json_extract("rule"."data", '$.labels."severity"') IS NULL OR json_extract("rule"."data", '$.labels."severity"') <> ?)`,
			expectedArgs:      []any{"critical"},
		},
		{
			subtestName:       "label equals",
			dslQueryToCompile: "labels.team = 'infra'",
			expectedSQL:       `json_extract("rule"."data", '$.labels."team"') = ?`,
			expectedArgs:      []any{"infra"},
		},
		{
			subtestName:       "dotted label key is one map entry",
			dslQueryToCompile: "labels.k8s.cluster = 'prod-1'",
			expectedSQL:       `json_extract("rule"."data", '$.labels."k8s.cluster"') = ?`,
			expectedArgs:      []any{"prod-1"},
		},
		{
			subtestName:       "label key keeps its case",
			dslQueryToCompile: "labels.Team = 'infra'",
			expectedSQL:       `json_extract("rule"."data", '$.labels."Team"') = ?`,
			expectedArgs:      []any{"infra"},
		},
		{
			subtestName:       "label exists",
			dslQueryToCompile: "labels.team EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."team"') IS NOT NULL`,
		},
		{
			subtestName:       "label not exists",
			dslQueryToCompile: "labels.team NOT EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."team"') IS NULL`,
		},
		{
			subtestName:       "label not contains includes label-less rules",
			dslQueryToCompile: "labels.team NOT CONTAINS 'infra'",
			expectedSQL:       `(json_extract("rule"."data", '$.labels."team"') IS NULL OR json_extract("rule"."data", '$.labels."team"') NOT LIKE ? ESCAPE '\')`,
			expectedArgs:      []any{"%infra%"},
		},
		{
			subtestName:       "label not in includes label-less rules",
			dslQueryToCompile: "labels.team NOT IN ['a', 'b']",
			expectedSQL:       `(json_extract("rule"."data", '$.labels."team"') IS NULL OR json_extract("rule"."data", '$.labels."team"') NOT IN (?, ?))`,
			expectedArgs:      []any{"a", "b"},
		},
	})
}

func TestCompileEnums(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "alert_type equals",
			dslQueryToCompile: "alert_type = 'LOGS_BASED_ALERT'",
			expectedSQL:       `json_extract("rule"."data", '$.alertType') = ?`,
			expectedArgs:      []any{"LOGS_BASED_ALERT"},
		},
		{
			subtestName:       "rule_type in list",
			dslQueryToCompile: "rule_type IN ['threshold_rule', 'promql_rule']",
			expectedSQL:       `json_extract("rule"."data", '$.ruleType') IN (?, ?)`,
			expectedArgs:      []any{"threshold_rule", "promql_rule"},
		},
		{
			subtestName:              "invalid alert_type value rejected",
			dslQueryToCompile:        "alert_type = 'bogus'",
			expectedErrShouldContain: `invalid value "bogus" for "alert_type"`,
		},
		{
			subtestName:              "contains rejected on rule_type",
			dslQueryToCompile:        "rule_type CONTAINS 'thresh'",
			expectedErrShouldContain: `operator CONTAINS is not allowed for key "rule_type"`,
		},
	})
}

func TestCompileAuditColumns(t *testing.T) {
	createdAt, err := time.Parse(time.RFC3339, "2026-01-02T15:04:05Z")
	require.NoError(t, err)
	updatedFrom, err := time.Parse(time.RFC3339, "2026-02-01T00:00:00Z")
	require.NoError(t, err)
	updatedTo, err := time.Parse(time.RFC3339, "2026-03-01T00:00:00Z")
	require.NoError(t, err)

	runCompileCases(t, []compileCase{
		{
			subtestName:       "created_by equals",
			dslQueryToCompile: "created_by = 'nikhil@signoz.io'",
			expectedSQL:       `rule.created_by = ?`,
			expectedArgs:      []any{"nikhil@signoz.io"},
		},
		{
			subtestName:       "created_at range",
			dslQueryToCompile: "created_at >= '2026-01-02T15:04:05Z'",
			expectedSQL:       `rule.created_at >= ?`,
			expectedArgs:      []any{createdAt},
		},
		{
			subtestName:       "updated_at between",
			dslQueryToCompile: "updated_at BETWEEN '2026-02-01T00:00:00Z' AND '2026-03-01T00:00:00Z'",
			expectedSQL:       `rule.updated_at BETWEEN ? AND ?`,
			expectedArgs:      []any{updatedFrom, updatedTo},
		},
		{
			subtestName:              "non-timestamp rejected on created_at",
			dslQueryToCompile:        "created_at >= 'yesterday'",
			expectedErrShouldContain: "invalid RFC3339 timestamp",
		},
	})
}

func TestCompileFreeText(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "bare word searches name, description and labels",
			dslQueryToCompile: "payment",
			expectedSQL: `(lower(COALESCE(json_extract("rule"."data", '$.alert'), '')) LIKE LOWER(?) ESCAPE '\' ` +
				`OR lower(COALESCE(json_extract("rule"."data", '$.description'), '')) LIKE LOWER(?) ESCAPE '\' ` +
				`OR lower(COALESCE(json_extract("rule"."data", '$.labels'), '')) LIKE LOWER(?) ESCAPE '\')`,
			expectedArgs: []any{"%payment%", "%payment%", "%payment%"},
		},
	})
}

func TestCompileComposition(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "and of label and column",
			dslQueryToCompile: "labels.team = 'infra' AND created_by = 'x'",
			expectedSQL:       `(json_extract("rule"."data", '$.labels."team"') = ? AND rule.created_by = ?)`,
			expectedArgs:      []any{"infra", "x"},
		},
		{
			subtestName:       "not wraps the inner predicate",
			dslQueryToCompile: "NOT (name = 'x')",
			expectedSQL:       `NOT (json_extract("rule"."data", '$.alert') = ?)`,
			expectedArgs:      []any{"x"},
		},
		{
			subtestName:       "or of name and severity",
			dslQueryToCompile: "name CONTAINS 'pay' OR severity = 'critical'",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR json_extract("rule"."data", '$.labels."severity"') = ?)`,
			expectedArgs:      []any{"%pay%", "critical"},
		},
	})
}

func TestCompileErrors(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:              "unknown key rejected instead of matching nothing",
			dslQueryToCompile:        "team = 'infra'",
			expectedErrShouldContain: `unknown filter key "team"`,
		},
		{
			subtestName:              "state is not a DSL key",
			dslQueryToCompile:        "state = 'firing'",
			expectedErrShouldContain: `unknown filter key "state"`,
		},
		{
			subtestName:              "syntax error surfaces position",
			dslQueryToCompile:        "created_by ==== (((",
			expectedErrShouldContain: "syntax error",
		},
	})
}

// TestCompileReservedKeysAllHandled guards that every key in
// ruletypes.ReservedOps has a case in visitComparisonForReservedKeys.
func TestCompileReservedKeysAllHandled(t *testing.T) {
	sampleQueries := map[ruletypes.DSLKey]string{
		ruletypes.DSLKeyName:      "name = 'x'",
		ruletypes.DSLKeySeverity:  "severity = 'critical'",
		ruletypes.DSLKeyCreatedBy: "created_by = 'x'",
		ruletypes.DSLKeyUpdatedBy: "updated_by = 'x'",
		ruletypes.DSLKeyCreatedAt: "created_at >= '2026-01-02T15:04:05Z'",
		ruletypes.DSLKeyUpdatedAt: "updated_at >= '2026-01-02T15:04:05Z'",
		ruletypes.DSLKeyAlertType: "alert_type = 'METRIC_BASED_ALERT'",
		ruletypes.DSLKeyRuleType:  "rule_type = 'threshold_rule'",
	}

	for key := range ruletypes.ReservedOps {
		query, ok := sampleQueries[key]
		require.True(t, ok, "no sample query for reserved key %q — add one", key)

		out, err := Compile(query, formatter(t))
		require.NoError(t, err, "reserved key %q failed to compile", key)
		assert.False(t, out.IsEmpty(), "reserved key %q compiled to empty SQL", key)
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
