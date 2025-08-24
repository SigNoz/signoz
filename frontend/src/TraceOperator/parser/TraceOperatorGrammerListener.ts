// Generated from src/TraceOperator/TraceOperatorGrammer.g4 by ANTLR 4.13.1

import {ParseTreeListener} from "antlr4";


import { QueryContext } from "./TraceOperatorGrammerParser";
import { ExpressionContext } from "./TraceOperatorGrammerParser";
import { AtomContext } from "./TraceOperatorGrammerParser";
import { OperatorContext } from "./TraceOperatorGrammerParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `TraceOperatorGrammerParser`.
 */
export default class TraceOperatorGrammerListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammerParser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: QueryContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammerParser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: QueryContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammerParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammerParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammerParser.atom`.
	 * @param ctx the parse tree
	 */
	enterAtom?: (ctx: AtomContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammerParser.atom`.
	 * @param ctx the parse tree
	 */
	exitAtom?: (ctx: AtomContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammerParser.operator`.
	 * @param ctx the parse tree
	 */
	enterOperator?: (ctx: OperatorContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammerParser.operator`.
	 * @param ctx the parse tree
	 */
	exitOperator?: (ctx: OperatorContext) => void;
}

