package querybuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// SplitFilterForAggregates partitions a single filter expression into a span-level
// part (a WHERE over spans) and a trace-level part (a HAVING over per-trace
// aggregates), splitting on the top-level AND.
//
// A key is trace-level when it carries the trace field context (`trace.completion_tokens`)
// or, with no context, its bare name is in aggregateNames. Any other explicit context
// (`span.`, `resource.`, …) is span-level. Trace-level and span-level keys may be
// AND-combined (they run at different query stages) but not OR-combined; an OR that
// mixes the two is an error.
//
// Syntax errors are ignored here — each part is re-parsed downstream (PrepareWhereClause
// for the span part, the HAVING rewriter for the trace part), which surface them.
func SplitFilterForAggregates(query string, aggregateNames map[string]struct{}) (spanExpr string, havingExpr string, err error) {
	if strings.TrimSpace(query) == "" {
		return "", "", nil
	}

	s := filterSplitter{query: []rune(query), aggregateNames: aggregateNames}
	s.visit(parseFilterQuery(query))

	if s.mixed {
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level and span-level filters cannot be combined within an OR/NOT group; separate them with a top-level AND")
	}
	return strings.Join(s.span, " AND "), strings.Join(s.having, " AND "), nil
}

func parseFilterQuery(query string) antlr.Tree {
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(query))
	lexer.RemoveErrorListeners()
	parser := grammar.NewFilterQueryParser(antlr.NewCommonTokenStream(lexer, 0))
	parser.RemoveErrorListeners()
	return parser.Query()
}

// filterSplitter walks the parse tree once, flattening the top-level AND chain and
// routing each atom (a comparison, a NOT expression, or a whole multi-branch OR group)
// to the span or having bucket by the class of the keys it references.
type filterSplitter struct {
	query          []rune
	aggregateNames map[string]struct{}
	span           []string
	having         []string
	mixed          bool
}

func (s *filterSplitter) visit(node antlr.Tree) {
	switch n := node.(type) {
	case *grammar.QueryContext:
		if n.Expression() != nil {
			s.visit(n.Expression())
		}
	case *grammar.ExpressionContext:
		if n.OrExpression() != nil {
			s.visit(n.OrExpression())
		}
	case *grammar.OrExpressionContext:
		// a single branch is just an AND chain; multiple branches are a real OR, kept
		// whole so a class-mixing OR can be rejected.
		if ands := n.AllAndExpression(); len(ands) == 1 {
			s.visit(ands[0])
		} else {
			s.route(n)
		}
	case *grammar.AndExpressionContext:
		for _, u := range n.AllUnaryExpression() {
			s.visit(u)
		}
	case *grammar.UnaryExpressionContext:
		if n.NOT() != nil {
			s.route(n)
		} else if n.Primary() != nil {
			s.visit(n.Primary())
		}
	case *grammar.PrimaryContext:
		if n.OrExpression() != nil { // parenthesized sub-expression
			s.visit(n.OrExpression())
		} else {
			s.route(n)
		}
	}
}

// route classifies an atom and appends its original source text to the right bucket.
func (s *filterSplitter) route(atom antlr.ParserRuleContext) {
	isTrace, isSpan := classifyKeys(atom, s.aggregateNames)
	if isTrace && isSpan {
		s.mixed = true
		return
	}
	text := atomSourceText(s.query, atom)
	// A multi-branch OR group's source slice excludes its enclosing parens (they belong
	// to the parent Primary). Re-wrap it so rejoining a bucket with " AND " cannot invert
	// OR/AND precedence, e.g. `a AND (b OR c)` must not flatten to `a AND b OR c`.
	if or, ok := atom.(*grammar.OrExpressionContext); ok && len(or.AllAndExpression()) > 1 {
		text = "(" + text + ")"
	}
	if isTrace {
		s.having = append(s.having, text)
	} else {
		s.span = append(s.span, text)
	}
}

// classifyKeys reports whether a subtree references trace-level and/or span-level keys.
// A key is trace-level when it carries the trace field context or, with no context,
// its name is a known aggregate; an unknown name under the trace context stays
// trace-level so the aggregate validation rejects it with a targeted error. Any other
// explicit context (`span.`, `resource.`, …) is span-level.
func classifyKeys(node antlr.Tree, aggregateNames map[string]struct{}) (isTrace, isSpan bool) {
	kc, ok := node.(*grammar.KeyContext)
	if ok {
		key := telemetrytypes.GetFieldKeyFromKeyText(kc.GetText())
		switch key.FieldContext {
		case telemetrytypes.FieldContextTrace:
			isTrace = true
		case telemetrytypes.FieldContextUnspecified:
			_, isTrace = aggregateNames[key.Name]
			isSpan = !isTrace
		default:
			isSpan = true
		}
		return
	}
	for i := 0; i < node.GetChildCount(); i++ {
		t, s := classifyKeys(node.GetChild(i), aggregateNames)
		isTrace = isTrace || t
		isSpan = isSpan || s
	}
	return
}

// atomSourceText returns the original source substring for an atom, preserving
// whitespace. The token stream drops skipped whitespace, which would glue word
// operators (OR/AND/NOT) to their operands, so slice the input by token offsets.
// ANTLR offsets are rune indices (InputStream holds []rune), hence the rune slice.
func atomSourceText(query []rune, atom antlr.ParserRuleContext) string {
	start, stop := atom.GetStart(), atom.GetStop()
	if start == nil || stop == nil || start.GetStart() < 0 || stop.GetStop() >= len(query) || stop.GetStop() < start.GetStart() {
		return atom.GetText()
	}
	return string(query[start.GetStart() : stop.GetStop()+1])
}
