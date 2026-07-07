package implrulestatehistory

import (
	"context"
	"fmt"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func newConditionBuilder(fm qbtypes.FieldMapper) qbtypes.ConditionBuilder {
	return &conditionBuilder{fm: fm}
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldName, err := c.fm.FieldFor(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldName, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldName, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldName, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldName, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldName, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldName, value), nil
	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldName, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldName, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldName, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldName, value), nil
	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(fieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.In(fieldName, values), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.NotIn(fieldName, values), nil
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		intrinsic := []string{"rule_id", "rule_name", "overall_state", "overall_state_changed", "state", "state_changed", "unix_milli", "fingerprint", "value"}
		if slices.Contains(intrinsic, key.Name) {
			return "true", nil
		}
		if operator == qbtypes.FilterOperatorExists {
			return fmt.Sprintf("has(JSONExtractKeys(labels), %s)", sb.Var(key.Name)), nil
		}
		return fmt.Sprintf("not has(JSONExtractKeys(labels), %s)", sb.Var(key.Name)), nil
	}

	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}
