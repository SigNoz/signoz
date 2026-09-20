package oceanbasetelemetryschema

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type ConditionBuilder struct{ Signal telemetrytypes.Signal }

var _ qbtypes.Storage = ConditionBuilder{}

func (c ConditionBuilder) Read(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (qbtypes.Read, error) {
	field, err := Field(c.Signal, *key)
	if err != nil {
		return qbtypes.Read{}, err
	}
	absent := qbtypes.AbsentIsNull
	if strings.HasPrefix(field, "`") {
		absent = qbtypes.AlwaysPresent
	}
	return qbtypes.Read{SQL: field, Presence: field + " IS NOT NULL", Absence: field + " IS NULL", WhenAbsent: absent}, nil
}

func (c ConditionBuilder) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) ([]*telemetrytypes.LogicalField, error) {
	if _, err := Field(c.Signal, *key); err != nil {
		return nil, err
	}
	resolved := *key
	resolved.Signal = c.Signal
	return []*telemetrytypes.LogicalField{telemetrytypes.SingleLogicalField(key.Name, &resolved)}, nil
}

func (ConditionBuilder) Traits() qbtypes.Traits { return qbtypes.Traits{} }

func (c ConditionBuilder) Compile(_ context.Context, _ qbtypes.QueryInfo, field *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	if field.IsFamily() {
		return qbtypes.Compiled{}, telemetrystore.Unsupported("semantic convention families")
	}
	conditions, warnings, err := c.conditionFor(field.Single(), operator, value, sb)
	if err != nil {
		return qbtypes.Compiled{}, err
	}
	return qbtypes.Compiled{Condition: strings.Join(conditions, " AND "), Warnings: warnings}, nil
}

func (c ConditionBuilder) conditionFor(key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) ([]string, []string, error) {
	field, err := Field(c.Signal, *key)
	if err != nil {
		return nil, nil, err
	}
	if key.FieldDataType == telemetrytypes.FieldDataTypeFloat64 {
		field = Numeric(field)
	}
	probe := value
	if values, ok := value.([]any); ok && len(values) > 0 {
		probe = values[0]
	}
	switch probe.(type) {
	case float64, int64, int:
		if key.FieldDataType != telemetrytypes.FieldDataTypeFloat64 {
			field = Numeric(field)
		}
	case bool:
		if values, ok := value.([]any); ok {
			converted := make([]any, len(values))
			for i, item := range values {
				converted[i] = fmt.Sprint(item)
			}
			value = converted
		} else {
			value = fmt.Sprint(value)
		}
	case string:
		// ClickHouse string comparisons are case-sensitive. A MySQL table's
		// default case-insensitive collation must not broaden the filter.
		field = "CAST(" + field + " AS CHAR) COLLATE utf8mb4_bin"
	}
	var condition string
	switch operator {
	case qbtypes.FilterOperatorEqual:
		condition = sb.E(field, value)
	case qbtypes.FilterOperatorNotEqual:
		condition = sb.NE(field, value)
	case qbtypes.FilterOperatorGreaterThan:
		condition = sb.G(field, value)
	case qbtypes.FilterOperatorGreaterThanOrEq:
		condition = sb.GE(field, value)
	case qbtypes.FilterOperatorLessThan:
		condition = sb.L(field, value)
	case qbtypes.FilterOperatorLessThanOrEq:
		condition = sb.LE(field, value)
	case qbtypes.FilterOperatorExists:
		condition = field + " IS NOT NULL"
	case qbtypes.FilterOperatorNotExists:
		condition = field + " IS NULL"
	case qbtypes.FilterOperatorIn, qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok || len(values) == 0 {
			return nil, nil, qbtypes.ErrInValues
		}
		if operator == qbtypes.FilterOperatorIn {
			condition = sb.In(field, values...)
		} else {
			condition = sb.NotIn(field, values...)
		}
	case qbtypes.FilterOperatorBetween, qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return nil, nil, qbtypes.ErrBetweenValues
		}
		if operator == qbtypes.FilterOperatorBetween {
			condition = sb.Between(field, values[0], values[1])
		} else {
			condition = sb.NotBetween(field, values[0], values[1])
		}
	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains, qbtypes.FilterOperatorLike, qbtypes.FilterOperatorNotLike, qbtypes.FilterOperatorILike, qbtypes.FilterOperatorNotILike:
		text, ok := value.(string)
		if !ok {
			return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "string filter requires a string value")
		}
		if operator == qbtypes.FilterOperatorContains || operator == qbtypes.FilterOperatorNotContains {
			text = "%" + strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(text) + "%"
		}
		if operator == qbtypes.FilterOperatorILike || operator == qbtypes.FilterOperatorNotILike || operator == qbtypes.FilterOperatorContains || operator == qbtypes.FilterOperatorNotContains {
			field = "LOWER(" + field + ")"
			text = strings.ToLower(text)
		}
		op := " LIKE "
		if operator.IsNegativeOperator() {
			op = " NOT LIKE "
		}
		condition = field + op + sb.Var(text)
		if operator == qbtypes.FilterOperatorContains || operator == qbtypes.FilterOperatorNotContains {
			condition += " ESCAPE '!'"
		}
	default:
		return nil, nil, telemetrystore.Unsupported(fmt.Sprintf("filter operator %v", operator))
	}
	// SigNoz's negative-operator semantics include records lacking the key.
	if operator.IsNegativeOperator() && operator != qbtypes.FilterOperatorNotExists {
		condition = "(" + field + " IS NULL OR " + condition + ")"
	}
	return []string{condition}, nil, nil
}
