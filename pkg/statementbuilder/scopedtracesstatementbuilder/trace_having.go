package scopedtracesstatementbuilder

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	qbvariables "github.com/SigNoz/signoz/pkg/variables"
	"github.com/huandu/go-sqlbuilder"
)

// traceHaving is the resolved trace-level filter part: a HAVING predicate over the
// per-trace aliases plus the aliases it references (so scans select only those).
type traceHaving struct {
	pred string
	used map[string]struct{}
}

// resolveTraceHaving resolves a trace-level filter through the standard pipeline
// (variable replacement, then PrepareWhereClause against the per-trace aliases), so
// operators, bound args, and __all__ behave exactly as in span filters. Returns nil
// when the expression is empty or every condition was dropped; args bind into sb.
func (b *scopedTraceStatementBuilder) resolveTraceHaving(ctx context.Context, expr string, variables map[string]qbtypes.VariableItem, sb *sqlbuilder.SelectBuilder) (*traceHaving, error) {
	if strings.TrimSpace(expr) == "" {
		return nil, nil //nolint:nilnil
	}
	// variables are replaced before validation so their literals are not mistaken for
	// aggregate names; an unresolved $var is left in place and fails validation below
	// (as an unknown aggregate — targeted variable errors are a separate concern)
	if len(variables) > 0 {
		replaced, err := qbvariables.ReplaceVariablesInExpression(expr, variables)
		if err != nil {
			return nil, err
		}
		expr = replaced
		if strings.TrimSpace(expr) == "" {
			return nil, nil //nolint:nilnil
		}
	}
	allowed := b.orderableColumnSet()
	// upfront targeted errors; the visitor folds them into a combined "Found N errors"
	if err := validateAggregateFilter(expr, allowed); err != nil {
		return nil, err
	}

	// both spellings resolve here: the key parser strips the trace. prefix into
	// FieldContextTrace, which matches this entry's context
	fieldKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey, len(allowed))
	for alias := range allowed {
		key := &telemetrytypes.TelemetryFieldKey{Name: alias, FieldContext: telemetrytypes.FieldContextTrace}
		fieldKeys[alias] = []*telemetrytypes.TelemetryFieldKey{key}
	}

	cb := &aliasConditionBuilder{allowed: allowed, used: make(map[string]struct{})}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           b.logger,
		ConditionBuilder: cb,
		FieldKeys:        fieldKeys,
		Variables:        variables,
		Builder:          sb,
	})
	if err != nil {
		return nil, err
	}
	if prepared.IsEmpty() {
		return nil, nil //nolint:nilnil
	}
	return &traceHaving{pred: prepared.Expr, used: cb.used}, nil
}

// aliasConditionBuilder renders filter conditions directly against the per-trace
// aliases, recording the ones it touches; a key resolving to no alias is an error.
type aliasConditionBuilder struct {
	allowed map[string]struct{}
	used    map[string]struct{}
}

var _ qbtypes.ConditionBuilder = (*aliasConditionBuilder)(nil)

func (c *aliasConditionBuilder) ConditionFor(
	_ context.Context,
	_ valuer.UUID,
	_, _ uint64,
	key *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	_ qbtypes.ConditionBuilderOptions,
	op qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	matching := keys[key.Name]
	if len(matching) == 0 {
		return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"aggregate %q cannot be used in a trace-level filter; filterable aggregates: %s",
			key.Name, strings.Join(sortedAliases(c.allowed), ", "))
	}
	alias := matching[0].Name
	c.used[alias] = struct{}{}
	col := quoteAlias(alias)

	var cond string
	switch op {
	case qbtypes.FilterOperatorEqual:
		cond = sb.E(col, value)
	case qbtypes.FilterOperatorNotEqual:
		cond = sb.NE(col, value)
	case qbtypes.FilterOperatorGreaterThan:
		cond = sb.G(col, value)
	case qbtypes.FilterOperatorGreaterThanOrEq:
		cond = sb.GE(col, value)
	case qbtypes.FilterOperatorLessThan:
		cond = sb.L(col, value)
	case qbtypes.FilterOperatorLessThanOrEq:
		cond = sb.LE(col, value)
	case qbtypes.FilterOperatorIn, qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			values = []any{value}
		}
		if op == qbtypes.FilterOperatorIn {
			cond = sb.In(col, values...)
		} else {
			cond = sb.NotIn(col, values...)
		}
	case qbtypes.FilterOperatorBetween, qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"between on trace-level aggregate %q requires exactly two values", alias)
		}
		if op == qbtypes.FilterOperatorBetween {
			cond = sb.Between(col, values[0], values[1])
		} else {
			cond = sb.NotBetween(col, values[0], values[1])
		}
	default:
		return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level aggregate %q supports only comparison operators (=, !=, <, <=, >, >=, in, between)", alias)
	}
	return []string{cond}, nil, nil
}
