// Generated from src/TraceOperator/TraceOperatorGrammer.g4 by ANTLR 4.13.1

import {ParseTreeVisitor} from 'antlr4';


import { QueryContext } from "./TraceOperatorGrammerParser";
import { ExpressionContext } from "./TraceOperatorGrammerParser";
import { AtomContext } from "./TraceOperatorGrammerParser";
import { OperatorContext } from "./TraceOperatorGrammerParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `TraceOperatorGrammerParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class TraceOperatorGrammerVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammerParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammerParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpression?: (ctx: ExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammerParser.atom`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAtom?: (ctx: AtomContext) => Result;
	/**
	 * Visit a parse tree produced by `TraceOperatorGrammerParser.operator`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOperator?: (ctx: OperatorContext) => Result;
}

