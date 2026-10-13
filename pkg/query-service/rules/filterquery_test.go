package rules

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
			out, err := CompileListFilter(c.dslQueryToCompile, formatter(t))

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
					// Equal instants can differ in *Location, so compare via .Equal() instead of DeepEqual.
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
		{subtestName: "EmptyQuery_Nil", dslQueryToCompile: "", emptyQueryExpected: true},
		{subtestName: "WhitespaceQuery_Nil", dslQueryToCompile: "   ", emptyQueryExpected: true},
	})
}

func TestCompileName(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "NameEquals_MatchesReservedOrLabel",
			dslQueryToCompile: "name = 'payment latency'",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') = ? OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') = ?)`,
			expectedArgs:      []any{"payment latency", "payment latency"},
		},
		{
			subtestName:       "NameContains_EscapesWildcardsBothSides",
			dslQueryToCompile: "name CONTAINS '50%'",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\')`,
			expectedArgs:      []any{`%50\%%`, `%50\%%`},
		},
		{
			subtestName:       "NameILike",
			dslQueryToCompile: "name ILIKE 'Prod%'",
			expectedSQL:       `(lower(json_extract("rule"."data", '$.alert')) LIKE LOWER(?) ESCAPE '\' OR lower(COALESCE(json_extract("rule"."data", '$.labels."name"'), '')) LIKE LOWER(?) ESCAPE '\')`,
			expectedArgs:      []any{"Prod%", "Prod%"},
		},
		{
			subtestName:       "NameInList",
			dslQueryToCompile: "name IN ['a', 'b']",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') IN (?, ?) OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') IN (?, ?))`,
			expectedArgs:      []any{"a", "b", "a", "b"},
		},
		{
			subtestName:       "NameNotEquals_ExcludesBoth",
			dslQueryToCompile: "name != 'x'",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') <> ? AND COALESCE(json_extract("rule"."data", '$.labels."name"'), '') <> ?)`,
			expectedArgs:      []any{"x", "x"},
		},
		{
			subtestName:       "NameExists_LabelOnly",
			dslQueryToCompile: "name EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."name"') IS NOT NULL`,
		},
		{
			subtestName:              "RangeOperatorOnName_Rejected",
			dslQueryToCompile:        "name > 'x'",
			expectedErrShouldContain: `operator > is not allowed for key "name"`,
		},
		{
			subtestName:              "RegexpOnName_Rejected",
			dslQueryToCompile:        "name REGEXP 'x.*'",
			expectedErrShouldContain: `operator REGEXP is not allowed for key "name"`,
		},
	})
}

func TestCompileSeverityAndLabels(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "SeverityEquals_TargetsLabelsMap",
			dslQueryToCompile: "severity = 'critical'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') = ?`,
			expectedArgs:      []any{"critical"},
		},
		{
			subtestName:       "SeverityNotEquals_MissingLabelAsEmptyString",
			dslQueryToCompile: "severity != 'critical'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') <> ?`,
			expectedArgs:      []any{"critical"},
		},
		{
			subtestName:       "SeverityNotEqualsEmpty_ExcludesRulesWithoutSeverity",
			dslQueryToCompile: "severity != ''",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') <> ?`,
			expectedArgs:      []any{""},
		},
		{
			subtestName:       "SeverityExists_ThroughAlias",
			dslQueryToCompile: "severity EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."severity"') IS NOT NULL`,
		},
		{
			subtestName:       "SeverityNotExists_ThroughAlias",
			dslQueryToCompile: "severity NOT EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."severity"') IS NULL`,
		},
		{
			subtestName:       "LabelEquals",
			dslQueryToCompile: "labels.team = 'infra'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."team"'), '') = ?`,
			expectedArgs:      []any{"infra"},
		},
		{
			subtestName:       "DottedLabelKey_OneMapEntry",
			dslQueryToCompile: "labels.k8s.cluster = 'prod-1'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."k8s.cluster"'), '') = ?`,
			expectedArgs:      []any{"prod-1"},
		},
		{
			subtestName:       "LabelKey_CaseSensitive",
			dslQueryToCompile: "labels.Team = 'infra'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."Team"'), '') = ?`,
			expectedArgs:      []any{"infra"},
		},
		{
			subtestName:       "LabelExists",
			dslQueryToCompile: "labels.team EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."team"') IS NOT NULL`,
		},
		{
			subtestName:       "LabelNotExists",
			dslQueryToCompile: "labels.team NOT EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."team"') IS NULL`,
		},
		{
			subtestName:       "LabelNotContains_IncludesLabelLessRules",
			dslQueryToCompile: "labels.team NOT CONTAINS 'infra'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."team"'), '') NOT LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{"%infra%"},
		},
		{
			subtestName:       "LabelNotIn_IncludesLabelLessRules",
			dslQueryToCompile: "labels.team NOT IN ['a', 'b']",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."team"'), '') NOT IN (?, ?)`,
			expectedArgs:      []any{"a", "b"},
		},
	})
}

