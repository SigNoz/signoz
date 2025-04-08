// Code generated from grammar/FilterQuery.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // FilterQuery

import "github.com/antlr4-go/antlr/v4"

type BaseFilterQueryVisitor struct {
	*antlr.BaseParseTreeVisitor
}

func (v *BaseFilterQueryVisitor) VisitQuery(ctx *QueryContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitExpression(ctx *ExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitOrExpression(ctx *OrExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitAndExpression(ctx *AndExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitUnaryExpression(ctx *UnaryExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitPrimary(ctx *PrimaryContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitComparison(ctx *ComparisonContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitInClause(ctx *InClauseContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitNotInClause(ctx *NotInClauseContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitValueList(ctx *ValueListContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitFullText(ctx *FullTextContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitFunctionCall(ctx *FunctionCallContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitFunctionParamList(ctx *FunctionParamListContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitFunctionParam(ctx *FunctionParamContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitArray(ctx *ArrayContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitValue(ctx *ValueContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseFilterQueryVisitor) VisitKey(ctx *KeyContext) interface{} {
	return v.VisitChildren(ctx)
}
