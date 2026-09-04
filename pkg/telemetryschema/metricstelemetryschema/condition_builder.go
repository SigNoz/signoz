package metricstelemetryschema

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/huandu/go-sqlbuilder"
)

// Labels read back as String from the `labels` JSON whatever type the metadata claims, so the
// collision is always String vs the literal; intrinsic columns keep their own type.
func resolveTypeCollisionForFieldName(fieldExpression string, value any) string {
	if col, isColumn := timeSeriesV4Columns[fieldExpression]; isColumn {
		columnType := col.Type.GetType()
		if lowCardinality, ok := col.Type.(schema.LowCardinalityColumnType); ok {
			columnType = lowCardinality.ElementType.GetType()
		}
		if columnType != schema.ColumnTypeEnumString {
			return fieldExpression
		}
	}

	switch value.(type) {
	case bool:
		return fmt.Sprintf("accurateCastOrNull(%s, 'Bool')", fieldExpression)
	case float64:
		return fmt.Sprintf("toFloat64OrNull(%s)", fieldExpression)
	}
	return fieldExpression
}

// Compile casts by the operand: labels read back as String from the labels
// JSON whatever type the metadata claims, and intrinsic columns keep their
// own type. The operator switch is the shared one. No label takes a guard:
// an absent label reads the empty string, and that is the keyless contract.
func (s *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	condition, err := s.condition(ctx, q, logical, operator, value, sb)
	if err != nil {
		return qbtypes.Compiled{}, err
	}
	return qbtypes.Compiled{Condition: condition}, nil
}

func (s *storage) condition(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorIn, qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		itemOperator := qbtypes.FilterOperatorEqual
		if operator == qbtypes.FilterOperatorNotIn {
			itemOperator = qbtypes.FilterOperatorNotEqual
		}
		conditions := make([]string, 0, len(values))
		for _, item := range values {
			condition, err := s.condition(ctx, q, logical, itemOperator, item, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, condition)
		}
		// `=`+OR and `!=`+AND instead of IN and NOT IN, to make use of the index
		if operator == qbtypes.FilterOperatorIn {
			return sb.Or(conditions...), nil
		}
		return sb.And(conditions...), nil
	}

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}
	read, err := querybuilder.LogicalValueExpr(ctx, q, s, logical)
	if err != nil {
		return "", err
	}
	switch operator {
	case qbtypes.FilterOperatorBetween, qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		// both bounds share one expression, so the lower bound picks the cast
		read = resolveTypeCollisionForFieldName(read, values[0])
	default:
		read = resolveTypeCollisionForFieldName(read, value)
	}
	return querybuilder.OperatorCondition(ctx, q, s, logical, read, operator, value, sb)
}
