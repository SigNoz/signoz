package scopedtracesstatementbuilder

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
// per-trace aliases plus the aliases it references (so scans select only those).
type traceHaving struct {
	pred string
	used map[string]struct{}
}

// resolveTraceHaving runs a trace-level filter through the standard where-clause
// pipeline against the per-trace aliases, so operators, bound args, and __all__ behave
// as in span filters. Returns nil when nothing is left to filter; args bind into sb.
func (b *scopedTraceStatementBuilder) resolveTraceHaving(ctx context.Context, expr string, variables map[string]qbtypes.VariableItem, sb *sqlbuilder.SelectBuilder) (*traceHaving, error) {
	if strings.TrimSpace(expr) == "" {
		return nil, nil //nolint:nilnil
	}
	// replaced before validation so variable literals are not mistaken for aggregate
	// names; an unresolved $var is left in place and fails validation as an unknown one
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
	allowed := b.filterableColumnSet()
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

	storage := &aliasStorage{allowed: allowed, used: make(map[string]struct{})}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:   ctx,
		Query:     qbtypes.QueryInfo{Signal: telemetrytypes.SignalTraces},
		Storage:   storage,
		Logger:    b.logger,
		FieldKeys: fieldKeys,
		Variables: variables,
		Builder:   sb,
	})
	if err != nil {
		return nil, err
	}
	if prepared.IsEmpty() {
		return nil, nil //nolint:nilnil
	}
	return &traceHaving{pred: prepared.Expr, used: storage.used}, nil
}

// aliasStorage renders filter conditions directly against the per-trace
// aliases, recording the ones it touches. Every alias is a computed column,
// present in every row; a key resolving to no alias is an error.
type aliasStorage struct {
	allowed map[string]struct{}
	used    map[string]struct{}
}

var _ qbtypes.Storage = (*aliasStorage)(nil)

func (s *aliasStorage) Read(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	s.used[key.Name] = struct{}{}
	return quoteAlias(key.Name), nil
}

func (s *aliasStorage) Exists(context.Context, qbtypes.QueryInfo, *telemetrytypes.TelemetryFieldKey, bool) (qbtypes.Existence, error) {
	return qbtypes.Existence{Predicate: "true", WhenAbsent: qbtypes.AlwaysPresent}, nil
}

func (s *aliasStorage) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) ([]*telemetrytypes.LogicalField, error) {
	return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
		"aggregate %q cannot be used in a trace-level filter; filterable aggregates: %s",
		key.Name, strings.Join(sortedAliases(s.allowed), ", "))
}

func (s *aliasStorage) Traits() qbtypes.Traits {
	return qbtypes.Traits{}
}

// Compile supports the comparison operators only: an aggregate is a number.
func (s *aliasStorage) Compile(_ context.Context, _ qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, op qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	alias := logical.Single().Name
	s.used[alias] = struct{}{}
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
			return qbtypes.Compiled{}, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"between on trace-level aggregate %q requires exactly two values", alias)
		}
		if op == qbtypes.FilterOperatorBetween {
			cond = sb.Between(col, values[0], values[1])
		} else {
			cond = sb.NotBetween(col, values[0], values[1])
		}
	default:
		return qbtypes.Compiled{}, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level aggregate %q supports only comparison operators (=, !=, <, <=, >, >=, in, between)", alias)
	}
	return qbtypes.Compiled{Condition: cond}, nil
}

func (s *aliasStorage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return querybuilder.DefaultRead(ctx, q, s, logical)
}
