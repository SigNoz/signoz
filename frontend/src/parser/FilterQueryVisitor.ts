// Generated from FilterQuery.g4 by ANTLR 4.13.1

import {ParseTreeVisitor} from 'antlr4';


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
 * This interface defines a complete generic visitor for a parse tree produced
 * by `FilterQueryParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class FilterQueryVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `FilterQueryParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpression?: (ctx: ExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.orExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOrExpression?: (ctx: OrExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.andExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAndExpression?: (ctx: AndExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.unaryExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnaryExpression?: (ctx: UnaryExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.primary`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPrimary?: (ctx: PrimaryContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.comparison`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitComparison?: (ctx: ComparisonContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.inClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInClause?: (ctx: InClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.notInClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNotInClause?: (ctx: NotInClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.valueList`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitValueList?: (ctx: ValueListContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.fullText`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFullText?: (ctx: FullTextContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.functionCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionCall?: (ctx: FunctionCallContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.functionParamList`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionParamList?: (ctx: FunctionParamListContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.functionParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionParam?: (ctx: FunctionParamContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.array`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArray?: (ctx: ArrayContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.value`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitValue?: (ctx: ValueContext) => Result;
	/**
	 * Visit a parse tree produced by `FilterQueryParser.key`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitKey?: (ctx: KeyContext) => Result;
}

