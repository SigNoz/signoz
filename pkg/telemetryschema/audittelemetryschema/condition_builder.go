package audittelemetryschema

import (
	"context"
	"fmt"

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

// ConditionFor rejects the logs-only function operators and hands the term to
// the generic flow; audit fields have no family support.
func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	logicalFields []*telemetrytypes.LogicalField,
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
	// The family refusal runs before the generic flow (and its resource
	// drop), so a mis-wired family fails loudly instead of dropping silently.
	for _, logical := range logicalFields {
		if logical.IsFamily() {
			return nil, nil, errors.NewInternalf(errors.CodeInternal, "field %q resolved to a family, and this signal compiles single keys only", logical.Name)
		}
	}
	scope := querybuilder.CompileScope{OrgID: orgID, StartNs: startNs, EndNs: endNs}
	return querybuilder.CompileTerm(ctx, scope, c, querybuilder.SkipResourceDrop, key, logicalFields, fieldKeys, options, operator, value, sb)
}

// AmendEvidence: audit folds no intrinsic storage into the evidence.
func (c *conditionBuilder) AmendEvidence(_ context.Context, _ querybuilder.CompileScope, _ *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField {
	return fields
}

// Synthesize: audit synthesizes nothing — an unknown key is an error.
func (c *conditionBuilder) Synthesize(_ context.Context, _ querybuilder.CompileScope, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error) {
	return nil, nil, querybuilder.NewKeyNotFoundError(key.Name)
}

// CompileField: audit compiles single keys only — a family is a wiring error,
// because this signal has no family compiler and flattening would silently
// read one spelling.
func (c *conditionBuilder) CompileField(ctx context.Context, scope querybuilder.CompileScope, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, []string, error) {
	if logical.IsFamily() {
		return "", nil, errors.NewInternalf(errors.CodeInternal, "field %q resolved to a family, and this signal compiles single keys only", logical.Name)
	}
	cond, err := c.conditionForKey(ctx, scope.OrgID, scope.StartNs, scope.EndNs, logical.Single(), operator, value, sb)
	return cond, nil, err
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

	if key.FieldContext == telemetrytypes.FieldContextLog || key.FieldContext == telemetrytypes.FieldContextScope {
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
