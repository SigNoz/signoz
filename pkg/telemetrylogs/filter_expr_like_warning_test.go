package telemetrylogs

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/stretchr/testify/require"
)

// TestLikeAndILikeWithoutWildcards_Warns Tests that LIKE/ILIKE without wildcards add warnings and include docs URL
func TestLikeAndILikeWithoutWildcards_Warns(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           instrumentationtest.New().Logger(),
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn:   DefaultFullTextColumn,
		JsonBodyPrefix:   BodyJSONStringSearchPrefix,
		JsonKeyToKey:     GetBodyJSONKey,
	}

	tests := []string{
		"service.name LIKE 'demo-backend'",
		"service.name ILIKE 'demo-backend'",
		"service.name NOT LIKE 'demo-backend'",
		"service.name NOT ILIKE 'demo-backend'",
	}

	for _, expr := range tests {
		t.Run(expr, func(t *testing.T) {
            clause, err := querybuilder.PrepareWhereClause(expr, opts, 0, 0)
			require.NoError(t, err)
			require.NotNil(t, clause)

			require.NotEmpty(t, clause.Warnings, "expected warning for: %s", expr)
			require.Contains(t, clause.Warnings[0], "operator used without wildcards")
			require.Contains(t, clause.WarningsDocURL, "operators-reference/#string-matching-operators")
		})
	}
}

// TestLikeAndILikeWithWildcards_NoWarn Tests that LIKE/ILIKE with wildcards do not add warnings
func TestLikeAndILikeWithWildcards_NoWarn(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           instrumentationtest.New().Logger(),
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn:   DefaultFullTextColumn,
		JsonBodyPrefix:   BodyJSONStringSearchPrefix,
		JsonKeyToKey:     GetBodyJSONKey,
	}

	tests := []string{
		"service.name LIKE 'demo-%'",
		"service.name LIKE '%demo'",
		"service.name ILIKE '_demo'",
		"service.name ILIKE '%demo%'",
	}

	for _, expr := range tests {
		t.Run(expr, func(t *testing.T) {
            clause, err := querybuilder.PrepareWhereClause(expr, opts, 0, 0)
			require.NoError(t, err)
			require.NotNil(t, clause)

			require.Empty(t, clause.Warnings, "did not expect warnings for: %s", expr)
			require.Empty(t, clause.WarningsDocURL)
		})
	}
}
