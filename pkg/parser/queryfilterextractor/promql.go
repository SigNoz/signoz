package queryfilterextractor

import (
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql/parser"
)

// PromQLFilterExtractor extracts metric names and grouping keys from PromQL queries
type PromQLFilterExtractor struct{}

// NewPromQLFilterExtractor creates a new PromQL filter extractor
func NewPromQLFilterExtractor() *PromQLFilterExtractor {
	return &PromQLFilterExtractor{}
}

// Extract parses a PromQL query and extracts metric names and grouping keys
func (e *PromQLFilterExtractor) Extract(query string) (*FilterResult, error) {
	expr, err := parser.ParseExpr(query)
	if err != nil {
		return nil, err
	}

	result := &FilterResult{
		MetricNames: []string{},
		GroupBy:     []string{},
	}

	// Use a visitor to traverse the AST
	visitor := &promQLVisitor{
		metricNames: make(map[string]bool),
		groupBy:     make(map[string]bool),
	}

	// Walk the AST
	if err := parser.Walk(visitor, expr, nil); err != nil {
		return result, err
	}

	// Convert sets to slices
	for metric := range visitor.metricNames {
		result.MetricNames = append(result.MetricNames, metric)
	}
	for groupKey := range visitor.groupBy {
		result.GroupBy = append(result.GroupBy, groupKey)
	}

	return result, nil
}

// promQLVisitor implements the parser.Visitor interface
type promQLVisitor struct {
	metricNames map[string]bool
	groupBy     map[string]bool
	// Track if we've already captured grouping from an outermost aggregation
	hasOutermostGrouping bool
}

func (v *promQLVisitor) Visit(node parser.Node, path []parser.Node) (parser.Visitor, error) {
	if node == nil {
		return nil, nil
	}

	switch n := node.(type) {
	case *parser.VectorSelector:
		v.visitVectorSelector(n)
	case *parser.AggregateExpr:
		v.visitAggregateExpr(n, path)
	case *parser.Call:
		// Function calls may contain VectorSelectors, continue traversal
		return v, nil
	case *parser.BinaryExpr:
		// Binary expressions may contain VectorSelectors on both sides
		return v, nil
	case *parser.SubqueryExpr:
		// Subqueries may contain VectorSelectors
		return v, nil
	case *parser.ParenExpr:
		// Parentheses don't change semantics, continue traversal
		return v, nil
	case *parser.UnaryExpr:
		// Unary expressions may contain VectorSelectors
		return v, nil
	case *parser.MatrixSelector:
		// Matrix selectors wrap VectorSelectors
		return v, nil
	}

	return v, nil
}

func (v *promQLVisitor) visitVectorSelector(vs *parser.VectorSelector) {
	// Check if metric name is specified directly
	if vs.Name != "" {
		v.metricNames[vs.Name] = true
	}

	// Check for __name__ label matcher
	for _, matcher := range vs.LabelMatchers {
		if matcher.Name == "__name__" {
			switch matcher.Type {
			case labels.MatchEqual:
				v.metricNames[matcher.Value] = true
			case labels.MatchNotEqual:
				// Skip per spec - negative filters don't extract metric names
			case labels.MatchRegexp:
				// Skip per spec - regex patterns don't extract exact metric names
			case labels.MatchNotRegexp:
				// Skip per spec - negative regex patterns don't extract exact metric names
			}
		}
	}
}

func (v *promQLVisitor) visitAggregateExpr(ae *parser.AggregateExpr, path []parser.Node) {
	// Count how many AggregateExpr nodes are in the path (excluding current node)
	// This tells us the nesting level
	nestingLevel := 0
	for _, p := range path {
		if _, ok := p.(*parser.AggregateExpr); ok {
			nestingLevel++
		}
	}

	// Only capture grouping from the outermost aggregation (nesting level 0)
	if nestingLevel == 0 && !v.hasOutermostGrouping {
		// If Without is true, we skip grouping per spec
		if !ae.Without && len(ae.Grouping) > 0 {
			v.hasOutermostGrouping = true
			for _, label := range ae.Grouping {
				v.groupBy[label] = true
			}
		}
	}

	// Continue traversal to find metrics in the expression
}
