package prometheus

import (
	"context"

	"github.com/prometheus/prometheus/promql/parser"
)

type queryTraitsKey struct{}

// QueryTraits carries per-query facts a storage implementation cannot derive
// from SelectHints alone. Call sites that parse the PromQL expression attach
// traits to the context before handing it to the engine; storages treat a
// missing traits value as "unknown" and stay conservative.
type QueryTraits struct {
	// SubqueryFree is true when the query contains no subquery expression.
	// Subquery selectors are evaluated at the subquery's own step, but
	// SelectHints.Step always carries the top-level step, so step-aligned
	// storage optimizations (e.g. keeping only the last sample per step
	// bucket) are safe only when this is true.
	SubqueryFree bool
}

// DetectQueryTraits derives QueryTraits from a parsed PromQL expression.
func DetectQueryTraits(expr parser.Expr) QueryTraits {
	subqueryFree := true
	parser.Inspect(expr, func(node parser.Node, _ []parser.Node) error {
		if _, ok := node.(*parser.SubqueryExpr); ok {
			subqueryFree = false
		}
		return nil
	})
	return QueryTraits{SubqueryFree: subqueryFree}
}

// NewContextWithQueryTraits returns a context carrying the given traits.
func NewContextWithQueryTraits(ctx context.Context, traits QueryTraits) context.Context {
	return context.WithValue(ctx, queryTraitsKey{}, traits)
}

// QueryTraitsFromContext returns the traits attached to ctx, if any.
//
// Context is used here, unlike for backend selection, because traits must
// cross the promql engine to reach storage.Querier.Select, and the engine's
// interfaces offer no other channel; the alternative is a Prometheus fork.
func QueryTraitsFromContext(ctx context.Context) (QueryTraits, bool) {
	traits, ok := ctx.Value(queryTraitsKey{}).(QueryTraits)
	return traits, ok
}
