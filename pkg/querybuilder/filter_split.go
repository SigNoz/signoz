package querybuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// SplitFilterForAggregates partitions a filter expression on the top-level AND into a
// span-level part (WHERE) and a trace-level part (HAVING over per-trace aggregates).
// A key is trace-level when it carries the trace field context or its bare name is in
// aggregateNames; any other explicit context is span-level. An OR mixing the two
// classes is an error.
func SplitFilterForAggregates(query string, aggregateNames map[string]struct{}) (spanExpr string, havingExpr string, err error) {
	if strings.TrimSpace(query) == "" {
		return "", "", nil
	}

	tree, syntaxErrors := parseFilterQuery(query)
	if len(syntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d syntax errors while parsing the filter expression.",
			len(syntaxErrors),
		)
		additionals := make([]string, 0, len(syntaxErrors))
		for _, syntaxError := range syntaxErrors {
			if syntaxError.Error() != "" {
				additionals = append(additionals, syntaxError.Error())
			}
		}
		// TODO: add troubleshooting link to the filter query syntax guide once it's published.
		return "", "", combinedErrors.WithAdditional(additionals...)
	}

	s := filterSplitter{query: []rune(query), aggregateNames: aggregateNames}
	s.visit(tree)

	if s.mixed {
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"trace-level and span-level filters cannot be combined within an OR/NOT group; separate them with a top-level AND")
	}
	return strings.Join(s.span, " AND "), strings.Join(s.having, " AND "), nil
}

func parseFilterQuery(query string) (antlr.Tree, []*SyntaxErr) {
	lexerErrorListener := NewErrorListener()
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(query))
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	parserErrorListener := NewErrorListener()
	parser := grammar.NewFilterQueryParser(antlr.NewCommonTokenStream(lexer, 0))
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	tree := parser.Query()
	return tree, append(lexerErrorListener.SyntaxErrors, parserErrorListener.SyntaxErrors...)
}

// filterSplitter flattens the top-level AND chain and routes each atom to the span or
// having bucket by the class of the keys it references.
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
		// a real OR is kept whole so a class-mixing OR can be rejected
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
	// re-wrap an OR group (its source slice excludes the enclosing parens) so the
	// " AND " rejoin cannot invert OR/AND precedence
	if or, ok := atom.(*grammar.OrExpressionContext); ok && len(or.AllAndExpression()) > 1 {
		text = "(" + text + ")"
	}
	if isTrace {
		s.having = append(s.having, text)
	} else {
		s.span = append(s.span, text)
	}
}

// classifyKeys reports whether a subtree references trace-level and/or span-level
// keys. An unknown name under the trace context stays trace-level so the aggregate
// validation rejects it with a targeted error.
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

// atomSourceText slices the input by token offsets to preserve whitespace (the token
// stream drops it, gluing word operators to operands). ANTLR offsets are rune indices,
// hence the rune slice.
func atomSourceText(query []rune, atom antlr.ParserRuleContext) string {
	start, stop := atom.GetStart(), atom.GetStop()
	if start == nil || stop == nil || start.GetStart() < 0 || stop.GetStop() >= len(query) || stop.GetStop() < start.GetStart() {
		return atom.GetText()
	}
	return string(query[start.GetStart() : stop.GetStop()+1])
}
