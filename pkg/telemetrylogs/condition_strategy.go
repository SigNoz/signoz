package telemetrylogs

import (
	"context"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// ConditionStrategy defines the interface for building conditions.
// Different strategies handle different data access patterns:
// - DirectExpressionStrategy: Physical columns, map expressions, simple JSON paths
// - LambdaExpressionStrategy: JSON paths with array traversal requiring nested lambdas
// - CompositeColumnStrategy: Logical fields spanning multiple physical columns
type ConditionStrategy interface {
	// BuildCondition builds a SQL condition for the given key, operator, and value.
	BuildCondition(
		ctx context.Context,
		key *telemetrytypes.TelemetryFieldKey,
		operator qbtypes.FilterOperator,
		value any,
		sb *sqlbuilder.SelectBuilder,
	) (string, error)

	// CanHandle returns true if this strategy can handle the given field key and column.
	CanHandle(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, column *schema.Column) bool
}

// ConditionStrategyRouter determines which strategy to use for a given field.
type ConditionStrategyRouter struct {
	strategies []ConditionStrategy
	fm         qbtypes.FieldMapper
}

// NewConditionStrategyRouter creates a new router with all available strategies.
func NewConditionStrategyRouter(fm qbtypes.FieldMapper) *ConditionStrategyRouter {
	return &ConditionStrategyRouter{
		strategies: []ConditionStrategy{
			NewCompositeColumnStrategy(fm),
			NewLambdaExpressionStrategy(fm),
			NewDirectExpressionStrategy(fm),
		},
		fm: fm,
	}
}

// Route determines which strategy to use and builds the condition.
func (r *ConditionStrategyRouter) Route(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := r.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	// Find the first strategy that can handle this field
	for _, strategy := range r.strategies {
		if strategy.CanHandle(ctx, key, column) {
			return strategy.BuildCondition(ctx, key, operator, value, sb)
		}
	}

	// Fallback to direct expression if no strategy matches
	directStrategy := NewDirectExpressionStrategy(r.fm)
	return directStrategy.BuildCondition(ctx, key, operator, value, sb)
}
