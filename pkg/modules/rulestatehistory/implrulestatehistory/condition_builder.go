package implrulestatehistory

import (
	"context"
	"fmt"
	"slices"

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

func newConditionBuilder(fm qbtypes.FieldMapper) qbtypes.ConditionBuilder {
	return &conditionBuilder{fm: fm}
}

// Rule state history has no resource sub-query, so options are unused.
// ConditionFor rejects the logs-only function operators and hands the term to
// the generic flow; rule state history fields have no family support.
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
	// has/hasAny/hasAll/hasToken/search are logs-only functions; reject for rule state history.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}
	scope := querybuilder.CompileScope{OrgID: orgID, StartNs: startNs, EndNs: endNs}
	return querybuilder.CompileTerm(ctx, scope, c, querybuilder.SkipResourceNone, key, logicalFields, fieldKeys, options, operator, value, sb)
}

// AmendEvidence: rule state history folds no intrinsic storage into the evidence.
func (c *conditionBuilder) AmendEvidence(_ context.Context, _ querybuilder.CompileScope, _ *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField {
	return fields
}

// Synthesize: rule state history synthesizes nothing — an unknown key is an error.
func (c *conditionBuilder) Synthesize(_ context.Context, _ querybuilder.CompileScope, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error) {
	return nil, nil, querybuilder.NewKeyNotFoundError(key.Name)
}

// CompileField: single keys only — a family is a wiring error for this signal.
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
	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldName, err := c.fm.FieldFor(ctx, orgID, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldName, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldName, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldName, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldName, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldName, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldName, value), nil
	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldName, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldName, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldName, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldName, value), nil
	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(fieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.In(fieldName, values), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.NotIn(fieldName, values), nil
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		intrinsic := []string{"rule_id", "rule_name", "overall_state", "overall_state_changed", "state", "state_changed", "unix_milli", "fingerprint", "value"}
		if slices.Contains(intrinsic, key.Name) {
			return "true", nil
		}
		if operator == qbtypes.FilterOperatorExists {
			return fmt.Sprintf("JSONHas(labels, %s)", sb.Var(key.Name)), nil
		}
		return fmt.Sprintf("not JSONHas(labels, %s)", sb.Var(key.Name)), nil
	}

	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}