func TestCompileEnums(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "AlertTypeEquals_MatchesEnumOrLabel",
			dslQueryToCompile: "alert_type = 'LOGS_BASED_ALERT'",
			expectedSQL:       `(json_extract("rule"."data", '$.alertType') = ? OR COALESCE(json_extract("rule"."data", '$.labels."alert_type"'), '') = ?)`,
			expectedArgs:      []any{"LOGS_BASED_ALERT", "LOGS_BASED_ALERT"},
		},
		{
			subtestName:       "RuleTypeInList",
			dslQueryToCompile: "rule_type IN ['threshold_rule', 'promql_rule']",
			expectedSQL:       `(json_extract("rule"."data", '$.ruleType') IN (?, ?) OR COALESCE(json_extract("rule"."data", '$.labels."rule_type"'), '') IN (?, ?))`,
			expectedArgs:      []any{"threshold_rule", "promql_rule", "threshold_rule", "promql_rule"},
		},
		{
			subtestName:              "InvalidAlertTypeValue_Rejected",
			dslQueryToCompile:        "alert_type = 'bogus'",
			expectedErrShouldContain: `invalid value "bogus" for "alert_type"`,
		},
		{
			subtestName:       "ContainsOnRuleType_LabelOnly",
			dslQueryToCompile: "rule_type CONTAINS 'thresh'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."rule_type"'), '') LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{"%thresh%"},
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
			subtestName:       "CreatedByEquals_MatchesColumnOrLabel",
			dslQueryToCompile: "created_by = 'nikhil@signoz.io'",
			expectedSQL:       `(rule.created_by = ? OR COALESCE(json_extract("rule"."data", '$.labels."created_by"'), '') = ?)`,
			expectedArgs:      []any{"nikhil@signoz.io", "nikhil@signoz.io"},
		},
		{
			subtestName:       "CreatedAtRange",
			dslQueryToCompile: "created_at >= '2026-01-02T15:04:05Z'",
			expectedSQL:       `rule.created_at >= ?`,
			expectedArgs:      []any{createdAt},
		},
		{
			subtestName:       "UpdatedAtBetween",
			dslQueryToCompile: "updated_at BETWEEN '2026-02-01T00:00:00Z' AND '2026-03-01T00:00:00Z'",
			expectedSQL:       `rule.updated_at BETWEEN ? AND ?`,
			expectedArgs:      []any{updatedFrom, updatedTo},
		},
		{
			subtestName:              "NonTimestampOnCreatedAt_Rejected",
			dslQueryToCompile:        "created_at >= 'yesterday'",
			expectedErrShouldContain: "invalid RFC3339 timestamp",
		},
	})
}

func TestCompileFreeText(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "BareWord_SearchesNameDescriptionLabels",
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
			subtestName:       "AndOfLabelAndColumn",
			dslQueryToCompile: "labels.team = 'infra' AND created_by = 'x'",
			expectedSQL: `(COALESCE(json_extract("rule"."data", '$.labels."team"'), '') = ? ` +
				`AND (rule.created_by = ? OR COALESCE(json_extract("rule"."data", '$.labels."created_by"'), '') = ?))`,
			expectedArgs: []any{"infra", "x", "x"},
		},
		{
			subtestName:       "Not_WrapsInnerPredicate",
			dslQueryToCompile: "NOT (name = 'x')",
			expectedSQL:       `NOT ((json_extract("rule"."data", '$.alert') = ? OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') = ?))`,
			expectedArgs:      []any{"x", "x"},
		},
		{
			subtestName:       "OrOfNameAndSeverity",
			dslQueryToCompile: "name CONTAINS 'pay' OR severity = 'critical'",
			expectedSQL: `((json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\') ` +
				`OR COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') = ?)`,
			expectedArgs: []any{"%pay%", "%pay%", "critical"},
		},
	})
}

