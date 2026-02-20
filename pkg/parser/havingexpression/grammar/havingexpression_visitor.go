// Code generated from grammar/HavingExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // HavingExpression

import "github.com/antlr4-go/antlr/v4"

// A complete Visitor for a parse tree produced by HavingExpressionParser.
type HavingExpressionVisitor interface {
	antlr.ParseTreeVisitor

	// Visit a parse tree produced by HavingExpressionParser#query.
	VisitQuery(ctx *QueryContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#expression.
	VisitExpression(ctx *ExpressionContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#orExpression.
	VisitOrExpression(ctx *OrExpressionContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#andExpression.
	VisitAndExpression(ctx *AndExpressionContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#primary.
	VisitPrimary(ctx *PrimaryContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#comparison.
	VisitComparison(ctx *ComparisonContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#compOp.
	VisitCompOp(ctx *CompOpContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#operand.
	VisitOperand(ctx *OperandContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#term.
	VisitTerm(ctx *TermContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#factor.
	VisitFactor(ctx *FactorContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#atom.
	VisitAtom(ctx *AtomContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#functionCall.
	VisitFunctionCall(ctx *FunctionCallContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#functionArgs.
	VisitFunctionArgs(ctx *FunctionArgsContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#functionArg.
	VisitFunctionArg(ctx *FunctionArgContext) interface{}

	// Visit a parse tree produced by HavingExpressionParser#identifier.
	VisitIdentifier(ctx *IdentifierContext) interface{}
}
