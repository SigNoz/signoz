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

// DirectExpressionStrategy handles condition building for:
// 1. Physical Columns (direct access: severity_text, body, etc.)
// 2. Fields inside Physical Columns -> Expressions (like attribute_string['service.name'])
// 3. Simple JSON paths without array traversal
type DirectExpressionStrategy struct {
	fm qbtypes.FieldMapper
}

func NewDirectExpressionStrategy(fm qbtypes.FieldMapper) *DirectExpressionStrategy {
	return &DirectExpressionStrategy{fm: fm}
}

func (s *DirectExpressionStrategy) CanHandle(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, column *schema.Column) bool {
	// Direct expressions can handle everything except:
	// 1. JSON columns with array traversal (handled by LambdaExpressionStrategy)
	// 2. Composite columns (handled by CompositeColumnStrategy)
	
	// If it's a JSON column with array traversal, we need lambda
	if column.Type.GetType() == schema.ColumnTypeEnumJSON && querybuilder.BodyJSONQueryEnabled {
		// Check if this requires array traversal (has JSONPlan with non-terminal nodes)
		if len(key.JSONPlan) > 0 && !key.JSONPlan[0].IsTerminal {
			return false
		}
	}
	
	return true
}

func (s *DirectExpressionStrategy) BuildCondition(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := s.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	tblFieldName, err := s.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search - either by FieldContext
	if key.FieldContext == telemetrytypes.FieldContextBody {
		tblFieldName, value = GetBodyJSONKey(ctx, key, operator, value)
	}

	tblFieldName, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, tblFieldName, operator)
	// Regular operators
	return s.applyOperator(sb, tblFieldName, operator, value, column, key, ctx)
}

func (s *DirectExpressionStrategy) applyOperator(
	sb *sqlbuilder.SelectBuilder,
	tblFieldName string,
	operator qbtypes.FilterOperator,
	value any,
	column *schema.Column,
	key *telemetrytypes.TelemetryFieldKey,
	ctx context.Context,
) (string, error) {
	switch operator {
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
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(tblFieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(tblFieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, v := range values {
			conditions = append(conditions, sb.E(tblFieldName, v))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, v := range values {
			conditions = append(conditions, sb.NE(tblFieldName, v))
		}
		return sb.And(conditions...), nil
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		return s.buildExistsCondition(ctx, key, operator, column, sb)
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
	}
}

func (s *DirectExpressionStrategy) buildExistsCondition(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	column *schema.Column,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if key.FieldContext == telemetrytypes.FieldContextBody && !querybuilder.BodyJSONQueryEnabled {
		if operator == qbtypes.FilterOperatorExists {
			return GetBodyJSONKeyForExists(ctx, key, operator, nil), nil
		}
		return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, nil), nil
	}

	var value any
	switch column.Type.GetType() {
	case schema.ColumnTypeEnumJSON:
		tblFieldName, err := s.fm.FieldFor(ctx, key)
		if err != nil {
			return "", err
		}
		if operator == qbtypes.FilterOperatorExists {
			return sb.IsNotNull(tblFieldName), nil
		}
		return sb.IsNull(tblFieldName), nil
	case schema.ColumnTypeEnumLowCardinality:
		switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
		case schema.ColumnTypeEnumString:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(column.Name, value), nil
			}
			return sb.E(column.Name, value), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
		}
	case schema.ColumnTypeEnumString:
		value = ""
		if operator == qbtypes.FilterOperatorExists {
			return sb.NE(column.Name, value), nil
		}
		return sb.E(column.Name, value), nil
	case schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
		value = 0
		if operator == qbtypes.FilterOperatorExists {
			return sb.NE(column.Name, value), nil
		}
		return sb.E(column.Name, value), nil
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
			}
			return sb.NE(leftOperand, true), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
		}
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for column type %s", column.Type)
	}
}
