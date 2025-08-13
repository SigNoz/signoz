// Generated from FilterQuery.g4 by ANTLR 4.13.1

import {ParseTreeListener} from "antlr4";


import { QueryContext } from "./FilterQueryParser";
import { ExpressionContext } from "./FilterQueryParser";
import { OrExpressionContext } from "./FilterQueryParser";
import { AndExpressionContext } from "./FilterQueryParser";
import { UnaryExpressionContext } from "./FilterQueryParser";
import { PrimaryContext } from "./FilterQueryParser";
import { ComparisonContext } from "./FilterQueryParser";
import { InClauseContext } from "./FilterQueryParser";
import { NotInClauseContext } from "./FilterQueryParser";
import { ValueListContext } from "./FilterQueryParser";
import { FullTextContext } from "./FilterQueryParser";
import { FunctionCallContext } from "./FilterQueryParser";
import { FunctionParamListContext } from "./FilterQueryParser";
import { FunctionParamContext } from "./FilterQueryParser";
import { ArrayContext } from "./FilterQueryParser";
import { ValueContext } from "./FilterQueryParser";
import { KeyContext } from "./FilterQueryParser";


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

