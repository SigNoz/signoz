package resourcefilter

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type defaultConditionBuilder struct {
	fm qbtypes.FieldMapper
}

var _ qbtypes.ConditionBuilder = (*defaultConditionBuilder)(nil)

func NewConditionBuilder(fm qbtypes.FieldMapper) *defaultConditionBuilder {
	return &defaultConditionBuilder{fm: fm}
}

func valueForIndexFilter(key *telemetrytypes.TelemetryFieldKey, value any) any {
	switch v := value.(type) {
	case string:
		return fmt.Sprintf(`%%%s%%%s%%`, key.Name, v)
	case []any:
		values := make([]string, 0, len(v))
		for _, v := range v {
			values = append(values, fmt.Sprintf(`%%%s%%%s%%`, key.Name, v))
		}
		return values
	}
	return value
}

func keyIndexFilter(key *telemetrytypes.TelemetryFieldKey) any {
	return fmt.Sprintf(`%%%s%%`, key.Name)
}

func (b *defaultConditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	op qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	if key.FieldContext != telemetrytypes.FieldContextResource {
		return "true", nil
	}

	column, err := b.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	keyIdxFilter := sb.Like(column.Name, keyIndexFilter(key))
	valueForIndexFilter := valueForIndexFilter(key, value)

	fieldName, err := b.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	switch op {
	case qbtypes.FilterOperatorEqual:
		return sb.And(
			sb.E(fieldName, value),
			keyIdxFilter,
			sb.Like(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.And(
			sb.NE(fieldName, value),
			sb.NotLike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.And(sb.GT(fieldName, value), keyIdxFilter), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.And(sb.GE(fieldName, value), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.And(sb.LT(fieldName, value), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.And(sb.LE(fieldName, value), keyIdxFilter), nil

	case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike:
		return sb.And(
			sb.ILike(fieldName, value),
			keyIdxFilter,
			sb.ILike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotLike, qbtypes.FilterOperatorNotILike:
		return sb.And(
			sb.NotILike(fieldName, value),
			sb.NotILike(column.Name, valueForIndexFilter),
		), nil

	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(keyIdxFilter, sb.Between(fieldName, values[0], values[1])), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(sb.NotBetween(fieldName, values[0], values[1])), nil

	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		inConditions := make([]string, 0, len(values))
		for _, v := range values {
			inConditions = append(inConditions, sb.E(fieldName, v))
		}
		mainCondition := sb.Or(inConditions...)
		valConditions := make([]string, 0, len(values))
		if valuesForIndexFilter, ok := valueForIndexFilter.([]string); ok {
			for _, v := range valuesForIndexFilter {
				valConditions = append(valConditions, sb.Like(column.Name, v))
			}
		}
		mainCondition = sb.And(mainCondition, keyIdxFilter, sb.Or(valConditions...))

		return mainCondition, nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		notInConditions := make([]string, 0, len(values))
		for _, v := range values {
			notInConditions = append(notInConditions, sb.NE(fieldName, v))
		}
		mainCondition := sb.And(notInConditions...)
		valConditions := make([]string, 0, len(values))
		if valuesForIndexFilter, ok := valueForIndexFilter.([]string); ok {
			for _, v := range valuesForIndexFilter {
				valConditions = append(valConditions, sb.NotLike(column.Name, v))
			}
		}
		mainCondition = sb.And(mainCondition, sb.And(valConditions...))
		return mainCondition, nil

	case qbtypes.FilterOperatorExists:
		return sb.And(
			sb.E(fmt.Sprintf("simpleJSONHas(%s, '%s')", column.Name, key.Name), true),
			keyIdxFilter,
		), nil
	case qbtypes.FilterOperatorNotExists:
		return sb.And(
			sb.NE(fmt.Sprintf("simpleJSONHas(%s, '%s')", column.Name, key.Name), true),
		), nil

	case qbtypes.FilterOperatorRegexp:
		return sb.And(
			fmt.Sprintf("match(%s, %s)", fieldName, sb.Var(value)),
			keyIdxFilter,
		), nil
	case qbtypes.FilterOperatorNotRegexp:
		return sb.And(
			fmt.Sprintf("NOT match(%s, %s)", fieldName, sb.Var(value)),
		), nil

	case qbtypes.FilterOperatorContains:
		return sb.And(
			sb.ILike(fieldName, fmt.Sprintf(`%%%s%%`, value)),
			keyIdxFilter,
			sb.ILike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.And(
			sb.NotILike(fieldName, fmt.Sprintf(`%%%s%%`, value)),
			sb.NotILike(column.Name, valueForIndexFilter),
		), nil
	}
	return "", qbtypes.ErrUnsupportedOperator
}
