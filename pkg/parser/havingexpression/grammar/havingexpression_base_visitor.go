// Code generated from grammar/HavingExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // HavingExpression

import "github.com/antlr4-go/antlr/v4"

type BaseHavingExpressionVisitor struct {
	*antlr.BaseParseTreeVisitor
}

func (v *BaseHavingExpressionVisitor) VisitQuery(ctx *QueryContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitExpression(ctx *ExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitOrExpression(ctx *OrExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitAndExpression(ctx *AndExpressionContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitPrimary(ctx *PrimaryContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitComparison(ctx *ComparisonContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitCompOp(ctx *CompOpContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitInList(ctx *InListContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitSignedNumber(ctx *SignedNumberContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitOperand(ctx *OperandContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitTerm(ctx *TermContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitFactor(ctx *FactorContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitAtom(ctx *AtomContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitFunctionCall(ctx *FunctionCallContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitFunctionArgList(ctx *FunctionArgListContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitFuncArg(ctx *FuncArgContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitFuncArgToken(ctx *FuncArgTokenContext) interface{} {
	return v.VisitChildren(ctx)
}

func (v *BaseHavingExpressionVisitor) VisitIdentifier(ctx *IdentifierContext) interface{} {
	return v.VisitChildren(ctx)
}
