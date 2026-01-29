package telemetrylogs

import (
	"context"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// LambdaExpressionStrategy handles condition building for JSON fields
// that require nested lambda functions (arrayExists, arrayMap) because
// ClickHouse doesn't allow flat predicates for fields inside arrays.
type LambdaExpressionStrategy struct {
	fm qbtypes.FieldMapper
}

func NewLambdaExpressionStrategy(fm qbtypes.FieldMapper) *LambdaExpressionStrategy {
	return &LambdaExpressionStrategy{fm: fm}
}

func (s *LambdaExpressionStrategy) CanHandle(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, column *schema.Column) bool {
	// Lambda expressions are needed for JSON columns with array traversal
	if column.Type.GetType() != schema.ColumnTypeEnumJSON {
		return false
	}

	if !querybuilder.BodyJSONQueryEnabled {
		return false
	}

	// Check if this requires array traversal (has JSONPlan with non-terminal nodes)
	if len(key.JSONPlan) == 0 {
		return false
	}

	// If the first node is terminal, we can use direct expression
	if key.JSONPlan[0].IsTerminal {
		return false
	}

	return true
}

func (s *LambdaExpressionStrategy) BuildCondition(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	valueType, value := InferDataType(value, operator, key)
	jsonBuilder := NewJSONConditionBuilder(key, valueType)
	return jsonBuilder.buildJSONCondition(operator, value, sb)
}
