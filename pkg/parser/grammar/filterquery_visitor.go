// Code generated from grammar/FilterQuery.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // FilterQuery

import "github.com/antlr4-go/antlr/v4"

// A complete Visitor for a parse tree produced by FilterQueryParser.
type FilterQueryVisitor interface {
	antlr.ParseTreeVisitor

	// Visit a parse tree produced by FilterQueryParser#query.
	VisitQuery(ctx *QueryContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#expression.
	VisitExpression(ctx *ExpressionContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#orExpression.
	VisitOrExpression(ctx *OrExpressionContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#andExpression.
	VisitAndExpression(ctx *AndExpressionContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#unaryExpression.
	VisitUnaryExpression(ctx *UnaryExpressionContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#primary.
	VisitPrimary(ctx *PrimaryContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#comparison.
	VisitComparison(ctx *ComparisonContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#inClause.
	VisitInClause(ctx *InClauseContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#notInClause.
	VisitNotInClause(ctx *NotInClauseContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#valueList.
	VisitValueList(ctx *ValueListContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#fullText.
	VisitFullText(ctx *FullTextContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#functionCall.
	VisitFunctionCall(ctx *FunctionCallContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#functionParamList.
	VisitFunctionParamList(ctx *FunctionParamListContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#functionParam.
	VisitFunctionParam(ctx *FunctionParamContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#array.
	VisitArray(ctx *ArrayContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#value.
	VisitValue(ctx *ValueContext) interface{}

	// Visit a parse tree produced by FilterQueryParser#key.
	VisitKey(ctx *KeyContext) interface{}
}
