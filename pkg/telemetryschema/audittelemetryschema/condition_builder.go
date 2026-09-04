package audittelemetryschema

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
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

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldExpression, err := c.fm.FieldFor(ctx, orgID, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldExpression, value), nil
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
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, value := range values {
			cond, err := c.conditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorEqual, value, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		conditions := []string{}
		for _, value := range values {
			cond, err := c.conditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorNotEqual, value, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
		}
		return sb.And(conditions...), nil
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		columns, err := c.fm.ColumnFor(ctx, orgID, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		pred, err := querybuilder.ExistsExpression(columns, key, startNs, endNs, fieldExpression, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(pred), nil
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	options qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {

	// has/hasAny/hasAll/hasToken/search are logs-only functions; reject for audit.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}

	// Audit fields have no family support, so every logical field is
	// single-member and flattens losslessly to its physical key.
	resolved, warning := querybuilder.ResolveLogicalFields(key, querybuilder.MatchingLogicalFields(ctx, orgID, nil, key, fieldKeys))
	keys := querybuilder.SingleKeys(resolved)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}
	if len(keys) == 0 {
		return nil, warnings, querybuilder.NewKeyNotFoundError(key.Name)
	}

	// Drop resource keys the sub-query already covers; if none remain, skip the term (not an error).
	if options.SkipResourceFilter {
		filtered := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys))
		for _, k := range keys {
			if k.FieldContext != telemetrytypes.FieldContextResource {
				filtered = append(filtered, k)
			}
		}
		if len(filtered) == 0 {
			return nil, warnings, nil
		}
		keys = filtered
	}

	conds := make([]string, 0, len(keys))
	for _, k := range keys {
		cond, err := c.conditionForKey(ctx, orgID, startNs, endNs, k, operator, value, sb)
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
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	condition, err := c.conditionFor(ctx, orgID, startNs, endNs, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	if key.FieldContext == telemetrytypes.FieldContextLog {
		return condition, nil
	}
	// scope_name and scope_version are columns; a scope attribute lives in a
	// map and follows the keyless contract like an attribute
	if key.FieldContext == telemetrytypes.FieldContextScope && !c.mapBacked(ctx, orgID, startNs, endNs, key) {
		return condition, nil
	}

	if operator.AddDefaultExistsFilter() {
		existsCondition, err := c.conditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}

	return condition, nil
}

// mapBacked reports whether the key reads a map column, so a row can lack it.
func (c *conditionBuilder) mapBacked(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) bool {
	columns, err := c.fm.ColumnFor(ctx, orgID, startNs, endNs, key)
	return err == nil && len(columns) == 1 && columns[0].Type.GetType() == schema.ColumnTypeEnumMap
}
