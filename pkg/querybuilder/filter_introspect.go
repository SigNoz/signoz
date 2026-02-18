package querybuilder

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// ExtractFilterExprTree parses a v5 filter expression and returns a logical
// tree that preserves full boolean structure (AND/OR, parentheses, NOT) as
// well as the individual conditions (keys, operator, values).
//
// This can be reused by callers that need deeper introspection into the logic
// of the filter expression without constructing any SQL or query-engine
// specific structures.
func ExtractFilterExprTree(expr string) (*qbtypes.FilterExprNode, error) {
	if strings.TrimSpace(expr) == "" {
		return &qbtypes.FilterExprNode{
			Op: qbtypes.LogicalOpLeaf,
		}, nil
	}

	// Setup the ANTLR parsing pipeline (same grammar as PrepareWhereClause).
	input := antlr.NewInputStream(expr)
	lexer := grammar.NewFilterQueryLexer(input)

	lexerErrorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parserErrorListener := NewErrorListener()
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	tree := parser.Query()

	// Handle syntax errors
	if len(parserErrorListener.SyntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d syntax errors while parsing the search expression.",
			len(parserErrorListener.SyntaxErrors),
		)
		additionals := make([]string, 0, len(parserErrorListener.SyntaxErrors))
		for _, err := range parserErrorListener.SyntaxErrors {
			if err.Error() != "" {
				additionals = append(additionals, err.Error())
			}
		}

		return nil, combinedErrors.WithAdditional(additionals...)
	}

	visitor := &filterTreeVisitor{}
	rootAny := visitor.Visit(tree)
	if len(visitor.errors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d errors while parsing the search expression.",
			len(visitor.errors),
		)
		return nil, combinedErrors.WithAdditional(visitor.errors...)
	}

	root, _ := rootAny.(*qbtypes.FilterExprNode)
	return root, nil
}

// filterTreeVisitor builds a FilterExprNode tree from the parse tree.
type filterTreeVisitor struct {
	errors []string
}

// Visit dispatches based on node type.
func (v *filterTreeVisitor) Visit(tree antlr.ParseTree) any {
	if tree == nil {
		return nil
	}

	switch t := tree.(type) {
	case *grammar.QueryContext:
		return v.VisitQuery(t)
	case *grammar.ExpressionContext:
		return v.VisitExpression(t)
	case *grammar.OrExpressionContext:
		return v.VisitOrExpression(t)
	case *grammar.AndExpressionContext:
		return v.VisitAndExpression(t)
	case *grammar.UnaryExpressionContext:
		return v.VisitUnaryExpression(t)
	case *grammar.PrimaryContext:
		return v.VisitPrimary(t)
	case *grammar.ComparisonContext:
		return v.VisitComparison(t)
	default:
		return nil
	}
}

func (v *filterTreeVisitor) VisitQuery(ctx *grammar.QueryContext) any {
	return v.Visit(ctx.Expression())
}

