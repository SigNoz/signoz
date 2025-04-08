// Code generated from grammar/FilterQuery.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // FilterQuery

import "github.com/antlr4-go/antlr/v4"

// BaseFilterQueryListener is a complete listener for a parse tree produced by FilterQueryParser.
type BaseFilterQueryListener struct{}

var _ FilterQueryListener = &BaseFilterQueryListener{}

// VisitTerminal is called when a terminal node is visited.
func (s *BaseFilterQueryListener) VisitTerminal(node antlr.TerminalNode) {}

// VisitErrorNode is called when an error node is visited.
func (s *BaseFilterQueryListener) VisitErrorNode(node antlr.ErrorNode) {}

// EnterEveryRule is called when any rule is entered.
func (s *BaseFilterQueryListener) EnterEveryRule(ctx antlr.ParserRuleContext) {}

// ExitEveryRule is called when any rule is exited.
func (s *BaseFilterQueryListener) ExitEveryRule(ctx antlr.ParserRuleContext) {}

// EnterQuery is called when production query is entered.
func (s *BaseFilterQueryListener) EnterQuery(ctx *QueryContext) {}

// ExitQuery is called when production query is exited.
func (s *BaseFilterQueryListener) ExitQuery(ctx *QueryContext) {}

// EnterExpression is called when production expression is entered.
func (s *BaseFilterQueryListener) EnterExpression(ctx *ExpressionContext) {}

// ExitExpression is called when production expression is exited.
func (s *BaseFilterQueryListener) ExitExpression(ctx *ExpressionContext) {}

// EnterOrExpression is called when production orExpression is entered.
func (s *BaseFilterQueryListener) EnterOrExpression(ctx *OrExpressionContext) {}

// ExitOrExpression is called when production orExpression is exited.
func (s *BaseFilterQueryListener) ExitOrExpression(ctx *OrExpressionContext) {}

// EnterAndExpression is called when production andExpression is entered.
func (s *BaseFilterQueryListener) EnterAndExpression(ctx *AndExpressionContext) {}

// ExitAndExpression is called when production andExpression is exited.
func (s *BaseFilterQueryListener) ExitAndExpression(ctx *AndExpressionContext) {}

// EnterUnaryExpression is called when production unaryExpression is entered.
func (s *BaseFilterQueryListener) EnterUnaryExpression(ctx *UnaryExpressionContext) {}

// ExitUnaryExpression is called when production unaryExpression is exited.
func (s *BaseFilterQueryListener) ExitUnaryExpression(ctx *UnaryExpressionContext) {}

// EnterPrimary is called when production primary is entered.
func (s *BaseFilterQueryListener) EnterPrimary(ctx *PrimaryContext) {}

// ExitPrimary is called when production primary is exited.
func (s *BaseFilterQueryListener) ExitPrimary(ctx *PrimaryContext) {}

// EnterComparison is called when production comparison is entered.
func (s *BaseFilterQueryListener) EnterComparison(ctx *ComparisonContext) {}

// ExitComparison is called when production comparison is exited.
func (s *BaseFilterQueryListener) ExitComparison(ctx *ComparisonContext) {}

// EnterInClause is called when production inClause is entered.
func (s *BaseFilterQueryListener) EnterInClause(ctx *InClauseContext) {}

// ExitInClause is called when production inClause is exited.
func (s *BaseFilterQueryListener) ExitInClause(ctx *InClauseContext) {}

// EnterNotInClause is called when production notInClause is entered.
func (s *BaseFilterQueryListener) EnterNotInClause(ctx *NotInClauseContext) {}

// ExitNotInClause is called when production notInClause is exited.
func (s *BaseFilterQueryListener) ExitNotInClause(ctx *NotInClauseContext) {}

// EnterValueList is called when production valueList is entered.
func (s *BaseFilterQueryListener) EnterValueList(ctx *ValueListContext) {}

// ExitValueList is called when production valueList is exited.
func (s *BaseFilterQueryListener) ExitValueList(ctx *ValueListContext) {}

// EnterFullText is called when production fullText is entered.
func (s *BaseFilterQueryListener) EnterFullText(ctx *FullTextContext) {}

// ExitFullText is called when production fullText is exited.
func (s *BaseFilterQueryListener) ExitFullText(ctx *FullTextContext) {}

// EnterFunctionCall is called when production functionCall is entered.
func (s *BaseFilterQueryListener) EnterFunctionCall(ctx *FunctionCallContext) {}

// ExitFunctionCall is called when production functionCall is exited.
func (s *BaseFilterQueryListener) ExitFunctionCall(ctx *FunctionCallContext) {}

// EnterFunctionParamList is called when production functionParamList is entered.
func (s *BaseFilterQueryListener) EnterFunctionParamList(ctx *FunctionParamListContext) {}

// ExitFunctionParamList is called when production functionParamList is exited.
func (s *BaseFilterQueryListener) ExitFunctionParamList(ctx *FunctionParamListContext) {}

// EnterFunctionParam is called when production functionParam is entered.
func (s *BaseFilterQueryListener) EnterFunctionParam(ctx *FunctionParamContext) {}

// ExitFunctionParam is called when production functionParam is exited.
func (s *BaseFilterQueryListener) ExitFunctionParam(ctx *FunctionParamContext) {}

// EnterArray is called when production array is entered.
func (s *BaseFilterQueryListener) EnterArray(ctx *ArrayContext) {}

// ExitArray is called when production array is exited.
func (s *BaseFilterQueryListener) ExitArray(ctx *ArrayContext) {}

// EnterValue is called when production value is entered.
func (s *BaseFilterQueryListener) EnterValue(ctx *ValueContext) {}

// ExitValue is called when production value is exited.
func (s *BaseFilterQueryListener) ExitValue(ctx *ValueContext) {}

// EnterKey is called when production key is entered.
func (s *BaseFilterQueryListener) EnterKey(ctx *KeyContext) {}

// ExitKey is called when production key is exited.
func (s *BaseFilterQueryListener) ExitKey(ctx *KeyContext) {}
