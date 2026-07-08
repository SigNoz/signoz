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
// A key is trace-level when it carries the `trace`/`tracefield` field context (e.g.
// `trace.completion_tokens`) or, with no explicit context, its name is in
// aggregateNames. Trace-level and span-level keys may be AND-combined (they run at
// different query stages) but not OR-combined; an OR that mixes the two is an error.
//
// Syntax errors are ignored here — each part is re-parsed downstream (PrepareWhereClause
// for the span part, the HAVING rewriter for the trace part), which surface them.
func SplitFilterForAggregates(query string, aggregateNames map[string]struct{}) (spanExpr string, havingExpr string, err error) {
	if strings.TrimSpace(query) == "" {
		return "", "", nil
	}

	s := filterSplitter{query: query, aggregateNames: aggregateNames}
	s.visit(parseFilterQuery(query))

	if s.mixedOR {
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level and span-level filters cannot be combined with OR; use AND")
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
	query          string
	aggregateNames map[string]struct{}
	span           []string
	having         []string
	mixedOR        bool
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
		s.mixedOR = true
		return
	}
	text := atomSourceText(s.query, atom)
	if isTrace {
		s.having = append(s.having, text)
	} else {
		s.span = append(s.span, text)
	}
}

// classifyKeys reports whether a subtree references trace-level and/or span-level keys.
// Explicit contexts win; an unspecified-context name is trace-level if it is an
// aggregate name (bare or with the `trace.` prefix).
func classifyKeys(node antlr.Tree, aggregateNames map[string]struct{}) (isTrace, isSpan bool) {
	kc, ok := node.(*grammar.KeyContext)
	if ok {
		key := telemetrytypes.GetFieldKeyFromKeyText(kc.GetText())
		switch {
		case key.FieldContext == telemetrytypes.FieldContextTrace:
			isTrace = true
		case key.FieldContext == telemetrytypes.FieldContextUnspecified:
			if _, agg := aggregateNames[strings.TrimPrefix(key.Name, "trace.")]; agg {
				isTrace = true
			} else {
				isSpan = true
			}
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
// operators (OR/AND/NOT) to their operands, so slice the input by char offsets.
func atomSourceText(query string, atom antlr.ParserRuleContext) string {
	start, stop := atom.GetStart(), atom.GetStop()
	if start == nil || stop == nil || start.GetStart() < 0 || stop.GetStop() >= len(query) || stop.GetStop() < start.GetStart() {
		return atom.GetText()
	}
	return query[start.GetStart() : stop.GetStop()+1]
}
