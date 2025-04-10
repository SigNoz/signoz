package telemetrylogs

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/huandu/go-sqlbuilder"
)

var (
	logsV2Columns = map[string]*schema.Column{
		"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
		"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

		"timestamp":          {Name: "timestamp", Type: schema.ColumnTypeUInt64},
		"observed_timestamp": {Name: "observed_timestamp", Type: schema.ColumnTypeUInt64},
		"id":                 {Name: "id", Type: schema.ColumnTypeString},
		"trace_id":           {Name: "trace_id", Type: schema.ColumnTypeString},
		"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
		"trace_flags":        {Name: "trace_flags", Type: schema.ColumnTypeUInt32},
		"severity_text":      {Name: "severity_text", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"severity_number":    {Name: "severity_number", Type: schema.ColumnTypeUInt8},
		"body":               {Name: "body", Type: schema.ColumnTypeString},
		"attributes_string": {Name: "attributes_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"attributes_number": {Name: "attributes_number", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeFloat64,
		}},
		"attributes_bool": {Name: "attributes_bool", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeBool,
		}},
		"resources_string": {Name: "resources_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"scope_name":    {Name: "scope_name", Type: schema.ColumnTypeString},
		"scope_version": {Name: "scope_version", Type: schema.ColumnTypeString},
		"scope_string": {Name: "scope_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

var _ qbtypes.ConditionBuilder = &conditionBuilder{}

type conditionBuilder struct {
}

func NewConditionBuilder() qbtypes.ConditionBuilder {
	return &conditionBuilder{}
}

func (c *conditionBuilder) GetColumn(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return logsV2Columns["resources_string"], nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return logsV2Columns["scope_name"], nil
		case "version", "scope.version", "scope_version":
			return logsV2Columns["scope_version"], nil
		}
		return logsV2Columns["scope_string"], nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return logsV2Columns["attributes_string"], nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return logsV2Columns["attributes_number"], nil
		case telemetrytypes.FieldDataTypeBool:
			return logsV2Columns["attributes_bool"], nil
		}
	case telemetrytypes.FieldContextLog:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return col, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (c *conditionBuilder) GetTableFieldName(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type {
	case schema.ColumnTypeString,
		schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		schema.ColumnTypeUInt64,
		schema.ColumnTypeUInt32,
		schema.ColumnTypeUInt8:
		return column.Name, nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeFloat64,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeBool,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	}
	// should not reach here
	return column.Name, nil
}

func (c *conditionBuilder) GetCondition(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		return "", err
	}

	tblFieldName, err := c.GetTableFieldName(ctx, key)
	if err != nil {
		return "", err
	}

	tblFieldName, value = telemetrytypes.DataTypeCollisionHandledFieldName(key, value, tblFieldName)

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
		exp := fmt.Sprintf(`match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(exp), nil
	case qbtypes.FilterOperatorNotRegexp:
		exp := fmt.Sprintf(`not match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(exp), nil
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
		return sb.In(tblFieldName, values...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.NotIn(tblFieldName, values...), nil

	// exists and not exists
	// but how could you live and have no story to tell
	// in the UI based query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		var value any
		switch column.Type {
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
			return "", fmt.Errorf("exists operator is not supported for column type %s", column.Type)
		}
	}
	return "", fmt.Errorf("unsupported operator: %v", operator)
}
