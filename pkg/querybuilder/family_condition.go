package querybuilder

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// LogicalFamilyCondition compiles one condition for a family logical field
// from the mapper's primitives. Family members are map-backed attribute or
// resource keys by construction, so the compiler has no column-specific
// branches; a signal keeps its own single-member paths and hands only
// families here.
func LogicalFamilyCondition(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	fm qbtypes.FieldMapper,
	logical *telemetrytypes.LogicalField,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if operator.IsStringSearchOperator() {
		value = FormatValueForContains(value)
	}

	fieldExpression, err := LogicalValueExpr(ctx, orgID, startNs, endNs, fm, logical)
	if err != nil {
		return "", err
	}

	// Coercion switches only on the data type, which every member shares, so
	// the first member stands in for the field.
	fieldExpression, value = DataTypeCollisionHandledFieldName(logical.Single(), value, fieldExpression, operator)

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldExpression, value), nil

	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldExpression, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldExpression, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil

	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldExpression, values[0], values[1]), nil

	// `=`+OR / `!=`+AND instead of IN / NOT IN, to make use of the index
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := make([]string, 0, len(values))
		for _, item := range values {
			cond, err := LogicalFamilyCondition(ctx, orgID, startNs, endNs, fm, logical, qbtypes.FilterOperatorEqual, item, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := make([]string, 0, len(values))
		for _, item := range values {
			cond, err := LogicalFamilyCondition(ctx, orgID, startNs, endNs, fm, logical, qbtypes.FilterOperatorNotEqual, item, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
		}
		return sb.And(conditions...), nil

	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		pred, err := LogicalExistsExpr(ctx, orgID, startNs, endNs, fm, logical, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(pred), nil
	}
	return "", qbtypes.ErrUnsupportedOperator
}
