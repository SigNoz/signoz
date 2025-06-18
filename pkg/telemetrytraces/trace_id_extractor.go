package telemetrytraces

import (
	"strings"

	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// traceIDExtractor is a visitor that extracts trace IDs from filter expressions
type traceIDExtractor struct {
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey
	traceIDs  []string
	found     bool
}

// ExtractTraceIDsFromFilter uses ANTLR parser to extract trace IDs from a filter expression
func ExtractTraceIDsFromFilter(filterExpr string, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) ([]string, bool) {
	// Check if we have a trace_id field in the field keys
	var hasTraceIDField bool
	for fieldName, keys := range fieldKeys {
		if strings.ToLower(fieldName) == "trace_id" || strings.ToLower(fieldName) == "traceid" {
			for _, key := range keys {
				if key.FieldContext == telemetrytypes.FieldContextSpan {
					hasTraceIDField = true
					break
				}
			}
		}
		if hasTraceIDField {
			break
		}
	}

	if !hasTraceIDField {
		return nil, false
	}

	// Setup the ANTLR parsing pipeline
	input := antlr.NewInputStream(filterExpr)
	lexer := grammar.NewFilterQueryLexer(input)

	// Set up error handling
	lexer.RemoveErrorListeners()

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()

	// Parse the query
	tree := parser.Query()

	// Visit the parse tree with our trace ID extractor
	extractor := &traceIDExtractor{
		fieldKeys: fieldKeys,
	}
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
	// Get the key
	keyCtx := ctx.Key()
	if keyCtx == nil {
		return nil
	}

	keyText := keyCtx.GetText()

	// Check if this is a trace_id field
	isTraceIDField := false
	for fieldName, keys := range e.fieldKeys {
		if strings.EqualFold(keyText, fieldName) && (strings.ToLower(fieldName) == "trace_id" || strings.ToLower(fieldName) == "traceid") {
			for _, key := range keys {
				if key.FieldContext == telemetrytypes.FieldContextSpan {
					isTraceIDField = true
					break
				}
			}
		}
		if isTraceIDField {
			break
		}
	}

	if !isTraceIDField {
		return nil
	}

	// Check the operator
	if ctx.EQUALS() != nil {
		// Handle single value comparison
		values := ctx.AllValue()
		if len(values) > 0 {
			if value := e.extractValue(values[0]); value != "" {
				e.traceIDs = append(e.traceIDs, value)
				e.found = true
			}
		}
	} else if ctx.InClause() != nil {
		// Handle IN clause
		return e.Visit(ctx.InClause())
	}

	return nil
}

func (e *traceIDExtractor) VisitInClause(ctx *grammar.InClauseContext) any {
	valueListCtx := ctx.ValueList()
	if valueListCtx == nil {
		return nil
	}

	// Extract all values from the value list
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
		// Remove quotes
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

// ExtractTraceIDFromFilter extracts a single trace ID from a filter expression if present
// Deprecated: Use ExtractTraceIDsFromFilter instead
func ExtractTraceIDFromFilter(filterExpr string, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) (string, bool) {
	traceIDs, found := ExtractTraceIDsFromFilter(filterExpr, fieldKeys)
	if found && len(traceIDs) > 0 {
		return traceIDs[0], true
	}
	return "", false
}