func TestCompileComplexExamples(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName: "NameContains_LabelEquals_SeverityIn_CreatedByNotEquals",
			dslQueryToCompile: `name CONTAINS 'latency' AND labels.team = 'payments' ` +
				`AND severity IN ['critical', 'error'] AND created_by != 'ops@signoz.io'`,
			expectedSQL: `((json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\') ` +
				`AND COALESCE(json_extract("rule"."data", '$.labels."team"'), '') = ? ` +
				`AND COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') IN (?, ?) ` +
				`AND (rule.created_by <> ? AND COALESCE(json_extract("rule"."data", '$.labels."created_by"'), '') <> ?))`,
			expectedArgs: []any{"%latency%", "%latency%", "payments", "critical", "error", "ops@signoz.io", "ops@signoz.io"},
		},
		{
			subtestName: "NestedOrAnd_WithParens",
			dslQueryToCompile: `(labels.env IN ['prod', 'staging'] OR name LIKE '%prod%') ` +
				`AND (severity = 'critical' OR labels.team EXISTS)`,
			expectedSQL: `((COALESCE(json_extract("rule"."data", '$.labels."env"'), '') IN (?, ?) ` +
				`OR (json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\')) ` +
				`AND (COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') = ? ` +
				`OR json_extract("rule"."data", '$.labels."team"') IS NOT NULL))`,
			expectedArgs: []any{"prod", "staging", "%prod%", "%prod%", "critical"},
		},
		{
			subtestName:       "NotOverGroup_AndedWithEnum",
			dslQueryToCompile: `NOT (labels.team = 'infra' OR name CONTAINS 'cpu') AND alert_type = 'METRIC_BASED_ALERT'`,
			expectedSQL: `(NOT ((COALESCE(json_extract("rule"."data", '$.labels."team"'), '') = ? ` +
				`OR (json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\'))) ` +
				`AND (json_extract("rule"."data", '$.alertType') = ? OR COALESCE(json_extract("rule"."data", '$.labels."alert_type"'), '') = ?))`,
			expectedArgs: []any{"infra", "%cpu%", "%cpu%", "METRIC_BASED_ALERT", "METRIC_BASED_ALERT"},
		},
		{
			subtestName: "FreeText_ThreeLevelNesting_Timestamp",
			dslQueryToCompile: `prod AND (name ILIKE '%pay%' ` +
				`OR (labels.team != 'infra' AND updated_at > '2026-01-02T15:04:05Z'))`,
			expectedSQL: `((lower(COALESCE(json_extract("rule"."data", '$.alert'), '')) LIKE LOWER(?) ESCAPE '\' ` +
				`OR lower(COALESCE(json_extract("rule"."data", '$.description'), '')) LIKE LOWER(?) ESCAPE '\' ` +
				`OR lower(COALESCE(json_extract("rule"."data", '$.labels'), '')) LIKE LOWER(?) ESCAPE '\') ` +
				`AND ((lower(json_extract("rule"."data", '$.alert')) LIKE LOWER(?) ESCAPE '\' ` +
				`OR lower(COALESCE(json_extract("rule"."data", '$.labels."name"'), '')) LIKE LOWER(?) ESCAPE '\') ` +
				`OR (COALESCE(json_extract("rule"."data", '$.labels."team"'), '') <> ? AND rule.updated_at > ?)))`,
			expectedArgs: []any{"%prod%", "%prod%", "%prod%", "%pay%", "%pay%", "infra",
				time.Date(2026, 1, 2, 15, 4, 5, 0, time.UTC)},
		},
	})
}

func TestCompileBareLabelKeys(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "BareKey_LabelMatch",
			dslQueryToCompile: "team = 'infra'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."team"'), '') = ?`,
			expectedArgs:      []any{"infra"},
		},
		{
			subtestName:       "BareKey_CaseSensitive",
			dslQueryToCompile: "Team CONTAINS 'inf'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."Team"'), '') LIKE ? ESCAPE '\'`,
			expectedArgs:      []any{"%inf%"},
		},
		{
			subtestName:       "BareKeyExists",
			dslQueryToCompile: "env EXISTS",
			expectedSQL:       `json_extract("rule"."data", '$.labels."env"') IS NOT NULL`,
		},
		{
			subtestName:       "State_LabelLookupNotRuleState",
			dslQueryToCompile: "state = 'firing'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."state"'), '') = ?`,
			expectedArgs:      []any{"firing"},
		},
	})
}

