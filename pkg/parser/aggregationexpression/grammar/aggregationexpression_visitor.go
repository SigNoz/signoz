// Code generated from grammar/AggregationExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // AggregationExpression

import "github.com/antlr4-go/antlr/v4"

// A complete Visitor for a parse tree produced by AggregationExpressionParser.
type AggregationExpressionVisitor interface {
	antlr.ParseTreeVisitor

	// Visit a parse tree produced by AggregationExpressionParser#query.
	VisitQuery(ctx *QueryContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#parenthesizedExpression.
	VisitParenthesizedExpression(ctx *ParenthesizedExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#additiveExpression.
	VisitAdditiveExpression(ctx *AdditiveExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#numberExpression.
	VisitNumberExpression(ctx *NumberExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#multiplicativeExpression.
	VisitMultiplicativeExpression(ctx *MultiplicativeExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#unaryExpression.
	VisitUnaryExpression(ctx *UnaryExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#functionExpression.
	VisitFunctionExpression(ctx *FunctionExpressionContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#functionCall.
	VisitFunctionCall(ctx *FunctionCallContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#argumentList.
	VisitArgumentList(ctx *ArgumentListContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#argument.
	VisitArgument(ctx *ArgumentContext) interface{}

	// Visit a parse tree produced by AggregationExpressionParser#argumentToken.
	VisitArgumentToken(ctx *ArgumentTokenContext) interface{}
}
