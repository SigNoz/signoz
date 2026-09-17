package logstelemetryschema

import (
	"context"
	"github.com/SigNoz/signoz/pkg/valuer"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// searchFanOut returns the WHERE fragment search() fans out to; bodyExpr differs
// between the legacy string body and the body_v2 JSON column.
func searchFanOut(bodyExpr string) string {
	return "(match(LOWER(severity_text), LOWER(?)) OR match(LOWER(trace_id), LOWER(?)) OR match(LOWER(span_id), LOWER(?)) OR " +
		bodyExpr + " OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(attributes_string))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_number)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), arrayMap(x -> toString(x), mapValues(attributes_number)))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_bool)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), arrayMap(x -> toString(x), mapValues(attributes_bool)))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(resources_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(resources_string))))"
}

// searchArgs returns v once per bound parameter search() emits — one per searchable
// column expression (currently 12).
func searchArgs(v any) []any {
	const searchColumnParams = 12
	args := make([]any, searchColumnParams)
	for i := range args {
		args[i] = v
	}
	return args
}

// TestFilterExprSearch covers search('term') fanning out across every searchable
// column via FilterOperatorSearch.
func TestFilterExprSearch(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	inWindowStart := uint64(releaseTime.Add(-5 * time.Minute).UnixNano())
	inWindowEnd := uint64(releaseTime.Add(5 * time.Minute).UnixNano())

	legacyBody := "match(LOWER(body), LOWER(?))"
	jsonBody := "match(LOWER(toString(body_v2)), LOWER(?))"

	// Single-context scope fragments (the fan-out narrowed to one context).
	logScope := "(match(LOWER(severity_text), LOWER(?)) OR match(LOWER(trace_id), LOWER(?)) OR match(LOWER(span_id), LOWER(?)))"
	resourceScope := "(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(resources_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(resources_string)))"

	// the read spans both eras and yields NULL for an absent key, so it takes no presence guard
	serviceNameEq := "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ?"

	testCases := []struct {
		name                  string
		query                 string
		jsonBodyEnabled       bool
		fullTextColumn        *telemetrytypes.TelemetryFieldKey
		startNs               uint64
		endNs                 uint64
		shouldPass            bool
		expectedQuery         string
		expectedArgs          []any
		expectWarning         bool
		expectedErrorContains string
	}{
		{
			name:           "quoted, legacy body",
			query:          "search('error')",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("error"),
			expectWarning:  true,
		},
		{
			name:            "quoted, json body",
			query:           "search('error')",
			jsonBodyEnabled: true,
			fullTextColumn:  DefaultFullTextColumn,
			startNs:         inWindowStart,
			endNs:           inWindowEnd,
			shouldPass:      true,
			expectedQuery:   "WHERE " + searchFanOut(jsonBody),
			expectedArgs:    searchArgs("error"),
			expectWarning:   true,
		},
		{
			name:           "bare word",
			query:          "search(timeout)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("timeout"),
			expectWarning:  true,
		},
		{
			name:           "negated",
			query:          "NOT search('error')",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE NOT (" + searchFanOut(legacyBody) + ")",
			expectedArgs:   searchArgs("error"),
			expectWarning:  true,
		},
		{
			name:           "combined with field filter",
			query:          "search('error') AND service.name=\"api\"",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE (" + searchFanOut(legacyBody) + " AND " + serviceNameEq + ")",
			expectedArgs:   append(searchArgs("error"), "api"),
			expectWarning:  true,
		},
		{
			// The builder caps no window; the querier's estimate gate bounds scan cost.
			name:           "wide window builds (estimate gate lives in querier)",
			query:          "search('error')",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        uint64(releaseTime.Add(-10 * time.Hour).UnixNano()),
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("error"),
			expectWarning:  true,
		},
		{
			// fullTextColumn governs only bare/quoted free text, so search() must
			// work when it is unset.
			name:           "independent of full text column",
			query:          "search('error')",
			fullTextColumn: nil,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("error"),
			expectWarning:  true,
		},
		{
			// The bare word is the literal search term; Normalize would strip "resource.".
			name:           "bare word with context prefix is not normalized",
			query:          "search(resource.deployment)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("resource\\.deployment"),
			expectWarning:  true,
		},
		{
			// Literal digits, not %v of a parsed float64 (which would scan "1e+06").
			name:           "numeric search term is not scientific notation",
			query:          "search(1000000)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + searchFanOut(legacyBody),
			expectedArgs:   searchArgs("1000000"),
			expectWarning:  true,
		},
		{
			name:           "scoped to body, legacy",
			query:          "search('error', body)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE (" + legacyBody + ")",
			expectedArgs:   []any{"error"},
			expectWarning:  true,
		},
		{
			name:            "scoped to body, json",
			query:           "search('error', body)",
			jsonBodyEnabled: true,
			fullTextColumn:  DefaultFullTextColumn,
			startNs:         inWindowStart,
			endNs:           inWindowEnd,
			shouldPass:      true,
			expectedQuery:   "WHERE (" + jsonBody + ")",
			expectedArgs:    []any{"error"},
			expectWarning:   true,
		},
		{
			name:           "scoped to resource (quoted scope)",
			query:          "search('error', 'resource')",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE (" + resourceScope + ")",
			expectedArgs:   []any{"error", "error"},
			expectWarning:  true,
		},
		{
			name:           "scoped to log fields",
			query:          "search('error', log)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE " + logScope,
			expectedArgs:   []any{"error", "error", "error"},
			expectWarning:  true,
		},
		{
			name:           "scoped to multiple contexts",
			query:          "search('error', body, resource)",
			fullTextColumn: DefaultFullTextColumn,
			startNs:        inWindowStart,
			endNs:          inWindowEnd,
			shouldPass:     true,
			expectedQuery:  "WHERE ((" + legacyBody + ") OR (" + resourceScope + "))",
			expectedArgs:   []any{"error", "error", "error"},
			expectWarning:  true,
		},
		{
			name:                  "invalid scope",
			query:                 "search('error', 'timeout')",
			fullTextColumn:        DefaultFullTextColumn,
			startNs:               inWindowStart,
			endNs:                 inWindowEnd,
			shouldPass:            false,
			expectedErrorContains: "invalid search scope",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureUseJSONBody.String(): tc.jsonBodyEnabled,
			})
			storage := NewStorage()
			keys := BuildCompleteFieldKeyMap(releaseTime)

			opts := querybuilder.FilterExprVisitorOpts{
				Context: context.Background(),
				Logger:  instrumentationtest.New().Logger(),
				Storage: storage, Query: querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalLogs, nil, tc.startNs, tc.endNs),
				FieldKeys:      keys,
				FullTextColumn: tc.fullTextColumn,
			}

			clause, err := querybuilder.PrepareWhereClause(tc.query, opts)

			if !tc.shouldPass {
				require.Error(t, err)
				require.True(t, detailContains(err, tc.expectedErrorContains),
					"error %v should contain %q", err, tc.expectedErrorContains)
				return
			}

			require.NoError(t, err)
			require.False(t, clause.IsEmpty())

			sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
			require.Equal(t, tc.expectedQuery, sql)
			require.Equal(t, tc.expectedArgs, args)

			if tc.expectWarning {
				// The visitor only flags the guard; the statement builder
				// materializes it from config.
				require.True(t, clause.RequiresCostGuard)
			}
		})
	}
}