func TestCompileReservedLabelCollisions(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "UppercaseReservedKey_MatchesReservedOrExactCaseLabel",
			dslQueryToCompile: "NAME = 'x'",
			expectedSQL:       `(json_extract("rule"."data", '$.alert') = ? OR COALESCE(json_extract("rule"."data", '$.labels."NAME"'), '') = ?)`,
			expectedArgs:      []any{"x", "x"},
		},
		{
			subtestName:       "SeverityExactSpelling_SinglePredicate",
			dslQueryToCompile: "severity = 'critical'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') = ?`,
			expectedArgs:      []any{"critical"},
		},
		{
			subtestName:       "SeverityDifferentCase_MatchesBothLabelSpellings",
			dslQueryToCompile: "Severity = 'critical'",
			expectedSQL: `(COALESCE(json_extract("rule"."data", '$.labels."severity"'), '') = ? ` +
				`OR COALESCE(json_extract("rule"."data", '$.labels."Severity"'), '') = ?)`,
			expectedArgs: []any{"critical", "critical"},
		},
		{
			subtestName:       "RangeOperator_ReservedOnly",
			dslQueryToCompile: "created_at >= '2026-01-02T15:04:05Z'",
			expectedSQL:       `rule.created_at >= ?`,
			expectedArgs:      []any{time.Date(2026, 1, 2, 15, 4, 5, 0, time.UTC)},
		},
		{
			subtestName:       "LabelsPrefix_LabelOnlyOnCollision",
			dslQueryToCompile: "labels.name = 'x'",
			expectedSQL:       `COALESCE(json_extract("rule"."data", '$.labels."name"'), '') = ?`,
			expectedArgs:      []any{"x"},
		},
		{
			subtestName:       "NotIn_ExcludesBoth",
			dslQueryToCompile: "created_by NOT IN ['a', 'b']",
			expectedSQL: `(rule.created_by NOT IN (?, ?) ` +
				`AND COALESCE(json_extract("rule"."data", '$.labels."created_by"'), '') NOT IN (?, ?))`,
			expectedArgs: []any{"a", "b", "a", "b"},
		},
	})
}

func TestCompileErrors(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:              "RangeOperatorOnBareLabelKey_Rejected",
			dslQueryToCompile:        "team > 'infra'",
			expectedErrShouldContain: `operator > is not allowed on the label filter "team"`,
		},
		{
			subtestName:              "SyntaxError_SurfacesPosition",
			dslQueryToCompile:        "created_by ==== (((",
			expectedErrShouldContain: "syntax error",
		},
		{
			subtestName:              "LikeDanglingEscape_Rejected",
			dslQueryToCompile:        `name LIKE 'prod\\'`,
			expectedErrShouldContain: "must not end with an unescaped backslash",
		},
		{
			subtestName:              "ILikeDanglingEscape_Rejected",
			dslQueryToCompile:        `name ILIKE '%\\'`,
			expectedErrShouldContain: "must not end with an unescaped backslash",
		},
		{
			subtestName:              "LabelLikeDanglingEscape_Rejected",
			dslQueryToCompile:        `labels.team NOT LIKE 'infra\\'`,
			expectedErrShouldContain: "must not end with an unescaped backslash",
		},
	})
}

func TestCompileTrailingLiteralBackslash(t *testing.T) {
	runCompileCases(t, []compileCase{
		{
			subtestName:       "EscapedTrailingBackslash_Compiles",
			dslQueryToCompile: `name LIKE '%\\\\'`,
			expectedSQL:       `(json_extract("rule"."data", '$.alert') LIKE ? ESCAPE '\' OR COALESCE(json_extract("rule"."data", '$.labels."name"'), '') LIKE ? ESCAPE '\')`,
			expectedArgs:      []any{`%\\`, `%\\`},
		},
	})
}

// Guards that every ruletypes.ReservedOps key has a case in resolveReservedKey.
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
		require.True(t, ok, "no sample query for reserved key %q, add one", key)

		out, err := CompileListFilter(query, formatter(t))
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
