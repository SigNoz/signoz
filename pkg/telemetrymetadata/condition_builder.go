package telemetrymetadata

import (
	"context"
	"fmt"
	"strconv"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

// Metadata has no resource sub-query, so options are unused.
func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	_ qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {

	// has/hasAny/hasAll/hasToken are logs-body-only; reject to avoid malformed related-values SQL.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}

	// an unknown key simply yields no condition rather than an error. Metadata
	// fields have no family support, so every logical field is single-member
	// and flattens losslessly to its physical key.
	resolved, warning := querybuilder.ResolveLogicalFields(key, querybuilder.MatchingLogicalFields(ctx, orgID, nil, key, fieldKeys))
	keys := querybuilder.SingleKeys(resolved)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}

	conds := make([]string, 0, len(keys))
	for _, k := range keys {
		cond, err := c.conditionForKey(ctx, orgID, tsStart, tsEnd, k, operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		conds = append(conds, cond)
	}
	return conds, warnings, nil
}

func (c *conditionBuilder) conditionForKey(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
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

	columns, err := c.fm.ColumnFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		// if we don't have a column, we can't build a condition for related values
		return "", nil
	}

	fieldExpression, err := c.fm.FieldFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		// if we don't have a table field name, we can't build a condition for related values
		return "", nil
	}

	switch key.FieldDataType {
	case telemetrytypes.FieldDataTypeString, telemetrytypes.FieldDataTypeUnspecified:
		// the metadata maps hold strings only, so a numeric operand is
		// compared in its decimal form instead of casting the map value
		value = numericOperandToString(value)
	case telemetrytypes.FieldDataTypeBool:
		// bool fields are stored as the strings "true" and "false" in the
		// intrinsic map, so the operand is compared in that form against the
		// field as a string
		value = boolOperandToString(value)
		stringKey := *key
		stringKey.FieldDataType = telemetrytypes.FieldDataTypeString
		key = &stringKey
	default:
		// numeric fields are not stored in the metadata maps, so there is no
		// condition to build for related values
		return "", nil
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	// key must exist to apply the main filter. for positive operators the
	// condition is a plain conjunction, which the skip indexes can analyse;
	// for negative operators rows lacking the key are kept (fallback true)
	// so rows legitimately lacking the key match.
	expr := `(mapContains(%s, %s) AND %s)`
	if operator.IsNegativeOperator() {
		expr = `if(mapContains(%s, %s), %s, true)`
	}

	var cond string

	// regular operators
	switch operator {
	// regular operators
	case qbtypes.FilterOperatorEqual:
		cond = sb.E(fieldExpression, value)
	case qbtypes.FilterOperatorNotEqual:
		cond = sb.NE(fieldExpression, value)

	// like and not like
	case qbtypes.FilterOperatorLike:
		cond = sb.Like(fieldExpression, value)
	case qbtypes.FilterOperatorNotLike:
		cond = sb.NotLike(fieldExpression, value)
	case qbtypes.FilterOperatorILike:
		cond = sb.ILike(fieldExpression, value)
	case qbtypes.FilterOperatorNotILike:
		cond = sb.NotILike(fieldExpression, value)

	case qbtypes.FilterOperatorContains:
		cond = sb.ILike(fieldExpression, fmt.Sprintf("%%%s%%", value))
	case qbtypes.FilterOperatorNotContains:
		cond = sb.NotILike(fieldExpression, fmt.Sprintf("%%%s%%", value))

	case qbtypes.FilterOperatorRegexp:
		cond = fmt.Sprintf(`match(%s, %s)`, fieldExpression, sb.Var(value))
	case qbtypes.FilterOperatorNotRegexp:
		cond = fmt.Sprintf(`NOT match(%s, %s)`, fieldExpression, sb.Var(value))

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		cond = sb.In(fieldExpression, values...)
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		cond = sb.NotIn(fieldExpression, values...)

	// exists and not exists
	// in the query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		switch columns[0].Type {
		case schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}:
			leftOperand := fmt.Sprintf("mapContains(%s, '%s')", columns[0].Name, key.Name)
			if operator == qbtypes.FilterOperatorExists {
				cond = sb.E(leftOperand, true)
			} else {
				cond = sb.NE(leftOperand, true)
			}
		}
	}

	return fmt.Sprintf(expr, columns[0].Name, sb.Var(key.Name), cond), nil
}

// numericOperandToString converts a numeric operand, or a list of them, to
// its decimal string form. Other values are returned unchanged.
func numericOperandToString(value any) any {
	switch v := value.(type) {
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = numericOperandToString(item)
		}
		return out
	}
	return value
}

// boolOperandToString converts a bool operand, or a list of them, to the
// "true"/"false" strings stored in the metadata maps. Other values are
// returned unchanged.
func boolOperandToString(value any) any {
	switch v := value.(type) {
	case bool:
		return strconv.FormatBool(v)
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = boolOperandToString(item)
		}
		return out
	}
	return value
}
