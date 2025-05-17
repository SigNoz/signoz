package telemetrymetadata

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := c.fm.ColumnFor(ctx, key)
	if err != nil {
		// if we don't have a column, we can't build a condition for related values
		return "", nil
	}

	tblFieldName, err := c.fm.FieldFor(ctx, key)
	if err != nil {
		// if we don't have a table field name, we can't build a condition for related values
		return "", nil
	}

	if key.FieldDataType != telemetrytypes.FieldDataTypeString &&
		key.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		// if the field data type is not string, we can't build a condition for related values
		return "", nil
	}

	tblFieldName, value = telemetrytypes.DataTypeCollisionHandledFieldName(key, value, tblFieldName)

	// key must exists to apply main filter
	expr := `if(mapContains(%s, %s), %s, true)`

	var cond string

	// regular operators
	switch operator {
	// regular operators
	case qbtypes.FilterOperatorEqual:
		cond = sb.E(tblFieldName, value)
	case qbtypes.FilterOperatorNotEqual:
		cond = sb.NE(tblFieldName, value)

	// like and not like
	case qbtypes.FilterOperatorLike:
		cond = sb.Like(tblFieldName, value)
	case qbtypes.FilterOperatorNotLike:
		cond = sb.NotLike(tblFieldName, value)
	case qbtypes.FilterOperatorILike:
		cond = sb.ILike(tblFieldName, value)
	case qbtypes.FilterOperatorNotILike:
		cond = sb.NotILike(tblFieldName, value)

	case qbtypes.FilterOperatorContains:
		cond = sb.ILike(tblFieldName, fmt.Sprintf("%%%s%%", value))
	case qbtypes.FilterOperatorNotContains:
		cond = sb.NotILike(tblFieldName, fmt.Sprintf("%%%s%%", value))

	case qbtypes.FilterOperatorRegexp:
		cond = fmt.Sprintf(`match(%s, %s)`, tblFieldName, sb.Var(value))
	case qbtypes.FilterOperatorNotRegexp:
		cond = fmt.Sprintf(`not match(%s, %s)`, tblFieldName, sb.Var(value))

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		cond = sb.In(tblFieldName, values...)
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		cond = sb.NotIn(tblFieldName, values...)

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
				cond = sb.E(leftOperand, true)
			} else {
				cond = sb.NE(leftOperand, true)
			}
		}
	}

	return fmt.Sprintf(expr, column.Name, sb.Var(key.Name), cond), nil
}
