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

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	columns, err := c.fm.ColumnFor(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && querybuilder.BodyJSONQueryEnabled && key.Name != messageSubField {
			valueType, value := InferDataType(value, operator, key)
			cond, err := NewJSONConditionBuilder(key, valueType).buildJSONCondition(operator, value, sb)
			if err != nil {
				return "", err
			}
			return cond, nil
		}

	}

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldExpression, err := c.fm.FieldFor(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search - either by FieldContext
	if key.FieldContext == telemetrytypes.FieldContextBody && !querybuilder.BodyJSONQueryEnabled {
		fieldExpression, value = GetBodyJSONKey(ctx, key, operator, value)
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	// make use of case insensitive index for body
	if fieldExpression == "body" || fieldExpression == messageSubColumn {
		switch operator {
		case qbtypes.FilterOperatorLike:
			return sb.ILike(fieldExpression, value), nil
		case qbtypes.FilterOperatorNotLike:
			return sb.NotILike(fieldExpression, value), nil
		case qbtypes.FilterOperatorRegexp:
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
		case qbtypes.FilterOperatorNotRegexp:
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`NOT match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
		}
	}

	// regular operators
	switch operator {
	// regular operators
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

	// like and not like
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
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	// between and not between
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldExpression, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using IN, we use `=` + `OR` to make use of index
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.E(fieldExpression, value))
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
			conditions = append(conditions, sb.NE(fieldExpression, value))
		}
		return sb.And(conditions...), nil

	// exists and not exists
	// in the UI based query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		if key.FieldContext == telemetrytypes.FieldContextBody && !querybuilder.BodyJSONQueryEnabled {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			} else {
				return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
		}

		var value any
		column := columns[0]
		if len(key.Evolutions) > 0 {
			// we will use the corresponding column and its evolution entry for the query
			newColumns, _, err := selectEvolutionsForColumns(columns, key.Evolutions, startNs, endNs)
			if err != nil {
				return "", err
			}

			if len(newColumns) == 0 {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "no valid evolution found for field %s in the given time range", key.Name)
			}

			// This mean tblFieldName is with multiIf, we just need to do a null check.
			if len(newColumns) > 1 {
				if operator == qbtypes.FilterOperatorExists {
					return sb.IsNotNull(fieldExpression), nil
				} else {
					return sb.IsNull(fieldExpression), nil
				}
			}

			// otherwise we have to find the correct exist operator based on the column type
			column = newColumns[0]
		}

		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			if operator == qbtypes.FilterOperatorExists {
				return sb.IsNotNull(fieldExpression), nil
			}
			return sb.IsNull(fieldExpression), nil
		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				value = ""
				if operator == qbtypes.FilterOperatorExists {
					return sb.NE(fieldExpression, value), nil
				}
				return sb.E(fieldExpression, value), nil
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
			}
		case schema.ColumnTypeEnumString:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(fieldExpression, value), nil
			} else {
				return sb.E(fieldExpression, value), nil
			}
		case schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
			value = 0
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(fieldExpression, value), nil
			} else {
				return sb.E(fieldExpression, value), nil
			}
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
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
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
			}
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for column type %s", column.Type)

		}
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
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

	condition, err := c.conditionFor(ctx, startNs, endNs, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	// Skip adding exists filter for intrinsic fields i.e. Table level log context fields
	buildExistCondition := operator.AddDefaultExistsFilter()
	switch key.FieldContext {
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextScope:
		// pass; No need to build exist condition for top level columns
		// immediately return
		return condition, nil
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute:
		// build exist condition for resource and attribute fields based on filter operator
	case telemetrytypes.FieldContextBody:
		// Querying JSON fields already account for Nullability of fields
		// so additional exists checks are not needed
		if querybuilder.BodyJSONQueryEnabled {
			return condition, nil
		}
	}

	if buildExistCondition {
		existsCondition, err := c.conditionFor(ctx, startNs, endNs, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}

	return condition, nil
}
