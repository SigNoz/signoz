// Code generated from grammar/FilterQuery.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // FilterQuery

import "github.com/antlr4-go/antlr/v4"

// FilterQueryListener is a complete listener for a parse tree produced by FilterQueryParser.
type FilterQueryListener interface {
	antlr.ParseTreeListener

	// EnterQuery is called when entering the query production.
	EnterQuery(c *QueryContext)

	// EnterExpression is called when entering the expression production.
	EnterExpression(c *ExpressionContext)

	// EnterOrExpression is called when entering the orExpression production.
	EnterOrExpression(c *OrExpressionContext)

	// EnterAndExpression is called when entering the andExpression production.
	EnterAndExpression(c *AndExpressionContext)

	// EnterUnaryExpression is called when entering the unaryExpression production.
	EnterUnaryExpression(c *UnaryExpressionContext)

	// EnterPrimary is called when entering the primary production.
	EnterPrimary(c *PrimaryContext)

	// EnterComparison is called when entering the comparison production.
	EnterComparison(c *ComparisonContext)

	// EnterInClause is called when entering the inClause production.
	EnterInClause(c *InClauseContext)

	// EnterNotInClause is called when entering the notInClause production.
	EnterNotInClause(c *NotInClauseContext)

	// EnterValueList is called when entering the valueList production.
	EnterValueList(c *ValueListContext)

	// EnterFullText is called when entering the fullText production.
	EnterFullText(c *FullTextContext)

	// EnterFunctionCall is called when entering the functionCall production.
	EnterFunctionCall(c *FunctionCallContext)

	// EnterFunctionParamList is called when entering the functionParamList production.
	EnterFunctionParamList(c *FunctionParamListContext)

	// EnterFunctionParam is called when entering the functionParam production.
	EnterFunctionParam(c *FunctionParamContext)

	// EnterArray is called when entering the array production.
	EnterArray(c *ArrayContext)

	// EnterValue is called when entering the value production.
	EnterValue(c *ValueContext)

	// EnterKey is called when entering the key production.
	EnterKey(c *KeyContext)

	// ExitQuery is called when exiting the query production.
	ExitQuery(c *QueryContext)

	// ExitExpression is called when exiting the expression production.
	ExitExpression(c *ExpressionContext)

	// ExitOrExpression is called when exiting the orExpression production.
	ExitOrExpression(c *OrExpressionContext)

	// ExitAndExpression is called when exiting the andExpression production.
	ExitAndExpression(c *AndExpressionContext)

	// ExitUnaryExpression is called when exiting the unaryExpression production.
	ExitUnaryExpression(c *UnaryExpressionContext)

	// ExitPrimary is called when exiting the primary production.
	ExitPrimary(c *PrimaryContext)

	// ExitComparison is called when exiting the comparison production.
	ExitComparison(c *ComparisonContext)

	// ExitInClause is called when exiting the inClause production.
	ExitInClause(c *InClauseContext)

	// ExitNotInClause is called when exiting the notInClause production.
	ExitNotInClause(c *NotInClauseContext)

	// ExitValueList is called when exiting the valueList production.
	ExitValueList(c *ValueListContext)

	// ExitFullText is called when exiting the fullText production.
	ExitFullText(c *FullTextContext)

	// ExitFunctionCall is called when exiting the functionCall production.
	ExitFunctionCall(c *FunctionCallContext)

	// ExitFunctionParamList is called when exiting the functionParamList production.
	ExitFunctionParamList(c *FunctionParamListContext)

	// ExitFunctionParam is called when exiting the functionParam production.
	ExitFunctionParam(c *FunctionParamContext)

	// ExitArray is called when exiting the array production.
	ExitArray(c *ArrayContext)

	// ExitValue is called when exiting the value production.
	ExitValue(c *ValueContext)

	// ExitKey is called when exiting the key production.
	ExitKey(c *KeyContext)
}
