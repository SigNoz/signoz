package telemetrylogs

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// CompositeColumnStrategy handles condition building for composite columns,
// which are logical fields that span multiple physical columns.
// Examples: "body" field that can be body, body_json, or body_json_promoted.
type CompositeColumnStrategy struct {
	fm qbtypes.FieldMapper
}

func NewCompositeColumnStrategy(fm qbtypes.FieldMapper) *CompositeColumnStrategy {
	return &CompositeColumnStrategy{fm: fm}
}

func (s *CompositeColumnStrategy) CanHandle(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, column *schema.Column) bool {
	// Check if this is a composite column by looking it up in the logical field registry
	_, exists := logicalFieldRegistry[key.Name]
	return exists
}

func (s *CompositeColumnStrategy) BuildCondition(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	metadata, exists := logicalFieldRegistry[key.Name]
	if !exists {
		// Should not happen if CanHandle returned true, but handle gracefully
		return "", qbtypes.ErrColumnNotFound
	}

	// Check if there's a custom condition handler for this operator
	if metadata.Conditions != nil {
		if handler, ok := metadata.Conditions[operator]; ok {
			return handler(sb, value)
		}
	}

	// Fallback: use the expression from the logical field and apply standard operators
	expr := metadata.Expr()

	// Format value for string search operators
	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	// Apply standard operators using the logical field expression
	return s.buildConditionForExpression(sb, expr, operator, value)
}

// buildConditionForExpression builds conditions for a given expression string.
// This is used by composite columns that have their own expressions.
func (s *CompositeColumnStrategy) buildConditionForExpression(
	sb *sqlbuilder.SelectBuilder,
	expr string,
	operator qbtypes.FilterOperator,
	value any,
) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(expr, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(expr, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(expr, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(expr, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(expr, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(expr, value), nil
	case qbtypes.FilterOperatorLike:
		return sb.Like(expr, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(expr, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(expr, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(expr, value), nil
	case qbtypes.FilterOperatorContains:
		return sb.ILike(expr, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(expr, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(expr), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(expr), sb.Var(value)), nil
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(expr, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(expr, values[0], values[1]), nil
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, v := range values {
			conditions = append(conditions, sb.E(expr, v))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, v := range values {
			conditions = append(conditions, sb.NE(expr, v))
		}
		return sb.And(conditions...), nil
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		// For composite columns, exists/not exists should be handled by the custom conditions
		// If we reach here, it means no custom handler was provided
		// We'll use a simple IS NOT NULL check on the expression
		if operator == qbtypes.FilterOperatorExists {
			return fmt.Sprintf("%s IS NOT NULL", expr), nil
		}
		return fmt.Sprintf("%s IS NULL", expr), nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
	}
}