func (v *filterTreeVisitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

func (v *filterTreeVisitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	andExprs := ctx.AllAndExpression()
	children := make([]*qbtypes.FilterExprNode, 0, len(andExprs))

	for _, andExpr := range andExprs {
		if node, ok := v.Visit(andExpr).(*qbtypes.FilterExprNode); ok && node != nil {
			children = append(children, node)
		}
	}

	if len(children) == 0 {
		return nil
	}
	if len(children) == 1 {
		return children[0]
	}

	return &qbtypes.FilterExprNode{
		Op:       qbtypes.LogicalOpOr,
		Children: children,
	}
}

func (v *filterTreeVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	unaryExprs := ctx.AllUnaryExpression()
	children := make([]*qbtypes.FilterExprNode, 0, len(unaryExprs))

	for _, unary := range unaryExprs {
		if node, ok := v.Visit(unary).(*qbtypes.FilterExprNode); ok && node != nil {
			children = append(children, node)
		}
	}

	if len(children) == 0 {
		return nil
	}
	if len(children) == 1 {
		return children[0]
	}

	return &qbtypes.FilterExprNode{
		Op:       qbtypes.LogicalOpAnd,
		Children: children,
	}
}

func (v *filterTreeVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	node, _ := v.Visit(ctx.Primary()).(*qbtypes.FilterExprNode)
	if node == nil {
		return nil
	}

	if ctx.NOT() != nil {
		node.Negated = !node.Negated
	}

	return node
}

func (v *filterTreeVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	switch {
	case ctx.OrExpression() != nil:
		return v.Visit(ctx.OrExpression())
	case ctx.Comparison() != nil:
		return v.Visit(ctx.Comparison())
	default:
		// We intentionally ignore FullText/FunctionCall here for the tree
		// representation. They can be added later if needed.
		return nil
	}
}

// VisitComparison builds a leaf node with a single ParsedFilterCondition.
func (v *filterTreeVisitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	key := v.buildKey(ctx.Key())
	if key == nil {
		return nil
	}

	// Handle EXISTS specially
	if ctx.EXISTS() != nil {
		op := qbtypes.FilterOperatorExists
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotExists
		}

		return &qbtypes.FilterExprNode{
			Op: qbtypes.LogicalOpLeaf,
			Conditions: []qbtypes.FilterCondition{{
				Key:   key,
				Op:    op,
				Value: nil,
			}},
		}
	}

	// Handle IN / NOT IN
	if ctx.InClause() != nil || ctx.NotInClause() != nil {
		values := v.buildValuesFromInClause(ctx.InClause(), ctx.NotInClause())

		op := qbtypes.FilterOperatorIn
		if ctx.NotInClause() != nil {
			op = qbtypes.FilterOperatorNotIn
		}

		return &qbtypes.FilterExprNode{
			Op: qbtypes.LogicalOpLeaf,
			Conditions: []qbtypes.FilterCondition{{
				Key:   key,
				Op:    op,
				Value: values,
			}},
		}
	}

	// Handle BETWEEN / NOT BETWEEN
	if ctx.BETWEEN() != nil {
		valuesCtx := ctx.AllValue()
		if len(valuesCtx) != 2 {
			v.errors = append(v.errors, "BETWEEN operator requires exactly two values")
			return nil
		}

		value1 := v.buildValue(valuesCtx[0])
		value2 := v.buildValue(valuesCtx[1])

		op := qbtypes.FilterOperatorBetween
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotBetween
		}

		return &qbtypes.FilterExprNode{
			Op: qbtypes.LogicalOpLeaf,
			Conditions: []qbtypes.FilterCondition{{
				Key:   key,
				Op:    op,
				Value: []any{value1, value2},
			}},
		}
	}

	// All remaining operators have exactly one value.
	valuesCtx := ctx.AllValue()
	if len(valuesCtx) == 0 {
		v.errors = append(v.errors, "comparison operator requires a value")
		return nil
	}

	value := v.buildValue(valuesCtx[0])

	var op qbtypes.FilterOperator
	switch {
	case ctx.EQUALS() != nil:
		op = qbtypes.FilterOperatorEqual
	case ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil:
		op = qbtypes.FilterOperatorNotEqual
	case ctx.LT() != nil:
		op = qbtypes.FilterOperatorLessThan
	case ctx.LE() != nil:
		op = qbtypes.FilterOperatorLessThanOrEq
	case ctx.GT() != nil:
		op = qbtypes.FilterOperatorGreaterThan
	case ctx.GE() != nil:
		op = qbtypes.FilterOperatorGreaterThanOrEq
	case ctx.LIKE() != nil:
		op = qbtypes.FilterOperatorLike
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotLike
		}
	case ctx.ILIKE() != nil:
		op = qbtypes.FilterOperatorILike
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotILike
		}
	case ctx.REGEXP() != nil:
		op = qbtypes.FilterOperatorRegexp
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotRegexp
		}
	case ctx.CONTAINS() != nil:
		op = qbtypes.FilterOperatorContains
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotContains
		}
	default:
		v.errors = append(v.errors, fmt.Sprintf("unsupported comparison operator in expression: %s", ctx.GetText()))
		return nil
	}

	return &qbtypes.FilterExprNode{
		Op: qbtypes.LogicalOpLeaf,
		Conditions: []qbtypes.FilterCondition{{
			Key:   key,
			Op:    op,
			Value: value,
		}},
	}
}

// buildKey turns a key context into a TelemetryFieldKey.
func (v *filterTreeVisitor) buildKey(ctx grammar.IKeyContext) *telemetrytypes.TelemetryFieldKey {
	if ctx == nil {
		return nil
	}
	key := telemetrytypes.GetFieldKeyFromKeyText(ctx.GetText())
	return &key
}

// buildValuesFromInClause handles the IN/NOT IN value side.
func (v *filterTreeVisitor) buildValuesFromInClause(in grammar.IInClauseContext, notIn grammar.INotInClauseContext) []any {
	var ctxVal any
	if in != nil {
		ctxVal = v.visitInClause(in)
	} else if notIn != nil {
		ctxVal = v.visitNotInClause(notIn)
	}

	switch ret := ctxVal.(type) {
	case []any:
		return ret
	case any:
		if ret != nil {
			return []any{ret}
		}
	}
	return nil
}

func (v *filterTreeVisitor) visitInClause(ctx grammar.IInClauseContext) any {
	if ctx.ValueList() != nil {
		return v.visitValueList(ctx.ValueList())
	}
	return v.buildValue(ctx.Value())
}

func (v *filterTreeVisitor) visitNotInClause(ctx grammar.INotInClauseContext) any {
	if ctx.ValueList() != nil {
		return v.visitValueList(ctx.ValueList())
	}
	return v.buildValue(ctx.Value())
}

func (v *filterTreeVisitor) visitValueList(ctx grammar.IValueListContext) any {
	values := ctx.AllValue()
	parts := make([]any, 0, len(values))
	for _, val := range values {
		parts = append(parts, v.buildValue(val))
	}
	return parts
}

// buildValue converts literal values into Go types (string, float64, bool).
func (v *filterTreeVisitor) buildValue(ctx grammar.IValueContext) any {
	switch {
	case ctx == nil:
		return nil
	case ctx.QUOTED_TEXT() != nil:
		txt := ctx.QUOTED_TEXT().GetText()
		return trimQuotes(txt)
	case ctx.NUMBER() != nil:
		number, err := strconv.ParseFloat(ctx.NUMBER().GetText(), 64)
		if err != nil {
			v.errors = append(v.errors, fmt.Sprintf("failed to parse number %s", ctx.NUMBER().GetText()))
			return nil
		}
		return number
	case ctx.BOOL() != nil:
		boolText := strings.ToLower(ctx.BOOL().GetText())
		return boolText == "true"
	case ctx.KEY() != nil:
		return ctx.KEY().GetText()
	default:
		return nil
	}
}
