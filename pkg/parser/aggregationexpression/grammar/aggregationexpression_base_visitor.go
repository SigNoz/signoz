// Code generated from grammar/AggregationExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // AggregationExpression

import "github.com/antlr4-go/antlr/v4"

type BaseAggregationExpressionVisitor struct {
	*antlr.BaseParseTreeVisitor
}

func (v *BaseAggregationExpressionVisitor) VisitQuery(ctx *QueryContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitParenthesizedExpression(ctx *ParenthesizedExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitAdditiveExpression(ctx *AdditiveExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitNumberExpression(ctx *NumberExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitMultiplicativeExpression(ctx *MultiplicativeExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitUnaryExpression(ctx *UnaryExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitFunctionExpression(ctx *FunctionExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitFunctionCall(ctx *FunctionCallContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitArgumentList(ctx *ArgumentListContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitArgument(ctx *ArgumentContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseAggregationExpressionVisitor) VisitArgumentToken(ctx *ArgumentTokenContext) interface{} {
	return v.VisitChildren(ctx)
}
