package telemetrylogs

import (
	"context"
	"fmt"
	"slices"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"golang.org/x/exp/maps"

	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm            qbtypes.FieldMapper
	metadataStore telemetrytypes.MetadataStore
}

func NewConditionBuilder(fm qbtypes.FieldMapper, metadataStore telemetrytypes.MetadataStore) *conditionBuilder {
	return &conditionBuilder{fm: fm, metadataStore: metadataStore}
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := c.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	if column.IsJSONColumn() && querybuilder.BodyJSONQueryEnabled {
		cond, err := c.buildJSONCondition(ctx, key, operator, value, sb)
		if err != nil {
			return "", err
		}
		return cond, nil
	}

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	tblFieldName, err := c.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search - either by FieldContext
	if key.FieldContext == telemetrytypes.FieldContextBody {
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
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
		case qbtypes.FilterOperatorNotRegexp:
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`NOT match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
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
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
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
		if key.FieldContext == telemetrytypes.FieldContextBody && !querybuilder.BodyJSONQueryEnabled {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			} else {
				return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
		}

		var value any
		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			if operator == qbtypes.FilterOperatorExists {
				return sb.IsNotNull(tblFieldName), nil
			} else {
				return sb.IsNull(tblFieldName), nil
			}
		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				value = ""
				if operator == qbtypes.FilterOperatorExists {
					return sb.NE(tblFieldName, value), nil
				}
				return sb.E(tblFieldName, value), nil
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
			}
		case schema.ColumnTypeEnumString:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
			value = 0
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
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

	if !(key.FieldContext == telemetrytypes.FieldContextBody && querybuilder.BodyJSONQueryEnabled) && operator.AddDefaultExistsFilter() {
		// skip adding exists filter for intrinsic fields
		// with an exception for body json search
		field, _ := c.fm.FieldFor(ctx, key)
		if slices.Contains(maps.Keys(IntrinsicFields), field) && key.FieldContext != telemetrytypes.FieldContextBody {
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
