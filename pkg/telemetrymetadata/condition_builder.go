package telemetrymetadata

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"strings"
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
	logicalFields []*telemetrytypes.LogicalField,
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
	_ qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {

	// has/hasAny/hasAll/hasToken are logs-body-only; reject to avoid malformed related-values SQL.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}

	// an unknown key simply yields no condition rather than an error
	resolved, warning := querybuilder.ResolveLogicalFields(key, logicalFields)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}

	conds := make([]string, 0, len(resolved))
	for _, logical := range resolved {
		if logical.IsFamily() {
			cond, err := c.conditionForFamily(ctx, orgID, tsStart, tsEnd, logical, operator, value, sb)
			if err != nil {
				return nil, nil, err
			}
			if cond != "" {
				conds = append(conds, cond)
			}
			continue
		}
		cond, err := c.conditionForKey(ctx, orgID, tsStart, tsEnd, logical.Single(), operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		conds = append(conds, cond)
	}
	return conds, warnings, nil
}

// conditionForFamily keeps the merged-value contract of the main query path:
// the operator applies once to the current-first merge (an empty member falls
// through), and the presence guard covers any member with the same polarity
// fallback as a single key.
func (c *conditionBuilder) conditionForFamily(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	logical *telemetrytypes.LogicalField,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	presenceParts := make([]string, 0, len(logical.Members))
	valueParts := make([]string, 0, len(logical.Members))
	for _, member := range logical.Members {
		if member.FieldDataType != telemetrytypes.FieldDataTypeString &&
			member.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			continue
		}
		columns, err := c.fm.ColumnFor(ctx, orgID, tsStart, tsEnd, member)
		if err != nil {
			continue
		}
		fieldExpression, err := c.fm.FieldFor(ctx, orgID, tsStart, tsEnd, member)
		if err != nil {
			continue
		}
		presenceParts = append(presenceParts, fmt.Sprintf("mapContains(%s, %s)", columns[0].Name, sb.Var(member.Name)))
		valueParts = append(valueParts, fmt.Sprintf("NULLIF(%s, '')", fieldExpression))
	}
	if len(presenceParts) == 0 {
		return "", nil
	}

	presence := "(" + strings.Join(presenceParts, " OR ") + ")"
	merged := "COALESCE(" + strings.Join(valueParts, ", ") + ", '')"

	if operator == qbtypes.FilterOperatorExists || operator == qbtypes.FilterOperatorNotExists {
		if operator == qbtypes.FilterOperatorExists {
			return sb.E(presence, true), nil
		}
		return sb.NE(presence, true), nil
	}

	switch operator {
	case qbtypes.FilterOperatorContains,
		qbtypes.FilterOperatorNotContains,
		qbtypes.FilterOperatorILike,
		qbtypes.FilterOperatorNotILike,
		qbtypes.FilterOperatorLike,
		qbtypes.FilterOperatorNotLike:
		value = querybuilder.FormatValueForContains(value)
	}
	merged, value = querybuilder.DataTypeCollisionHandledFieldName(logical.Single(), value, merged, operator)
	cond, err := operatorCondition(merged, operator, value, sb)
	if err != nil || cond == "" {
		return "", err
	}
	return fmt.Sprintf("if(%s, %s, %t)", presence, cond, operator.IsNegativeOperator()), nil
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

	if key.FieldDataType != telemetrytypes.FieldDataTypeString &&
		key.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		// if the field data type is not string, we can't build a condition for related values
		return "", nil
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	// key must exist to apply the main filter. for positive operators the
	// absent-key rows are excluded (fallback false); for negative operators
	// they are kept (fallback true) so rows legitimately lacking the key match.
	keyMissingFallback := operator.IsNegativeOperator()
	expr := `if(mapContains(%s, %s), %s, %t)`

	var cond string

	if operator == qbtypes.FilterOperatorExists || operator == qbtypes.FilterOperatorNotExists {
		// in the query builder, `exists` and `not exists` are used for
		// key membership checks, so depending on the column type, the condition changes
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
	} else {
		var err error
		cond, err = operatorCondition(fieldExpression, operator, value, sb)
		if err != nil {
			return "", err
		}
	}

	return fmt.Sprintf(expr, columns[0].Name, sb.Var(key.Name), cond, keyMissingFallback), nil
}

func operatorCondition(fieldExpression string, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldExpression, value), nil

	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldExpression, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldExpression, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, fieldExpression, sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, fieldExpression, sb.Var(value)), nil

	// `=`+OR / `!=`+AND instead of IN / NOT IN, to make use of the index
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.E(fieldExpression, value))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.NE(fieldExpression, value))
		}
		return sb.And(conditions...), nil
	}
	return "", nil
}
