package telemetrylogs

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// searchFanOut returns the WHERE fragment search() fans out to. bodyExpr is the
// body match expression, which differs between the legacy string body and the
// body_v2 JSON column.
func searchFanOut(bodyExpr string) string {
	return "(match(LOWER(severity_text), LOWER(?)) OR match(LOWER(trace_id), LOWER(?)) OR match(LOWER(span_id), LOWER(?)) OR " +
		bodyExpr + " OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(attributes_string))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_number)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), arrayMap(x -> toString(x), mapValues(attributes_number)))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(attributes_bool)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), arrayMap(x -> toString(x), mapValues(attributes_bool)))) OR " +
		"(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(resources_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(resources_string))))"
}

// searchArgs returns v repeated once per bound parameter search() emits — one per
// searchable column expression (currently 12).
func searchArgs(v any) []any {
	const searchColumnParams = 12
	args := make([]any, searchColumnParams)
	for i := range args {
		args[i] = v
	}
	return args
}

// TestFilterExprSearch covers the search('needle') function, which fans out
// across every searchable column via FilterOperatorSearch.
func TestFilterExprSearch(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	inWindowStart := uint64(releaseTime.Add(-5 * time.Minute).UnixNano())
	inWindowEnd := uint64(releaseTime.Add(5 * time.Minute).UnixNano())

	legacyBody := "match(LOWER(body), LOWER(?))"
	jsonBody := "match(LOWER(toString(body_v2)), LOWER(?))"

	// Single-context scope fragments (the fan-out narrowed to one context).
	logScope := "(match(LOWER(severity_text), LOWER(?)) OR match(LOWER(trace_id), LOWER(?)) OR match(LOWER(span_id), LOWER(?)))"
	resourceScope := "(arrayExists(x -> match(LOWER(x), LOWER(?)), mapKeys(resources_string)) OR arrayExists(x -> match(LOWER(x), LOWER(?)), mapValues(resources_string)))"

	serviceNameEq := "(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? " +
		"AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL)"

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
			// A wide window is allowed at build time; scan cost is bounded by the
			// querier's EXPLAIN ESTIMATE gate, not a window cap in the builder.
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
			// search() is keyless and independent of fullTextColumn (which only
			// governs bare/quoted free text). It must work even when unset.
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
			// A context-prefixed bare word must be used as the literal needle, not
			// normalized into a field key (Normalize would strip "resource.").
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
			// A numeric needle must be the literal digits, not the %v rendering of a
			// parsed float64 (which would make search(1000000) scan for "1e+06").
			name:           "numeric needle is not scientific notation",
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
			fm := NewFieldMapper(fl)
			cb := NewConditionBuilder(fm, fl)
			keys := buildCompleteFieldKeyMap(releaseTime)

			opts := querybuilder.FilterExprVisitorOpts{
				Context:          context.Background(),
				Logger:           instrumentationtest.New().Logger(),
				FieldMapper:      fm,
				ConditionBuilder: cb,
				FieldKeys:        keys,
				FullTextColumn:   tc.fullTextColumn,
				StartNs:          tc.startNs,
				EndNs:            tc.endNs,
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
				// The visitor only flags the cost guard; the statement builder
				// materializes the advisory + budget from config downstream.
				require.True(t, clause.RequiresCostGuard)
			}
		})
	}
}

// TestSearchCostGuard covers the search() path end-to-end through Build: the
// statement carries a CostGuard with its scan budget and the advisory warning.
func TestSearchCostGuard(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	ctx := context.Background()
	start := uint64(releaseTime.Add(-5 * time.Minute).UnixMilli())
	end := uint64(releaseTime.UnixMilli())

	fl := flaggertest.WithBooleanFlags(t, map[string]bool{})
	fm := NewFieldMapper(fl)
	cb := NewConditionBuilder(fm, fl)
	store := telemetrytypestest.NewMockMetadataStore()
	store.KeysMap = buildCompleteFieldKeyMap(releaseTime)
	rewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl)
	sb := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		store, fm, cb, rewriter, DefaultFullTextColumn, fl, nil, false, 100000,
		WithSearchMaxScanRows(100000),
	)
	query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		Signal: telemetrytypes.SignalLogs,
		Filter: &qbtypes.Filter{Expression: "search('error')"},
		Limit:  1,
	}

	stmt, err := sb.Build(ctx, valuer.UUID{}, start, end, qbtypes.RequestTypeRaw, query, nil)
	require.NoError(t, err)
	require.NotNil(t, stmt.CostGuard)
	require.Contains(t, stmt.Warnings, querybuilder.SearchWarning)
}
