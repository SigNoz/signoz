// Generated from ./TraceOperatorGrammar.g4 by ANTLR 4.13.1

import {ParseTreeListener} from "antlr4";


import { QueryContext } from "./TraceOperatorGrammarParser";
import { ExpressionContext } from "./TraceOperatorGrammarParser";
import { AtomContext } from "./TraceOperatorGrammarParser";
import { OperatorContext } from "./TraceOperatorGrammarParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `TraceOperatorGrammarParser`.
 */
export default class TraceOperatorGrammarListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammarParser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: QueryContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammarParser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: QueryContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammarParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammarParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammarParser.atom`.
	 * @param ctx the parse tree
	 */
	enterAtom?: (ctx: AtomContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammarParser.atom`.
	 * @param ctx the parse tree
	 */
	exitAtom?: (ctx: AtomContext) => void;
	/**
	 * Enter a parse tree produced by `TraceOperatorGrammarParser.operator`.
	 * @param ctx the parse tree
	 */
	enterOperator?: (ctx: OperatorContext) => void;
	/**
	 * Exit a parse tree produced by `TraceOperatorGrammarParser.operator`.
	 * @param ctx the parse tree
	 */
	exitOperator?: (ctx: OperatorContext) => void;
}

