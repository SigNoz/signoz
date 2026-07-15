package telemetryscopedtraces

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	qbvariables "github.com/SigNoz/signoz/pkg/variables"
	"github.com/huandu/go-sqlbuilder"
)

// traceHaving is the resolved trace-level filter part: a HAVING predicate over the
// per-trace column aliases (escaped, `?` placeholders) plus the aliases it references
// (so scans select only what the predicate needs).
type traceHaving struct {
	pred string
	args []any
	used map[string]struct{}
}

// resolveTraceHaving resolves a trace-level filter expression through the standard
// filter pipeline (PrepareWhereClause) against the per-trace column aliases, so
// operators and bound args behave exactly as in span-level filters. Query variables
// are resolved by the canonical replacement (pkg/variables) first — a dynamic
// variable set to __all__ drops its condition for any operator — and the resulting
// literals are then parsed and bound as args. Returns nil when the expression is
// empty or every condition was dropped.
func (b *scopedTraceStatementBuilder) resolveTraceHaving(ctx context.Context, expr string, variables map[string]qbtypes.VariableItem) (*traceHaving, error) {
	if strings.TrimSpace(expr) == "" {
		return nil, nil
	}
	allowed := b.orderableColumnSet()
	// upfront targeted errors: the visitor folds condition errors into a combined
	// "Found N errors" whose details are not part of the error message
	if err := validateAggregateFilter(expr, allowed); err != nil {
		return nil, err
	}
	if err := querybuilder.ValidateVariablesInExpr(expr, variables); err != nil {
		return nil, err
	}
	if len(variables) > 0 {
		replaced, err := qbvariables.ReplaceVariablesInExpression(expr, variables)
		if err != nil {
			return nil, err
		}
		expr = replaced
		if strings.TrimSpace(expr) == "" {
			return nil, nil
		}
	}

	// every user-facing spelling of an alias resolves to the same synthetic key:
	// bare + trace.-prefixed here; tracefield. parses to FieldContextTrace, which
	// matches the bare entry's context
	fieldKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey, len(allowed)*2)
	for alias := range allowed {
		key := &telemetrytypes.TelemetryFieldKey{Name: alias, FieldContext: telemetrytypes.FieldContextTrace}
		fieldKeys[alias] = []*telemetrytypes.TelemetryFieldKey{key}
		fieldKeys["trace."+alias] = []*telemetrytypes.TelemetryFieldKey{key}
	}

	cb := &aliasConditionBuilder{allowed: allowed, used: make(map[string]struct{})}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           b.logger,
		ConditionBuilder: cb,
		FieldKeys:        fieldKeys,
		Variables:        variables,
	})
	if err != nil {
		return nil, err
	}
	if prepared.IsEmpty() {
		return nil, nil
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("1")
	sb.AddWhereClause(prepared.WhereClause)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	pred := sql[strings.Index(sql, "WHERE ")+len("WHERE "):]
	return &traceHaving{pred: sqlbuilder.Escape(pred), args: args, used: cb.used}, nil
}

// aliasConditionBuilder renders filter conditions directly against the per-trace
// column aliases. It records the aliases it touches; a key that resolves to no alias
// is an unknown/unfilterable aggregate.
type aliasConditionBuilder struct {
	allowed map[string]struct{}
	used    map[string]struct{}
}

var _ qbtypes.ConditionBuilder = (*aliasConditionBuilder)(nil)

func (c *aliasConditionBuilder) ConditionFor(
	_ context.Context,
	_, _ uint64,
	key *telemetrytypes.TelemetryFieldKey,
	matching []*telemetrytypes.TelemetryFieldKey,
	op qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	if len(matching) == 0 {
		name := strings.TrimPrefix(strings.TrimPrefix(key.Name, "tracefield."), "trace.")
		return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"aggregate %q cannot be used in an AI trace-list filter; filterable aggregates: %s",
			name, strings.Join(sortedAliases(c.allowed), ", "))
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
