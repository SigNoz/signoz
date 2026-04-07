// Code generated from grammar/HavingExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // HavingExpression

import "github.com/antlr4-go/antlr/v4"

// BaseHavingExpressionListener is a complete listener for a parse tree produced by HavingExpressionParser.
type BaseHavingExpressionListener struct{}

var _ HavingExpressionListener = &BaseHavingExpressionListener{}

// VisitTerminal is called when a terminal node is visited.
func (s *BaseHavingExpressionListener) VisitTerminal(node antlr.TerminalNode) {}

// VisitErrorNode is called when an error node is visited.
func (s *BaseHavingExpressionListener) VisitErrorNode(node antlr.ErrorNode) {}

// EnterEveryRule is called when any rule is entered.
func (s *BaseHavingExpressionListener) EnterEveryRule(ctx antlr.ParserRuleContext) {}

// ExitEveryRule is called when any rule is exited.
func (s *BaseHavingExpressionListener) ExitEveryRule(ctx antlr.ParserRuleContext) {}

// EnterQuery is called when production query is entered.
func (s *BaseHavingExpressionListener) EnterQuery(ctx *QueryContext) {}

// ExitQuery is called when production query is exited.
func (s *BaseHavingExpressionListener) ExitQuery(ctx *QueryContext) {}

// EnterExpression is called when production expression is entered.
func (s *BaseHavingExpressionListener) EnterExpression(ctx *ExpressionContext) {}

// ExitExpression is called when production expression is exited.
func (s *BaseHavingExpressionListener) ExitExpression(ctx *ExpressionContext) {}

// EnterOrExpression is called when production orExpression is entered.
func (s *BaseHavingExpressionListener) EnterOrExpression(ctx *OrExpressionContext) {}

// ExitOrExpression is called when production orExpression is exited.
func (s *BaseHavingExpressionListener) ExitOrExpression(ctx *OrExpressionContext) {}

// EnterAndExpression is called when production andExpression is entered.
func (s *BaseHavingExpressionListener) EnterAndExpression(ctx *AndExpressionContext) {}

// ExitAndExpression is called when production andExpression is exited.
func (s *BaseHavingExpressionListener) ExitAndExpression(ctx *AndExpressionContext) {}

// EnterPrimary is called when production primary is entered.
func (s *BaseHavingExpressionListener) EnterPrimary(ctx *PrimaryContext) {}

// ExitPrimary is called when production primary is exited.
func (s *BaseHavingExpressionListener) ExitPrimary(ctx *PrimaryContext) {}

// EnterComparison is called when production comparison is entered.
func (s *BaseHavingExpressionListener) EnterComparison(ctx *ComparisonContext) {}

// ExitComparison is called when production comparison is exited.
func (s *BaseHavingExpressionListener) ExitComparison(ctx *ComparisonContext) {}

// EnterCompOp is called when production compOp is entered.
func (s *BaseHavingExpressionListener) EnterCompOp(ctx *CompOpContext) {}

// ExitCompOp is called when production compOp is exited.
func (s *BaseHavingExpressionListener) ExitCompOp(ctx *CompOpContext) {}

// EnterInList is called when production inList is entered.
func (s *BaseHavingExpressionListener) EnterInList(ctx *InListContext) {}

// ExitInList is called when production inList is exited.
func (s *BaseHavingExpressionListener) ExitInList(ctx *InListContext) {}

// EnterSignedNumber is called when production signedNumber is entered.
func (s *BaseHavingExpressionListener) EnterSignedNumber(ctx *SignedNumberContext) {}

// ExitSignedNumber is called when production signedNumber is exited.
func (s *BaseHavingExpressionListener) ExitSignedNumber(ctx *SignedNumberContext) {}

// EnterOperand is called when production operand is entered.
func (s *BaseHavingExpressionListener) EnterOperand(ctx *OperandContext) {}

// ExitOperand is called when production operand is exited.
func (s *BaseHavingExpressionListener) ExitOperand(ctx *OperandContext) {}

// EnterTerm is called when production term is entered.
func (s *BaseHavingExpressionListener) EnterTerm(ctx *TermContext) {}

// ExitTerm is called when production term is exited.
func (s *BaseHavingExpressionListener) ExitTerm(ctx *TermContext) {}

// EnterFactor is called when production factor is entered.
func (s *BaseHavingExpressionListener) EnterFactor(ctx *FactorContext) {}

// ExitFactor is called when production factor is exited.
func (s *BaseHavingExpressionListener) ExitFactor(ctx *FactorContext) {}

// EnterAtom is called when production atom is entered.
func (s *BaseHavingExpressionListener) EnterAtom(ctx *AtomContext) {}

// ExitAtom is called when production atom is exited.
func (s *BaseHavingExpressionListener) ExitAtom(ctx *AtomContext) {}

// EnterFunctionCall is called when production functionCall is entered.
func (s *BaseHavingExpressionListener) EnterFunctionCall(ctx *FunctionCallContext) {}

// ExitFunctionCall is called when production functionCall is exited.
func (s *BaseHavingExpressionListener) ExitFunctionCall(ctx *FunctionCallContext) {}

// EnterFunctionArgList is called when production functionArgList is entered.
func (s *BaseHavingExpressionListener) EnterFunctionArgList(ctx *FunctionArgListContext) {}

// ExitFunctionArgList is called when production functionArgList is exited.
func (s *BaseHavingExpressionListener) ExitFunctionArgList(ctx *FunctionArgListContext) {}

// EnterFuncArg is called when production funcArg is entered.
func (s *BaseHavingExpressionListener) EnterFuncArg(ctx *FuncArgContext) {}

// ExitFuncArg is called when production funcArg is exited.
func (s *BaseHavingExpressionListener) ExitFuncArg(ctx *FuncArgContext) {}

// EnterFuncArgToken is called when production funcArgToken is entered.
func (s *BaseHavingExpressionListener) EnterFuncArgToken(ctx *FuncArgTokenContext) {}

// ExitFuncArgToken is called when production funcArgToken is exited.
func (s *BaseHavingExpressionListener) ExitFuncArgToken(ctx *FuncArgTokenContext) {}

// EnterIdentifier is called when production identifier is entered.
func (s *BaseHavingExpressionListener) EnterIdentifier(ctx *IdentifierContext) {}

// ExitIdentifier is called when production identifier is exited.
func (s *BaseHavingExpressionListener) ExitIdentifier(ctx *IdentifierContext) {}
