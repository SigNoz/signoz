// Generated from grammar/FilterQuery.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


import { QueryContext } from "./FilterQueryParser.js";
import { ExpressionContext } from "./FilterQueryParser.js";
import { OrExpressionContext } from "./FilterQueryParser.js";
import { AndExpressionContext } from "./FilterQueryParser.js";
import { UnaryExpressionContext } from "./FilterQueryParser.js";
import { PrimaryContext } from "./FilterQueryParser.js";
import { ComparisonContext } from "./FilterQueryParser.js";
import { InClauseContext } from "./FilterQueryParser.js";
import { NotInClauseContext } from "./FilterQueryParser.js";
import { ValueListContext } from "./FilterQueryParser.js";
import { FullTextContext } from "./FilterQueryParser.js";
import { FunctionCallContext } from "./FilterQueryParser.js";
import { FunctionParamListContext } from "./FilterQueryParser.js";
import { FunctionParamContext } from "./FilterQueryParser.js";
import { ArrayContext } from "./FilterQueryParser.js";
import { ValueContext } from "./FilterQueryParser.js";
import { KeyContext } from "./FilterQueryParser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `FilterQueryParser`.
 */
export default class FilterQueryListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `FilterQueryParser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: QueryContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: QueryContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.orExpression`.
	 * @param ctx the parse tree
	 */
	enterOrExpression?: (ctx: OrExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.orExpression`.
	 * @param ctx the parse tree
	 */
	exitOrExpression?: (ctx: OrExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.andExpression`.
	 * @param ctx the parse tree
	 */
	enterAndExpression?: (ctx: AndExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.andExpression`.
	 * @param ctx the parse tree
	 */
	exitAndExpression?: (ctx: AndExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.unaryExpression`.
	 * @param ctx the parse tree
	 */
	enterUnaryExpression?: (ctx: UnaryExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.unaryExpression`.
	 * @param ctx the parse tree
	 */
	exitUnaryExpression?: (ctx: UnaryExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.primary`.
	 * @param ctx the parse tree
	 */
	enterPrimary?: (ctx: PrimaryContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.primary`.
	 * @param ctx the parse tree
	 */
	exitPrimary?: (ctx: PrimaryContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.comparison`.
	 * @param ctx the parse tree
	 */
	enterComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.comparison`.
	 * @param ctx the parse tree
	 */
	exitComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.inClause`.
	 * @param ctx the parse tree
	 */
	enterInClause?: (ctx: InClauseContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.inClause`.
	 * @param ctx the parse tree
	 */
	exitInClause?: (ctx: InClauseContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.notInClause`.
	 * @param ctx the parse tree
	 */
	enterNotInClause?: (ctx: NotInClauseContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.notInClause`.
	 * @param ctx the parse tree
	 */
	exitNotInClause?: (ctx: NotInClauseContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.valueList`.
	 * @param ctx the parse tree
	 */
	enterValueList?: (ctx: ValueListContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.valueList`.
	 * @param ctx the parse tree
	 */
	exitValueList?: (ctx: ValueListContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.fullText`.
	 * @param ctx the parse tree
	 */
	enterFullText?: (ctx: FullTextContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.fullText`.
	 * @param ctx the parse tree
	 */
	exitFullText?: (ctx: FullTextContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.functionCall`.
	 * @param ctx the parse tree
	 */
	enterFunctionCall?: (ctx: FunctionCallContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.functionCall`.
	 * @param ctx the parse tree
	 */
	exitFunctionCall?: (ctx: FunctionCallContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.functionParamList`.
	 * @param ctx the parse tree
	 */
	enterFunctionParamList?: (ctx: FunctionParamListContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.functionParamList`.
	 * @param ctx the parse tree
	 */
	exitFunctionParamList?: (ctx: FunctionParamListContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.functionParam`.
	 * @param ctx the parse tree
	 */
	enterFunctionParam?: (ctx: FunctionParamContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.functionParam`.
	 * @param ctx the parse tree
	 */
	exitFunctionParam?: (ctx: FunctionParamContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.array`.
	 * @param ctx the parse tree
	 */
	enterArray?: (ctx: ArrayContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.array`.
	 * @param ctx the parse tree
	 */
	exitArray?: (ctx: ArrayContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.value`.
	 * @param ctx the parse tree
	 */
	enterValue?: (ctx: ValueContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.value`.
	 * @param ctx the parse tree
	 */
	exitValue?: (ctx: ValueContext) => void;
	/**
	 * Enter a parse tree produced by `FilterQueryParser.key`.
	 * @param ctx the parse tree
	 */
	enterKey?: (ctx: KeyContext) => void;
	/**
	 * Exit a parse tree produced by `FilterQueryParser.key`.
	 * @param ctx the parse tree
	 */
	exitKey?: (ctx: KeyContext) => void;
}

