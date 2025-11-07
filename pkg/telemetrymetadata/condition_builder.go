package telemetrymetadata

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
    _ uint64,
    _ uint64,
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

	tblFieldName, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, tblFieldName, operator)

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
		cond = fmt.Sprintf(`NOT match(%s, %s)`, tblFieldName, sb.Var(value))

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
		cond = sb.Or(conditions...)
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
		cond = sb.And(conditions...)

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
