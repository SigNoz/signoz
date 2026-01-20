package telemetrytraces

import (
	"strings"

	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/antlr4-go/antlr/v4"
)

type traceIDExtractor struct {
	traceIDs []string
	found    bool
}

func ExtractTraceIDsFromFilter(filterExpr string) ([]string, bool) {

	input := antlr.NewInputStream(filterExpr)
	lexer := grammar.NewFilterQueryLexer(input)

	lexer.RemoveErrorListeners()

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()

	tree := parser.Query()

	extractor := &traceIDExtractor{}
	extractor.Visit(tree)

	return extractor.traceIDs, extractor.found
}

// Visit dispatches to the specific visit method based on node type
func (e *traceIDExtractor) Visit(tree antlr.ParseTree) any {
	if tree == nil {
		return nil
	}

	switch t := tree.(type) {
	case *grammar.QueryContext:
		return e.VisitQuery(t)
	case *grammar.ExpressionContext:
		return e.VisitExpression(t)
	case *grammar.OrExpressionContext:
		return e.VisitOrExpression(t)
	case *grammar.AndExpressionContext:
		return e.VisitAndExpression(t)
	case *grammar.UnaryExpressionContext:
		return e.VisitUnaryExpression(t)
	case *grammar.PrimaryContext:
		return e.VisitPrimary(t)
	case *grammar.ComparisonContext:
		return e.VisitComparison(t)
	case *grammar.InClauseContext:
		return e.VisitInClause(t)
	default:
		// For other node types, visit children
		for i := 0; i < tree.GetChildCount(); i++ {
			if child := tree.GetChild(i); child != nil {
				if parseTree, ok := child.(antlr.ParseTree); ok {
					e.Visit(parseTree)
				}
			}
		}
	}
	return nil
}

func (e *traceIDExtractor) VisitQuery(ctx *grammar.QueryContext) any {
	return e.Visit(ctx.Expression())
}

func (e *traceIDExtractor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return e.Visit(ctx.OrExpression())
}

func (e *traceIDExtractor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	for _, expr := range ctx.AllAndExpression() {
		e.Visit(expr)
	}
	return nil
}

func (e *traceIDExtractor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	for _, expr := range ctx.AllUnaryExpression() {
		e.Visit(expr)
	}
	return nil
}

func (e *traceIDExtractor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	return e.Visit(ctx.Primary())
}

func (e *traceIDExtractor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		return e.Visit(ctx.OrExpression())
	} else if ctx.Comparison() != nil {
		return e.Visit(ctx.Comparison())
	}
	return nil
}

func (e *traceIDExtractor) VisitComparison(ctx *grammar.ComparisonContext) any {
	keyCtx := ctx.Key()
	if keyCtx == nil {
		return nil
	}

	keyText := keyCtx.GetText()

	if strings.ToLower(keyText) == "trace_id" || strings.ToLower(keyText) == "traceid" {
		if ctx.EQUALS() != nil {
			values := ctx.AllValue()
			if len(values) > 0 {
				if value := e.extractValue(values[0]); value != "" {
					e.traceIDs = append(e.traceIDs, value)
					e.found = true
				}
			}
		} else if ctx.InClause() != nil {
			return e.Visit(ctx.InClause())
		}
	}

	return nil
}

func (e *traceIDExtractor) VisitInClause(ctx *grammar.InClauseContext) any {
	valueListCtx := ctx.ValueList()
	if valueListCtx == nil {
		return nil
	}

	for _, valueCtx := range valueListCtx.AllValue() {
		if value := e.extractValue(valueCtx); value != "" {
			e.traceIDs = append(e.traceIDs, value)
			e.found = true
		}
	}

	return nil
}

func (e *traceIDExtractor) extractValue(ctx grammar.IValueContext) string {
	if ctx.QUOTED_TEXT() != nil {
		text := ctx.QUOTED_TEXT().GetText()
		if len(text) >= 2 {
			return text[1 : len(text)-1]
		}
	} else if ctx.KEY() != nil {
		return ctx.KEY().GetText()
	} else if ctx.NUMBER() != nil {
		return ctx.NUMBER().GetText()
	}
	return ""
}