// A search scope is a field the resource fingerprint sub-query cannot serve,
// so the main query keeps it when the split runs.
func TestFilterExprSearchResourceScopeUnderSplit(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	resourceScope := "(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(resources_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(resources_string)))"
	legacyBody := "match(LOWER(body), LOWER(?))"

	testCases := []struct {
		name          string
		query         string
		expectedQuery string
		expectedArgs  []any
	}{
		{
			name:          "resource scope alone",
			query:         "search('checkout', resource)",
			expectedQuery: "WHERE (" + resourceScope + ")",
			expectedArgs:  []any{"checkout", "checkout"},
		},
		{
			name:          "resource scope in a union",
			query:         "search('checkout', body, resource)",
			expectedQuery: "WHERE ((" + legacyBody + ") OR (" + resourceScope + "))",
			expectedArgs:  []any{"checkout", "checkout", "checkout"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureUseJSONBody.String(): false})
			opts := querybuilder.FilterExprVisitorOpts{
				Context:            context.Background(),
				Logger:             instrumentationtest.New().Logger(),
				Storage:            NewStorage(),
				Query:              querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalLogs, nil, uint64(releaseTime.Add(-5*time.Minute).UnixNano()), uint64(releaseTime.Add(5*time.Minute).UnixNano())),
				FieldKeys:          BuildCompleteFieldKeyMap(releaseTime),
				FullTextColumn:     DefaultFullTextColumn,
				SkipResourceFilter: true,
			}

			clause, err := querybuilder.PrepareWhereClause(tc.query, opts)
			require.NoError(t, err)
			require.False(t, clause.IsEmpty())

			sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
			require.Equal(t, tc.expectedQuery, sql)
			require.Equal(t, tc.expectedArgs, args)
		})
	}
}
