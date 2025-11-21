package telemetrytraces

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

var _ qbtypes.ConditionBuilder = (*conditionBuilder)(nil)

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

	// first, locate the raw column type (so we can choose the right EXISTS logic)
	column, err := c.fm.ColumnFor(ctx, key)
	if err != nil {
		return "", err
	}

	// then ask the mapper for the actual SQL reference
	tblFieldName, err := c.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	// TODO(srikanthccv): maybe extend this to every possible attribute
	if key.Name == "duration_nano" || key.Name == "durationNano" { // QoL improvement
		if strDuration, ok := value.(string); ok {
			duration, err := time.ParseDuration(strDuration)
			if err == nil {
				value = duration.Nanoseconds()
			} else {
				duration, err := strconv.ParseFloat(strDuration, 64)
				if err == nil {
					value = duration
				} else {
					return "", errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid duration value: %s", strDuration)
				}
			}
		}
	} else {
		tblFieldName, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, tblFieldName, operator)
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
	// in the query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:

		var value any
		switch column.Type {
		case schema.JSONColumnType{}:
			if operator == qbtypes.FilterOperatorExists {
				return sb.IsNotNull(tblFieldName), nil
			} else {
				return sb.IsNull(tblFieldName), nil
			}
		case schema.ColumnTypeString,
			schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			schema.FixedStringColumnType{Length: 32},
			schema.DateTime64ColumnType{Precision: 9, Timezone: "UTC"}:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.ColumnTypeUInt64,
			schema.ColumnTypeUInt32,
			schema.ColumnTypeUInt8,
			schema.ColumnTypeInt8,
			schema.ColumnTypeInt16,
			schema.ColumnTypeBool:
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
	return "", nil
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
    startNs uint64,
    _ uint64,
) (string, error) {
	if c.isSpanScopeField(key.Name) {
		return c.buildSpanScopeCondition(key, operator, value, startNs)
	}

	condition, err := c.conditionFor(ctx, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	if operator.AddDefaultExistsFilter() {
		// skip adding exists filter for intrinsic fields
		field, _ := c.fm.FieldFor(ctx, key)
		if slices.Contains(maps.Keys(IntrinsicFields), field) ||
			slices.Contains(maps.Keys(IntrinsicFieldsDeprecated), field) ||
			slices.Contains(maps.Keys(CalculatedFields), field) ||
			slices.Contains(maps.Keys(CalculatedFieldsDeprecated), field) {
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

func (c *conditionBuilder) isSpanScopeField(name string) bool {
	keyName := strings.ToLower(name)
	return keyName == SpanSearchScopeRoot || keyName == SpanSearchScopeEntryPoint
}

func (c *conditionBuilder) buildSpanScopeCondition(key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, startNs uint64) (string, error) {
	if operator != qbtypes.FilterOperatorEqual {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s only supports '=' operator", key.Name)
	}

	isTrue := false
	switch v := value.(type) {
	case bool:
		isTrue = v
	case string:
		isTrue = strings.ToLower(v) == "true"
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s expects boolean value, got %T", key.Name, value)
	}

	if !isTrue {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s can only be filtered with value 'true'", key.Name)
	}

	keyName := strings.ToLower(key.Name)
	switch keyName {
	case SpanSearchScopeRoot:
		return "parent_span_id = ''", nil
	case SpanSearchScopeEntryPoint:
		if startNs > 0 { // only add time filter if it is a valid time, else do not add
			startS := int64(startNs / 1_000_000_000)
			return fmt.Sprintf("((name, resource_string_service$$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from %s.%s WHERE time >= toDateTime(%d))) AND parent_span_id != ''",
				DBName, TopLevelOperationsTableName, startS), nil
		}
		return fmt.Sprintf("((name, resource_string_service$$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from %s.%s)) AND parent_span_id != ''",
			DBName, TopLevelOperationsTableName), nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid span search scope: %s", key.Name)
	}
}
