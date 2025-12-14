package resourcefilter

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/querybuilder"
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

func valueForIndexFilter(op qbtypes.FilterOperator, key *telemetrytypes.TelemetryFieldKey, value any) any {
	switch v := value.(type) {
	case []any:
		// assuming array will always be for in and not in
		values := make([]string, 0, len(v))
		for _, v := range v {
			values = append(values, fmt.Sprintf(`%%%s":"%s%%`, key.Name, querybuilder.FormatValueForContains(v)))
		}
		return values
	default:
		// format to string for anything else as we store resource values as string
		if op == qbtypes.FilterOperatorEqual || op == qbtypes.FilterOperatorNotEqual {
			return fmt.Sprintf(`%%%s":"%s%%`, key.Name, querybuilder.FormatValueForContains(v))
		}
		return fmt.Sprintf(`%%%s%%%s%%`, key.Name, querybuilder.FormatValueForContains(v))
	}
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
    _ uint64,
    _ uint64,
) (string, error) {

	if key.FieldContext != telemetrytypes.FieldContextResource {
		return "true", nil
	}

	// except for in, not in, between, not between all other operators should have formatted value
	// as we store resource values as string
	formattedValue := querybuilder.FormatValueForContains(value)

	column, err := b.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	keyIdxFilter := sb.Like(column.Name, keyIndexFilter(key))
	valueForIndexFilter := valueForIndexFilter(op, key, value)

	fieldName, err := b.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	switch op {
	case qbtypes.FilterOperatorEqual:
		return sb.And(
			sb.E(fieldName, formattedValue),
			keyIdxFilter,
			sb.Like(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.And(
			sb.NE(fieldName, formattedValue),
			sb.NotLike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.And(sb.GT(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.And(sb.GE(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.And(sb.LT(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.And(sb.LE(fieldName, formattedValue), keyIdxFilter), nil

	case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike:
		return sb.And(
			sb.ILike(fieldName, formattedValue),
			keyIdxFilter,
			sb.ILike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotLike, qbtypes.FilterOperatorNotILike:
		// no index filter: as cannot apply `not contains x%y` as y can be somewhere else
		return sb.And(
			sb.NotILike(fieldName, formattedValue),
		), nil

	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(keyIdxFilter, sb.Between(fieldName, querybuilder.FormatValueForContains(values[0]), querybuilder.FormatValueForContains(values[1]))), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(sb.NotBetween(fieldName, querybuilder.FormatValueForContains(values[0]), querybuilder.FormatValueForContains(values[1]))), nil

	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		inConditions := make([]string, 0, len(values))
		for _, v := range values {
			inConditions = append(inConditions, sb.E(fieldName, querybuilder.FormatValueForContains(v)))
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
			notInConditions = append(notInConditions, sb.NE(fieldName, querybuilder.FormatValueForContains(v)))
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
			fmt.Sprintf("match(%s, %s)", fieldName, sb.Var(formattedValue)),
			keyIdxFilter,
		), nil
	case qbtypes.FilterOperatorNotRegexp:
		return sb.And(
			fmt.Sprintf("NOT match(%s, %s)", fieldName, sb.Var(formattedValue)),
		), nil

	case qbtypes.FilterOperatorContains:
		return sb.And(
			sb.ILike(fieldName, fmt.Sprintf(`%%%s%%`, formattedValue)),
			keyIdxFilter,
			sb.ILike(column.Name, valueForIndexFilter),
		), nil
	case qbtypes.FilterOperatorNotContains:
		// no index filter: as cannot apply `not contains x%y` as y can be somewhere else
		return sb.And(
			sb.NotILike(fieldName, fmt.Sprintf(`%%%s%%`, formattedValue)),
		), nil
	}
	return "", qbtypes.ErrUnsupportedOperator
}
