package telemetrymetadata

import (
	"fmt"
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildGetBodyJSONPathsQuery(t *testing.T) {
	testCases := []struct {
		name              string
		fieldKeySelectors []*telemetrytypes.FieldKeySelector
		operator          qbtypes.FilterOperator
		expectedSQL       []string // SQL should contain these strings
		notExpectedSQL    []string // SQL should NOT contain these strings
		expectedArgs      []any    // Args include search texts (if any) + limit value
		expectedLimit     int
	}{

		{
			name: "Single search text with EQUAL operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name: "user.name",
				},
			},
			operator: qbtypes.FilterOperatorEqual,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"path = ?",
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"ILIKE",
				"LIKE",
			},
			expectedArgs:  []any{"user.name", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name: "Single search text with LIKE operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name: "user",
				},
			},
			operator: qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"path LIKE ?",
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"path = ?",
			},
			expectedArgs:  []any{"user", 100},
			expectedLimit: 100,
		},
		{
			name: "Multiple search texts with EQUAL operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name: "user.name",
				},
				{
					Name: "user.age",
				},
			},
			operator: qbtypes.FilterOperatorEqual,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"OR",
				"path = ?",
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"ILIKE",
				"LIKE",
			},
			expectedArgs:  []any{"user.name", "user.age", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name: "Multiple search texts with LIKE operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name: "user",
				},
				{
					Name: "admin",
				},
			},
			operator: qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"OR",
				"path LIKE ?",
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"path = ?",
			},
			expectedArgs:  []any{"user", "admin", 2000},
			expectedLimit: 2000,
		},
		{
			name: "Search with Contains operator (should default to LIKE)",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name: "test",
				},
			},
			operator: qbtypes.FilterOperatorContains,
			expectedSQL: []string{
				"WHERE",
				"path LIKE ?",
			},
			notExpectedSQL: []string{
				"path = ?",
			},
			expectedArgs:  []any{"test", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Set up fieldKeySelectors based on test case
			for i, fieldKeySelector := range tc.fieldKeySelectors {
				fieldKeySelector.Signal = telemetrytypes.SignalLogs
				// Set SelectorMatchType based on operator
				if tc.operator == qbtypes.FilterOperatorEqual {
					fieldKeySelector.SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
					// For exact matches, limit is not accumulated, so defaultPathLimit will be used
				} else {
					fieldKeySelector.SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeFuzzy
					// For LIKE/Contains operators, set limit based on expectedLimit
					if tc.expectedLimit == defaultPathLimit {
						// Set to 0 to trigger defaultPathLimit
						fieldKeySelector.Limit = 0
					} else if len(tc.fieldKeySelectors) > 1 {
						// Divide limit among multiple selectors
						fieldKeySelector.Limit = tc.expectedLimit / len(tc.fieldKeySelectors)
						// First selector gets any remainder
						if i == 0 {
							fieldKeySelector.Limit += tc.expectedLimit % len(tc.fieldKeySelectors)
						}
					} else {
						// Single selector with custom limit
						fieldKeySelector.Limit = tc.expectedLimit
					}
				}
			}
			query, args, limit, err := buildGetBodyJSONPathsQuery(tc.fieldKeySelectors)
			require.NoError(t, err, "Error building query: %v", err)

			// Verify query is not empty
			require.NotEmpty(t, query, "Query should not be empty")

			// Verify expected SQL patterns are present
			queryUpper := strings.ToUpper(query)
			for _, expected := range tc.expectedSQL {
				assert.Contains(t, queryUpper, strings.ToUpper(expected),
					"Query should contain: %s\nActual query: %s", expected, query)
			}

			// Verify SQL patterns that should NOT be present
			for _, notExpected := range tc.notExpectedSQL {
				assert.NotContains(t, queryUpper, strings.ToUpper(notExpected),
					"Query should NOT contain: %s\nActual query: %s", notExpected, query)
			}

			// Verify limit matches expected
			assert.Equal(t, tc.expectedLimit, limit, "Limit should match expected value")

			// Verify arguments match (including limit as last arg)
			assert.Equal(t, tc.expectedArgs, args, "Arguments should match. Expected: %v, Got: %v", tc.expectedArgs, args)

			// Verify limit value is in args (should be last element)
			if len(args) > 0 {
				actualLimit := args[len(args)-1]
				assert.Equal(t, tc.expectedLimit, actualLimit, "Last argument should be the limit value")
			}

			// Verify LIMIT placeholder is in query
			assert.Contains(t, query, "LIMIT ?", "Query should contain LIMIT ? placeholder")

			// Verify GROUP BY is present
			assert.Contains(t, queryUpper, "GROUP BY", "Query should contain GROUP BY")
			assert.Contains(t, queryUpper, "GROUP BY PATH", "Query should group by path")

			// Verify ORDER BY is present
			assert.Contains(t, queryUpper, "ORDER BY", "Query should contain ORDER BY")
			assert.Contains(t, queryUpper, "LAST_SEEN DESC", "Query should ORDER BY last_seen DESC")

			// Verify SELECT columns
			assert.Contains(t, queryUpper, "PATH", "Query should select path")
			assert.Contains(t, queryUpper, "GROUPARRAY(DISTINCT TYPE)", "Query should select groupArray(DISTINCT type)")
			assert.Contains(t, queryUpper, "MAX(LAST_SEEN)", "Query should select max(last_seen)")
		})
	}
}
