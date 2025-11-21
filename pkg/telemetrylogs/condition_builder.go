package telemetrylogs

import (
	"context"
	"fmt"
	"slices"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"golang.org/x/exp/maps"

	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	switch operator {
	case qbtypes.FilterOperatorContains,
		qbtypes.FilterOperatorNotContains,
		qbtypes.FilterOperatorILike,
		qbtypes.FilterOperatorNotILike,
		qbtypes.FilterOperatorLike,
		qbtypes.FilterOperatorNotLike:
		value = querybuilder.FormatValueForContains(value)
	}

	column, err := c.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	tblFieldName, err := c.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	if strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
		tblFieldName, value = GetBodyJSONKey(ctx, key, operator, value)
	}

	tblFieldName, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, tblFieldName, operator)

	// make use of case insensitive index for body
	if tblFieldName == "body" {
		switch operator {
		case qbtypes.FilterOperatorLike:
			return sb.ILike(tblFieldName, value), nil
		case qbtypes.FilterOperatorNotLike:
			return sb.NotILike(tblFieldName, value), nil
		case qbtypes.FilterOperatorRegexp:
			return fmt.Sprintf(`match(LOWER(%s), LOWER(%s))`, tblFieldName, sb.Var(value)), nil
		case qbtypes.FilterOperatorNotRegexp:
			return fmt.Sprintf(`NOT match(LOWER(%s), LOWER(%s))`, tblFieldName, sb.Var(value)), nil
		}
	}

	// regular operators
	switch operator {
	// regular operators
	case qbtypes.FilterOperatorEqual:
		return sb.E(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(tblFieldName, value), nil

	// like and not like
	case qbtypes.FilterOperatorLike:
		return sb.Like(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(tblFieldName, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(tblFieldName, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(tblFieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(tblFieldName, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, tblFieldName, sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, tblFieldName, sb.Var(value)), nil
	// between and not between
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(tblFieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(tblFieldName, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using IN, we use `=` + `OR` to make use of index
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.E(tblFieldName, value))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using NOT IN, we use `!=` + `AND` to make use of index
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.NE(tblFieldName, value))
		}
		return sb.And(conditions...), nil

	// exists and not exists
	// in the UI based query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:

		if strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			} else {
				return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
		}

		var value any
		switch column.Type {
		case schema.JSONColumnType{}:
			if operator == qbtypes.FilterOperatorExists {
				return sb.IsNotNull(tblFieldName), nil
			} else {
				return sb.IsNull(tblFieldName), nil
			}
		case schema.ColumnTypeString, schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.ColumnTypeUInt64, schema.ColumnTypeUInt32, schema.ColumnTypeUInt8:
			value = 0
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}, schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeBool,
		}, schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeFloat64,
		}:
			leftOperand := fmt.Sprintf("mapContains(%s, '%s')", column.Name, key.Name)
			if key.Materialized {
				leftOperand = telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
			}
			if operator == qbtypes.FilterOperatorExists {
				return sb.E(leftOperand, true), nil
			} else {
				return sb.NE(leftOperand, true), nil
			}
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for column type %s", column.Type)
		}
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
    _ uint64,
    _ uint64,
) (string, error) {
	condition, err := c.conditionFor(ctx, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	if operator.AddDefaultExistsFilter() {
		// skip adding exists filter for intrinsic fields
		// with an exception for body json search
		field, _ := c.fm.FieldFor(ctx, key)
		if slices.Contains(maps.Keys(IntrinsicFields), field) && !strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
			return condition, nil
		}

		existsCondition, err := c.conditionFor(ctx, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}
	return condition, nil
}
