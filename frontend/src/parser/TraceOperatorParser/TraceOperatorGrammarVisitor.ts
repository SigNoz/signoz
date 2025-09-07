// Generated from ./TraceOperatorGrammar.g4 by ANTLR 4.13.1

import {ParseTreeVisitor} from 'antlr4';


import { QueryContext } from "./TraceOperatorGrammarParser";
import { ExpressionContext } from "./TraceOperatorGrammarParser";
import { AtomContext } from "./TraceOperatorGrammarParser";
import { OperatorContext } from "./TraceOperatorGrammarParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `TraceOperatorGrammarParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class TraceOperatorGrammarVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammarParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammarParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpression?: (ctx: ExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammarParser.atom`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAtom?: (ctx: AtomContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammarParser.operator`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOperator?: (ctx: OperatorContext) => Result;
}

