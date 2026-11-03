// Code generated from grammar/AggregationExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // AggregationExpression

import "github.com/antlr4-go/antlr/v4"

// BaseAggregationExpressionListener is a complete listener for a parse tree produced by AggregationExpressionParser.
type BaseAggregationExpressionListener struct{}

var _ AggregationExpressionListener = &BaseAggregationExpressionListener{}

// VisitTerminal is called when a terminal node is visited.
func (s *BaseAggregationExpressionListener) VisitTerminal(node antlr.TerminalNode) {}

// VisitErrorNode is called when an error node is visited.
func (s *BaseAggregationExpressionListener) VisitErrorNode(node antlr.ErrorNode) {}

// EnterEveryRule is called when any rule is entered.
func (s *BaseAggregationExpressionListener) EnterEveryRule(ctx antlr.ParserRuleContext) {}

// ExitEveryRule is called when any rule is exited.
func (s *BaseAggregationExpressionListener) ExitEveryRule(ctx antlr.ParserRuleContext) {}

// EnterQuery is called when production query is entered.
func (s *BaseAggregationExpressionListener) EnterQuery(ctx *QueryContext) {}

// ExitQuery is called when production query is exited.
func (s *BaseAggregationExpressionListener) ExitQuery(ctx *QueryContext) {}

// EnterParenthesizedExpression is called when production parenthesizedExpression is entered.
func (s *BaseAggregationExpressionListener) EnterParenthesizedExpression(ctx *ParenthesizedExpressionContext) {
}

// ExitParenthesizedExpression is called when production parenthesizedExpression is exited.
func (s *BaseAggregationExpressionListener) ExitParenthesizedExpression(ctx *ParenthesizedExpressionContext) {
}

// EnterAdditiveExpression is called when production additiveExpression is entered.
func (s *BaseAggregationExpressionListener) EnterAdditiveExpression(ctx *AdditiveExpressionContext) {}

// ExitAdditiveExpression is called when production additiveExpression is exited.
func (s *BaseAggregationExpressionListener) ExitAdditiveExpression(ctx *AdditiveExpressionContext) {}

// EnterNumberExpression is called when production numberExpression is entered.
func (s *BaseAggregationExpressionListener) EnterNumberExpression(ctx *NumberExpressionContext) {}

// ExitNumberExpression is called when production numberExpression is exited.
func (s *BaseAggregationExpressionListener) ExitNumberExpression(ctx *NumberExpressionContext) {}

// EnterMultiplicativeExpression is called when production multiplicativeExpression is entered.
func (s *BaseAggregationExpressionListener) EnterMultiplicativeExpression(ctx *MultiplicativeExpressionContext) {
}

// ExitMultiplicativeExpression is called when production multiplicativeExpression is exited.
func (s *BaseAggregationExpressionListener) ExitMultiplicativeExpression(ctx *MultiplicativeExpressionContext) {
}

// EnterUnaryExpression is called when production unaryExpression is entered.
func (s *BaseAggregationExpressionListener) EnterUnaryExpression(ctx *UnaryExpressionContext) {}

// ExitUnaryExpression is called when production unaryExpression is exited.
func (s *BaseAggregationExpressionListener) ExitUnaryExpression(ctx *UnaryExpressionContext) {}

// EnterFunctionExpression is called when production functionExpression is entered.
func (s *BaseAggregationExpressionListener) EnterFunctionExpression(ctx *FunctionExpressionContext) {}

// ExitFunctionExpression is called when production functionExpression is exited.
func (s *BaseAggregationExpressionListener) ExitFunctionExpression(ctx *FunctionExpressionContext) {}

// EnterFunctionCall is called when production functionCall is entered.
func (s *BaseAggregationExpressionListener) EnterFunctionCall(ctx *FunctionCallContext) {}

// ExitFunctionCall is called when production functionCall is exited.
func (s *BaseAggregationExpressionListener) ExitFunctionCall(ctx *FunctionCallContext) {}

// EnterArgumentList is called when production argumentList is entered.
func (s *BaseAggregationExpressionListener) EnterArgumentList(ctx *ArgumentListContext) {}

// ExitArgumentList is called when production argumentList is exited.
func (s *BaseAggregationExpressionListener) ExitArgumentList(ctx *ArgumentListContext) {}

// EnterArgument is called when production argument is entered.
func (s *BaseAggregationExpressionListener) EnterArgument(ctx *ArgumentContext) {}

// ExitArgument is called when production argument is exited.
func (s *BaseAggregationExpressionListener) ExitArgument(ctx *ArgumentContext) {}

// EnterArgumentToken is called when production argumentToken is entered.
func (s *BaseAggregationExpressionListener) EnterArgumentToken(ctx *ArgumentTokenContext) {}

// ExitArgumentToken is called when production argumentToken is exited.
func (s *BaseAggregationExpressionListener) ExitArgumentToken(ctx *ArgumentTokenContext) {}
