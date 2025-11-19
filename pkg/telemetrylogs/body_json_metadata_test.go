package telemetrylogs

import (
	"fmt"
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildGetBodyJSONPathsQuery(t *testing.T) {
	testCases := []struct {
		name            string
		searchTexts     []string
		uniquePathLimit int
		operator        qbtypes.FilterOperator
		expectedSQL     []string // SQL should contain these strings
		notExpectedSQL  []string // SQL should NOT contain these strings
		expectedArgs    []any    // Args include search texts (if any) + limit value
		expectedLimit   int
	}{
		{
			name:            "No search texts, no limit - should use default limit",
			searchTexts:     nil,
			uniquePathLimit: 0,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"WHERE",
			},
			expectedArgs:  []any{defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name:            "No search texts, with custom limit",
			searchTexts:     nil,
			uniquePathLimit: 5000,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"WHERE",
			},
			expectedArgs:  []any{5000},
			expectedLimit: 5000,
		},
		{
			name:            "Single search text with EQUAL operator",
			searchTexts:     []string{"user.name"},
			uniquePathLimit: 0,
			operator:        qbtypes.FilterOperatorEqual,
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
			name:            "Single search text with LIKE operator",
			searchTexts:     []string{"user"},
			uniquePathLimit: 100,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"LOWER(path) LIKE LOWER(?)",
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
			name:            "Multiple search texts with EQUAL operator",
			searchTexts:     []string{"user.name", "user.age"},
			uniquePathLimit: 0,
			operator:        qbtypes.FilterOperatorEqual,
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
			name:            "Multiple search texts with LIKE operator",
			searchTexts:     []string{"user", "admin"},
			uniquePathLimit: 2000,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"WHERE",
				"OR",
				"LOWER(path) LIKE LOWER(?)",
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
			name:            "Empty search texts array",
			searchTexts:     []string{},
			uniquePathLimit: 0,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			notExpectedSQL: []string{
				"WHERE",
			},
			expectedArgs:  []any{defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name:            "Large limit value",
			searchTexts:     nil,
			uniquePathLimit: 50000,
			operator:        qbtypes.FilterOperatorLike,
			expectedSQL: []string{
				"SELECT",
				"path",
				"groupArray(DISTINCT type) AS types",
				"max(last_seen) AS last_seen",
				fmt.Sprintf("FROM %s.%s", DBName, PathTypesTableName),
				"GROUP BY path",
				"ORDER BY last_seen DESC",
				"LIMIT ?",
			},
			expectedArgs:  []any{50000},
			expectedLimit: 50000,
		},
		{
			name:            "Search with Contains operator (should default to LIKE)",
			searchTexts:     []string{"test"},
			uniquePathLimit: 0,
			operator:        qbtypes.FilterOperatorContains,
			expectedSQL: []string{
				"WHERE",
				"LOWER(path) LIKE LOWER(?)",
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
			query, args := buildGetBodyJSONPathsQuery(tc.searchTexts, tc.uniquePathLimit, tc.operator)

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
