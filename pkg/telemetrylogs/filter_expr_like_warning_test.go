package telemetrylogs

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// TestLikeAndILikeWithoutWildcards_Warns Tests that LIKE/ILIKE without wildcards add warnings and include docs URL
func TestLikeAndILikeWithoutWildcards_Warns(t *testing.T) {
	ctx := context.Background()
	ctx = authtypes.NewContextWithClaims(ctx, authtypes.Claims{
		OrgID: valuer.GenerateUUID().String(),
	})
	storeWithMetadata := telemetrytypestest.NewMockKeyEvolutionMetadataStore(nil)
	fm := NewFieldMapper(storeWithMetadata)
	cb := NewConditionBuilder(fm)

	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           instrumentationtest.New().Logger(),
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn:   DefaultFullTextColumn,
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
			clause, err := querybuilder.PrepareWhereClause(ctx, expr, opts, 0, 0)
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
	storeWithMetadata := telemetrytypestest.NewMockKeyEvolutionMetadataStore(nil)
	fm := NewFieldMapper(storeWithMetadata)
	cb := NewConditionBuilder(fm)

	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           instrumentationtest.New().Logger(),
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn:   DefaultFullTextColumn,
		JsonKeyToKey:     GetBodyJSONKey,
	}

	tests := []string{
		"service.name LIKE 'demo-%'",
		"service.name LIKE '%demo'",
		"service.name ILIKE '_demo'",
		"service.name ILIKE '%demo%'",
	}
	ctx := context.Background()
	ctx = authtypes.NewContextWithClaims(ctx, authtypes.Claims{
		OrgID: valuer.GenerateUUID().String(),
	})

	for _, expr := range tests {
		t.Run(expr, func(t *testing.T) {
			clause, err := querybuilder.PrepareWhereClause(ctx, expr, opts, 0, 0)
			require.NoError(t, err)
			require.NotNil(t, clause)

			require.Empty(t, clause.Warnings, "did not expect warnings for: %s", expr)
			require.Empty(t, clause.WarningsDocURL)
		})
	}
}
