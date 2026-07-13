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

	serviceNameEq := "(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? " +
		"AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL)"

	testCases := []struct {
		name                  string
		query                 string
		searchDisabled        bool
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
			name:                  "too many parameters",
			query:                 "search('error', 'timeout')",
			fullTextColumn:        DefaultFullTextColumn,
			startNs:               inWindowStart,
			endNs:                 inWindowEnd,
			shouldPass:            false,
			expectedErrorContains: "currently supports a single argument",
		},
		{
			// The condition builder gates search() on its feature flag and rejects
			// while building the fan-out (i.e. during where-clause preparation).
			name:                  "search disabled by flag",
			query:                 "search('error')",
			searchDisabled:        true,
			fullTextColumn:        DefaultFullTextColumn,
			startNs:               inWindowStart,
			endNs:                 inWindowEnd,
			shouldPass:            false,
			expectedErrorContains: "is not enabled",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureAllowLogsSearch.String(): !tc.searchDisabled,
				flagger.FeatureUseJSONBody.String():     tc.jsonBodyEnabled,
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

// TestSearchFeatureFlagGate covers the search() flag check end-to-end: the
// condition builder rejects search() when the flag is off, surfacing through Build.
func TestSearchFeatureFlagGate(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	ctx := context.Background()
	start := uint64(releaseTime.Add(-5 * time.Minute).UnixMilli())
	end := uint64(releaseTime.UnixMilli())

	buildSearch := func(t *testing.T, searchEnabled bool) (*qbtypes.Statement, error) {
		fl := flaggertest.WithBooleanFlags(t, map[string]bool{
			flagger.FeatureAllowLogsSearch.String(): searchEnabled,
		})
		fm := NewFieldMapper(fl)
		cb := NewConditionBuilder(fm, fl)
		store := telemetrytypestest.NewMockMetadataStore()
		store.KeysMap = buildCompleteFieldKeyMap(releaseTime)
		rewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil, fl)
		sb := NewLogQueryStatementBuilder(
			instrumentationtest.New().ToProviderSettings(),
			store, fm, cb, rewriter, DefaultFullTextColumn, GetBodyJSONKey, fl, nil, false, 100000,
		)
		query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal: telemetrytypes.SignalLogs,
			Filter: &qbtypes.Filter{Expression: "search('error')"},
			Limit:  1,
		}
		return sb.Build(ctx, valuer.UUID{}, start, end, qbtypes.RequestTypeRaw, query, nil)
	}

	t.Run("disabled", func(t *testing.T) {
		_, err := buildSearch(t, false)
		require.Error(t, err)
		// The condition builder throws; the where-clause visitor wraps it, so the
		// "is not enabled" detail rides in the structured errors, not err.Error().
		require.True(t, detailContains(err, "is not enabled"),
			"error %v should contain %q", err, "is not enabled")
	})

	t.Run("enabled", func(t *testing.T) {
		stmt, err := buildSearch(t, true)
		require.NoError(t, err)
		require.NotNil(t, stmt.CostGuard)
		require.Contains(t, stmt.Warnings, querybuilder.SearchWarning)
	})
}
