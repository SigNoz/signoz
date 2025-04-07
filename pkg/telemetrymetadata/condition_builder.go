package telemetrymetadata

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types"
	qbtypes "github.com/SigNoz/signoz/pkg/types/qbtypes/v5"
	"github.com/huandu/go-sqlbuilder"
)

var (
	mainColumns = map[string]*schema.Column{
		"resource_attributes": {Name: "resource_attributes", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"attributes": {Name: "attributes", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

type conditionBuilder struct {
}

func NewConditionBuilder() types.ConditionBuilder {
	return &conditionBuilder{}
}

func (c *conditionBuilder) GetColumn(ctx context.Context, key types.TelemetryFieldKey) (*schema.Column, error) {
	switch key.FieldContext {
	case types.FieldContextResource:
		return mainColumns["resource_attributes"], nil
	case types.FieldContextAttribute:
		return mainColumns["attributes"], nil
	}
	return nil, types.ErrColumnNotFound
}

func (c *conditionBuilder) GetTableFieldName(ctx context.Context, key types.TelemetryFieldKey) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type {
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}:
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	}
	return column.Name, nil
}

func (c *conditionBuilder) GetCondition(
	ctx context.Context,
	key types.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		// if we don't have a column, we can't build a condition for related values
		return "", nil
	}

	tblFieldName, err := c.GetTableFieldName(ctx, key)
	if err != nil {
		// if we don't have a table field name, we can't build a condition for related values
		return "", nil
	}

	if key.FieldDataType != types.FieldDataTypeString {
		// if the field data type is not string, we can't build a condition for related values
		return "", nil
	}

	// key must exists to apply main filter
	containsExp := fmt.Sprintf("mapContains(%s, %s)", column.Name, sb.Var(key.Name))

	// regular operators
	switch operator {
	// regular operators
	case qbtypes.FilterOperatorEqual:
		return sb.And(containsExp, sb.E(tblFieldName, value)), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.And(containsExp, sb.NE(tblFieldName, value)), nil

	// like and not like
	case qbtypes.FilterOperatorLike:
		return sb.And(containsExp, sb.Like(tblFieldName, value)), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.And(containsExp, sb.NotLike(tblFieldName, value)), nil
	case qbtypes.FilterOperatorILike:
		return sb.And(containsExp, sb.ILike(tblFieldName, value)), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.And(containsExp, sb.NotILike(tblFieldName, value)), nil

	case qbtypes.FilterOperatorContains:
		return sb.And(containsExp, sb.ILike(tblFieldName, value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.And(containsExp, sb.NotILike(tblFieldName, value)), nil

	case qbtypes.FilterOperatorRegexp:
		exp := fmt.Sprintf(`match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(containsExp, exp), nil
	case qbtypes.FilterOperatorNotRegexp:
		exp := fmt.Sprintf(`not match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(containsExp, exp), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", types.ErrInValues
		}
		return sb.And(containsExp, sb.In(tblFieldName, values...)), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", types.ErrInValues
		}
		return sb.And(containsExp, sb.NotIn(tblFieldName, values...)), nil

	// exists and not exists
	// in the query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		switch column.Type {
		case schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}:
			leftOperand := fmt.Sprintf("mapContains(%s, '%s')", column.Name, key.Name)
			if operator == qbtypes.FilterOperatorExists {
				return sb.E(leftOperand, true), nil
			} else {
				return sb.NE(leftOperand, true), nil
			}
		}
	}

	return "", nil
}
