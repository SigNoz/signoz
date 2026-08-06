// Generated from grammar/FilterQuery.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import FilterQueryListener from "./FilterQueryListener.js";
import FilterQueryVisitor from "./FilterQueryVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class FilterQueryParser extends Parser {
	public static readonly LPAREN = 1;
	public static readonly RPAREN = 2;
	public static readonly LBRACK = 3;
	public static readonly RBRACK = 4;
	public static readonly COMMA = 5;
	public static readonly EQUALS = 6;
	public static readonly NOT_EQUALS = 7;
	public static readonly NEQ = 8;
	public static readonly LT = 9;
	public static readonly LE = 10;
	public static readonly GT = 11;
	public static readonly GE = 12;
	public static readonly LIKE = 13;
	public static readonly ILIKE = 14;
	public static readonly BETWEEN = 15;
	public static readonly EXISTS = 16;
	public static readonly REGEXP = 17;
	public static readonly CONTAINS = 18;
	public static readonly IN = 19;
	public static readonly NOT = 20;
	public static readonly AND = 21;
	public static readonly OR = 22;
	public static readonly HASTOKEN = 23;
	public static readonly HAS = 24;
	public static readonly HASANY = 25;
	public static readonly HASALL = 26;
	public static readonly SEARCH = 27;
	public static readonly EXACT = 28;
	public static readonly BOOL = 29;
	public static readonly NUMBER = 30;
	public static readonly QUOTED_TEXT = 31;
	public static readonly KEY = 32;
	public static readonly WS = 33;
	public static readonly FREETEXT = 34;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_query = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_orExpression = 2;
	public static readonly RULE_andExpression = 3;
	public static readonly RULE_unaryExpression = 4;
	public static readonly RULE_primary = 5;
	public static readonly RULE_comparison = 6;
	public static readonly RULE_inClause = 7;
	public static readonly RULE_notInClause = 8;
	public static readonly RULE_valueList = 9;
	public static readonly RULE_fullText = 10;
	public static readonly RULE_functionCall = 11;
	public static readonly RULE_searchCall = 12;
	public static readonly RULE_functionParamList = 13;
	public static readonly RULE_functionParam = 14;
	public static readonly RULE_array = 15;
	public static readonly RULE_value = 16;
	public static readonly RULE_key = 17;
	public static readonly RULE_field = 18;
	public static readonly RULE_exactCall = 19;
	public static readonly literalNames: (string | null)[] = [ null, "'('", 
                                                            "')'", "'['", 
                                                            "']'", "','", 
                                                            null, "'!='", 
                                                            "'<>'", "'<'", 
                                                            "'<='", "'>'", 
                                                            "'>='" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "LPAREN", 
                                                             "RPAREN", "LBRACK", 
                                                             "RBRACK", "COMMA", 
                                                             "EQUALS", "NOT_EQUALS", 
                                                             "NEQ", "LT", 
                                                             "LE", "GT", 
                                                             "GE", "LIKE", 
                                                             "ILIKE", "BETWEEN", 
                                                             "EXISTS", "REGEXP", 
                                                             "CONTAINS", 
                                                             "IN", "NOT", 
                                                             "AND", "OR", 
                                                             "HASTOKEN", 
                                                             "HAS", "HASANY", 
	                                                             "HASALL", "SEARCH",
	                                                             "EXACT", "BOOL",
                                                             "NUMBER", "QUOTED_TEXT", 
                                                             "KEY", "WS", 
                                                             "FREETEXT" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"query", "expression", "orExpression", "andExpression", "unaryExpression", 
		"primary", "comparison", "inClause", "notInClause", "valueList", "fullText", 
		"functionCall", "searchCall", "functionParamList", "functionParam", "array",
		"value", "key", "field", "exactCall",
	];
	public get grammarFileName(): string { return "FilterQuery.g4"; }
	public get literalNames(): (string | null)[] { return FilterQueryParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return FilterQueryParser.symbolicNames; }
	public get ruleNames(): string[] { return FilterQueryParser.ruleNames; }
	public get serializedATN(): number[] { return FilterQueryParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, FilterQueryParser._ATN, FilterQueryParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, FilterQueryParser.RULE_query);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 40;
			this.expression();
			this.state = 41;
			this.match(FilterQueryParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression(): ExpressionContext {
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, FilterQueryParser.RULE_expression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 43;
			this.orExpression();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public orExpression(): OrExpressionContext {
		let localctx: OrExpressionContext = new OrExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, FilterQueryParser.RULE_orExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 45;
			this.andExpression();
			this.state = 50;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===22) {
				{
				{
				this.state = 46;
				this.match(FilterQueryParser.OR);
				this.state = 47;
				this.andExpression();
				}
				}
				this.state = 52;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public andExpression(): AndExpressionContext {
		let localctx: AndExpressionContext = new AndExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, FilterQueryParser.RULE_andExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 53;
			this.unaryExpression();
			this.state = 59;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4289724418) !== 0) || _la===32 || _la===34) {
				{
				this.state = 57;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 21:
					{
					this.state = 54;
					this.match(FilterQueryParser.AND);
					this.state = 55;
					this.unaryExpression();
					}
					break;
				case 1:
				case 20:
				case 23:
				case 24:
				case 25:
				case 26:
				case 27:
				case 28:
				case 29:
				case 30:
				case 31:
				case 32:
				case 34:
					{
					this.state = 56;
					this.unaryExpression();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				this.state = 61;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public unaryExpression(): UnaryExpressionContext {
		let localctx: UnaryExpressionContext = new UnaryExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, FilterQueryParser.RULE_unaryExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 63;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===20) {
				{
				this.state = 62;
				this.match(FilterQueryParser.NOT);
				}
			}

			this.state = 65;
			this.primary();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public primary(): PrimaryContext {
		let localctx: PrimaryContext = new PrimaryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, FilterQueryParser.RULE_primary);
		try {
			this.state = 77;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 4, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 67;
				this.match(FilterQueryParser.LPAREN);
				this.state = 68;
				this.orExpression();
				this.state = 69;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 71;
				this.comparison();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 72;
				this.functionCall();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 73;
				this.searchCall();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 74;
				this.fullText();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 75;
				this.key();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 76;
				this.value();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparison(): ComparisonContext {
		let localctx: ComparisonContext = new ComparisonContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, FilterQueryParser.RULE_comparison);
		let _la: number;
		try {
			this.state = 156;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 79;
				this.field();
				this.state = 80;
				this.match(FilterQueryParser.EQUALS);
				this.state = 81;
				this.value();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 83;
				this.field();
				this.state = 84;
				_la = this._input.LA(1);
				if(!(_la===7 || _la===8)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 85;
				this.value();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 87;
				this.field();
				this.state = 88;
				this.match(FilterQueryParser.LT);
				this.state = 89;
				this.value();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 91;
				this.field();
				this.state = 92;
				this.match(FilterQueryParser.LE);
				this.state = 93;
				this.value();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 95;
				this.field();
				this.state = 96;
				this.match(FilterQueryParser.GT);
				this.state = 97;
				this.value();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 99;
				this.field();
				this.state = 100;
				this.match(FilterQueryParser.GE);
				this.state = 101;
				this.value();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 103;
				this.field();
				this.state = 104;
				_la = this._input.LA(1);
				if(!(_la===13 || _la===14)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 105;
				this.value();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 107;
				this.field();
				this.state = 108;
				this.match(FilterQueryParser.NOT);
				this.state = 109;
				_la = this._input.LA(1);
				if(!(_la===13 || _la===14)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 110;
				this.value();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 112;
				this.field();
				this.state = 113;
				this.match(FilterQueryParser.BETWEEN);
				this.state = 114;
				this.value();
				this.state = 115;
				this.match(FilterQueryParser.AND);
				this.state = 116;
				this.value();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 118;
				this.field();
				this.state = 119;
				this.match(FilterQueryParser.NOT);
				this.state = 120;
				this.match(FilterQueryParser.BETWEEN);
				this.state = 121;
				this.value();
				this.state = 122;
				this.match(FilterQueryParser.AND);
				this.state = 123;
				this.value();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 125;
				this.field();
				this.state = 126;
				this.inClause();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 128;
				this.field();
				this.state = 129;
				this.notInClause();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 131;
				this.field();
				this.state = 132;
				this.match(FilterQueryParser.EXISTS);
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 14);
				{
				this.state = 134;
				this.field();
				this.state = 135;
				this.match(FilterQueryParser.NOT);
				this.state = 136;
				this.match(FilterQueryParser.EXISTS);
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 15);
				{
				this.state = 138;
				this.field();
				this.state = 139;
				this.match(FilterQueryParser.REGEXP);
				this.state = 140;
				this.value();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 16);
				{
				this.state = 142;
				this.field();
				this.state = 143;
				this.match(FilterQueryParser.NOT);
				this.state = 144;
				this.match(FilterQueryParser.REGEXP);
				this.state = 145;
				this.value();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 17);
				{
				this.state = 147;
				this.field();
				this.state = 148;
				this.match(FilterQueryParser.CONTAINS);
				this.state = 149;
				this.value();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 18);
				{
				this.state = 151;
				this.field();
				this.state = 152;
				this.match(FilterQueryParser.NOT);
				this.state = 153;
				this.match(FilterQueryParser.CONTAINS);
				this.state = 154;
				this.value();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public inClause(): InClauseContext {
		let localctx: InClauseContext = new InClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, FilterQueryParser.RULE_inClause);
		try {
			this.state = 170;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 158;
				this.match(FilterQueryParser.IN);
				this.state = 159;
				this.match(FilterQueryParser.LPAREN);
				this.state = 160;
				this.valueList();
				this.state = 161;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 163;
				this.match(FilterQueryParser.IN);
				this.state = 164;
				this.match(FilterQueryParser.LBRACK);
				this.state = 165;
				this.valueList();
				this.state = 166;
				this.match(FilterQueryParser.RBRACK);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 168;
				this.match(FilterQueryParser.IN);
				this.state = 169;
				this.value();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public notInClause(): NotInClauseContext {
		let localctx: NotInClauseContext = new NotInClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, FilterQueryParser.RULE_notInClause);
		try {
			this.state = 187;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 172;
				this.match(FilterQueryParser.NOT);
				this.state = 173;
				this.match(FilterQueryParser.IN);
				this.state = 174;
				this.match(FilterQueryParser.LPAREN);
				this.state = 175;
				this.valueList();
				this.state = 176;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 178;
				this.match(FilterQueryParser.NOT);
				this.state = 179;
				this.match(FilterQueryParser.IN);
				this.state = 180;
				this.match(FilterQueryParser.LBRACK);
				this.state = 181;
				this.valueList();
				this.state = 182;
				this.match(FilterQueryParser.RBRACK);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 184;
				this.match(FilterQueryParser.NOT);
				this.state = 185;
				this.match(FilterQueryParser.IN);
				this.state = 186;
				this.value();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public valueList(): ValueListContext {
		let localctx: ValueListContext = new ValueListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, FilterQueryParser.RULE_valueList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 189;
			this.value();
			this.state = 194;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===5) {
				{
				{
				this.state = 190;
				this.match(FilterQueryParser.COMMA);
				this.state = 191;
				this.value();
				}
				}
				this.state = 196;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fullText(): FullTextContext {
		let localctx: FullTextContext = new FullTextContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, FilterQueryParser.RULE_fullText);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 197;
			_la = this._input.LA(1);
			if(!(_la===31 || _la===34)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionCall(): FunctionCallContext {
		let localctx: FunctionCallContext = new FunctionCallContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, FilterQueryParser.RULE_functionCall);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 199;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 125829120) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 200;
			this.match(FilterQueryParser.LPAREN);
			this.state = 201;
			this.functionParamList();
			this.state = 202;
			this.match(FilterQueryParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public searchCall(): SearchCallContext {
		let localctx: SearchCallContext = new SearchCallContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, FilterQueryParser.RULE_searchCall);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 204;
			this.match(FilterQueryParser.SEARCH);
			this.state = 205;
			this.match(FilterQueryParser.LPAREN);
			this.state = 206;
			this.valueList();
			this.state = 207;
			this.match(FilterQueryParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionParamList(): FunctionParamListContext {
		let localctx: FunctionParamListContext = new FunctionParamListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, FilterQueryParser.RULE_functionParamList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 209;
			this.functionParam();
			this.state = 214;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===5) {
				{
				{
				this.state = 210;
				this.match(FilterQueryParser.COMMA);
				this.state = 211;
				this.functionParam();
				}
				}
				this.state = 216;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionParam(): FunctionParamContext {
		let localctx: FunctionParamContext = new FunctionParamContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, FilterQueryParser.RULE_functionParam);
		try {
			this.state = 220;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 217;
				this.field();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 218;
				this.value();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 219;
				this.array();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public array(): ArrayContext {
		let localctx: ArrayContext = new ArrayContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, FilterQueryParser.RULE_array);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 222;
			this.match(FilterQueryParser.LBRACK);
			this.state = 223;
			this.valueList();
			this.state = 224;
			this.match(FilterQueryParser.RBRACK);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, FilterQueryParser.RULE_value);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 226;
			_la = this._input.LA(1);
			if(!(((((_la - 29)) & ~0x1F) === 0 && ((1 << (_la - 29)) & 15) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public key(): KeyContext {
		let localctx: KeyContext = new KeyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, FilterQueryParser.RULE_key);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 228;
			this.match(FilterQueryParser.KEY);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public field(): FieldContext {
		let localctx: FieldContext = new FieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, FilterQueryParser.RULE_field);
		try {
			this.state = 232;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 32:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 230;
				this.key();
				}
				break;
			case 28:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 231;
				this.exactCall();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public exactCall(): ExactCallContext {
		let localctx: ExactCallContext = new ExactCallContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, FilterQueryParser.RULE_exactCall);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 234;
			this.match(FilterQueryParser.EXACT);
			this.state = 235;
			this.match(FilterQueryParser.LPAREN);
			this.state = 236;
			this.key();
			this.state = 237;
			this.match(FilterQueryParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,34,240,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,2,19,7,19,1,0,1,0,1,0,1,1,1,1,1,2,1,2,1,2,5,2,49,8,2,10,
	2,12,2,52,9,2,1,3,1,3,1,3,1,3,5,3,58,8,3,10,3,12,3,61,9,3,1,4,3,4,64,8,
	4,1,4,1,4,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,3,5,78,8,5,1,6,1,6,1,
	6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,
	6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,
	6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,
	6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,
	6,1,6,1,6,3,6,157,8,6,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,3,
	7,171,8,7,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,3,
	8,188,8,8,1,9,1,9,1,9,5,9,193,8,9,10,9,12,9,196,9,9,1,10,1,10,1,11,1,11,
	1,11,1,11,1,11,1,12,1,12,1,12,1,12,1,12,1,13,1,13,1,13,5,13,213,8,13,10,
	13,12,13,216,9,13,1,14,1,14,1,14,3,14,221,8,14,1,15,1,15,1,15,1,15,1,16,
	1,16,1,17,1,17,1,18,1,18,3,18,233,8,18,1,19,1,19,1,19,1,19,1,19,1,19,0,
	0,20,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,0,5,1,0,7,8,
	1,0,13,14,2,0,31,31,34,34,1,0,23,26,1,0,29,32,255,0,40,1,0,0,0,2,43,1,0,
	0,0,4,45,1,0,0,0,6,53,1,0,0,0,8,63,1,0,0,0,10,77,1,0,0,0,12,156,1,0,0,0,
	14,170,1,0,0,0,16,187,1,0,0,0,18,189,1,0,0,0,20,197,1,0,0,0,22,199,1,0,
	0,0,24,204,1,0,0,0,26,209,1,0,0,0,28,220,1,0,0,0,30,222,1,0,0,0,32,226,
	1,0,0,0,34,228,1,0,0,0,36,232,1,0,0,0,38,234,1,0,0,0,40,41,3,2,1,0,41,42,
	5,0,0,1,42,1,1,0,0,0,43,44,3,4,2,0,44,3,1,0,0,0,45,50,3,6,3,0,46,47,5,22,
	0,0,47,49,3,6,3,0,48,46,1,0,0,0,49,52,1,0,0,0,50,48,1,0,0,0,50,51,1,0,0,
	0,51,5,1,0,0,0,52,50,1,0,0,0,53,59,3,8,4,0,54,55,5,21,0,0,55,58,3,8,4,0,
	56,58,3,8,4,0,57,54,1,0,0,0,57,56,1,0,0,0,58,61,1,0,0,0,59,57,1,0,0,0,59,
	60,1,0,0,0,60,7,1,0,0,0,61,59,1,0,0,0,62,64,5,20,0,0,63,62,1,0,0,0,63,64,
	1,0,0,0,64,65,1,0,0,0,65,66,3,10,5,0,66,9,1,0,0,0,67,68,5,1,0,0,68,69,3,
	4,2,0,69,70,5,2,0,0,70,78,1,0,0,0,71,78,3,12,6,0,72,78,3,22,11,0,73,78,
	3,24,12,0,74,78,3,20,10,0,75,78,3,34,17,0,76,78,3,32,16,0,77,67,1,0,0,0,
	77,71,1,0,0,0,77,72,1,0,0,0,77,73,1,0,0,0,77,74,1,0,0,0,77,75,1,0,0,0,77,
	76,1,0,0,0,78,11,1,0,0,0,79,80,3,36,18,0,80,81,5,6,0,0,81,82,3,32,16,0,
	82,157,1,0,0,0,83,84,3,36,18,0,84,85,7,0,0,0,85,86,3,32,16,0,86,157,1,0,
	0,0,87,88,3,36,18,0,88,89,5,9,0,0,89,90,3,32,16,0,90,157,1,0,0,0,91,92,
	3,36,18,0,92,93,5,10,0,0,93,94,3,32,16,0,94,157,1,0,0,0,95,96,3,36,18,0,
	96,97,5,11,0,0,97,98,3,32,16,0,98,157,1,0,0,0,99,100,3,36,18,0,100,101,
	5,12,0,0,101,102,3,32,16,0,102,157,1,0,0,0,103,104,3,36,18,0,104,105,7,
	1,0,0,105,106,3,32,16,0,106,157,1,0,0,0,107,108,3,36,18,0,108,109,5,20,
	0,0,109,110,7,1,0,0,110,111,3,32,16,0,111,157,1,0,0,0,112,113,3,36,18,0,
	113,114,5,15,0,0,114,115,3,32,16,0,115,116,5,21,0,0,116,117,3,32,16,0,117,
	157,1,0,0,0,118,119,3,36,18,0,119,120,5,20,0,0,120,121,5,15,0,0,121,122,
	3,32,16,0,122,123,5,21,0,0,123,124,3,32,16,0,124,157,1,0,0,0,125,126,3,
	36,18,0,126,127,3,14,7,0,127,157,1,0,0,0,128,129,3,36,18,0,129,130,3,16,
	8,0,130,157,1,0,0,0,131,132,3,36,18,0,132,133,5,16,0,0,133,157,1,0,0,0,
	134,135,3,36,18,0,135,136,5,20,0,0,136,137,5,16,0,0,137,157,1,0,0,0,138,
	139,3,36,18,0,139,140,5,17,0,0,140,141,3,32,16,0,141,157,1,0,0,0,142,143,
	3,36,18,0,143,144,5,20,0,0,144,145,5,17,0,0,145,146,3,32,16,0,146,157,1,
	0,0,0,147,148,3,36,18,0,148,149,5,18,0,0,149,150,3,32,16,0,150,157,1,0,
	0,0,151,152,3,36,18,0,152,153,5,20,0,0,153,154,5,18,0,0,154,155,3,32,16,
	0,155,157,1,0,0,0,156,79,1,0,0,0,156,83,1,0,0,0,156,87,1,0,0,0,156,91,1,
	0,0,0,156,95,1,0,0,0,156,99,1,0,0,0,156,103,1,0,0,0,156,107,1,0,0,0,156,
	112,1,0,0,0,156,118,1,0,0,0,156,125,1,0,0,0,156,128,1,0,0,0,156,131,1,0,
	0,0,156,134,1,0,0,0,156,138,1,0,0,0,156,142,1,0,0,0,156,147,1,0,0,0,156,
	151,1,0,0,0,157,13,1,0,0,0,158,159,5,19,0,0,159,160,5,1,0,0,160,161,3,18,
	9,0,161,162,5,2,0,0,162,171,1,0,0,0,163,164,5,19,0,0,164,165,5,3,0,0,165,
	166,3,18,9,0,166,167,5,4,0,0,167,171,1,0,0,0,168,169,5,19,0,0,169,171,3,
	32,16,0,170,158,1,0,0,0,170,163,1,0,0,0,170,168,1,0,0,0,171,15,1,0,0,0,
	172,173,5,20,0,0,173,174,5,19,0,0,174,175,5,1,0,0,175,176,3,18,9,0,176,
	177,5,2,0,0,177,188,1,0,0,0,178,179,5,20,0,0,179,180,5,19,0,0,180,181,5,
	3,0,0,181,182,3,18,9,0,182,183,5,4,0,0,183,188,1,0,0,0,184,185,5,20,0,0,
	185,186,5,19,0,0,186,188,3,32,16,0,187,172,1,0,0,0,187,178,1,0,0,0,187,
	184,1,0,0,0,188,17,1,0,0,0,189,194,3,32,16,0,190,191,5,5,0,0,191,193,3,
	32,16,0,192,190,1,0,0,0,193,196,1,0,0,0,194,192,1,0,0,0,194,195,1,0,0,0,
	195,19,1,0,0,0,196,194,1,0,0,0,197,198,7,2,0,0,198,21,1,0,0,0,199,200,7,
	3,0,0,200,201,5,1,0,0,201,202,3,26,13,0,202,203,5,2,0,0,203,23,1,0,0,0,
	204,205,5,27,0,0,205,206,5,1,0,0,206,207,3,18,9,0,207,208,5,2,0,0,208,25,
	1,0,0,0,209,214,3,28,14,0,210,211,5,5,0,0,211,213,3,28,14,0,212,210,1,0,
	0,0,213,216,1,0,0,0,214,212,1,0,0,0,214,215,1,0,0,0,215,27,1,0,0,0,216,
	214,1,0,0,0,217,221,3,36,18,0,218,221,3,32,16,0,219,221,3,30,15,0,220,217,
	1,0,0,0,220,218,1,0,0,0,220,219,1,0,0,0,221,29,1,0,0,0,222,223,5,3,0,0,
	223,224,3,18,9,0,224,225,5,4,0,0,225,31,1,0,0,0,226,227,7,4,0,0,227,33,
	1,0,0,0,228,229,5,32,0,0,229,35,1,0,0,0,230,233,3,34,17,0,231,233,3,38,
	19,0,232,230,1,0,0,0,232,231,1,0,0,0,233,37,1,0,0,0,234,235,5,28,0,0,235,
	236,5,1,0,0,236,237,3,34,17,0,237,238,5,2,0,0,238,39,1,0,0,0,12,50,57,59,
	63,77,156,170,187,194,214,220,232];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!FilterQueryParser.__ATN) {
			FilterQueryParser.__ATN = new ATNDeserializer().deserialize(FilterQueryParser._serializedATN);
		}

		return FilterQueryParser.__ATN;
	}


	static DecisionsToDFA = FilterQueryParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class QueryContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(FilterQueryParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_query;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterQuery) {
	 		listener.enterQuery(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitQuery) {
	 		listener.exitQuery(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public orExpression(): OrExpressionContext {
		return this.getTypedRuleContext(OrExpressionContext, 0) as OrExpressionContext;
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_expression;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterExpression) {
	 		listener.enterExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitExpression) {
	 		listener.exitExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitExpression) {
			return visitor.visitExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class OrExpressionContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public andExpression_list(): AndExpressionContext[] {
		return this.getTypedRuleContexts(AndExpressionContext) as AndExpressionContext[];
	}
	public andExpression(i: number): AndExpressionContext {
		return this.getTypedRuleContext(AndExpressionContext, i) as AndExpressionContext;
	}
	public OR_list(): TerminalNode[] {
	    	return this.getTokens(FilterQueryParser.OR);
	}
	public OR(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.OR, i);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_orExpression;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterOrExpression) {
	 		listener.enterOrExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitOrExpression) {
	 		listener.exitOrExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitOrExpression) {
			return visitor.visitOrExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AndExpressionContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public unaryExpression_list(): UnaryExpressionContext[] {
		return this.getTypedRuleContexts(UnaryExpressionContext) as UnaryExpressionContext[];
	}
	public unaryExpression(i: number): UnaryExpressionContext {
		return this.getTypedRuleContext(UnaryExpressionContext, i) as UnaryExpressionContext;
	}
	public AND_list(): TerminalNode[] {
	    	return this.getTokens(FilterQueryParser.AND);
	}
	public AND(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.AND, i);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_andExpression;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterAndExpression) {
	 		listener.enterAndExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitAndExpression) {
	 		listener.exitAndExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitAndExpression) {
			return visitor.visitAndExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class UnaryExpressionContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public primary(): PrimaryContext {
		return this.getTypedRuleContext(PrimaryContext, 0) as PrimaryContext;
	}
	public NOT(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_unaryExpression;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterUnaryExpression) {
	 		listener.enterUnaryExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitUnaryExpression) {
	 		listener.exitUnaryExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitUnaryExpression) {
			return visitor.visitUnaryExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class PrimaryContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public orExpression(): OrExpressionContext {
		return this.getTypedRuleContext(OrExpressionContext, 0) as OrExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public comparison(): ComparisonContext {
		return this.getTypedRuleContext(ComparisonContext, 0) as ComparisonContext;
	}
	public functionCall(): FunctionCallContext {
		return this.getTypedRuleContext(FunctionCallContext, 0) as FunctionCallContext;
	}
	public searchCall(): SearchCallContext {
		return this.getTypedRuleContext(SearchCallContext, 0) as SearchCallContext;
	}
	public fullText(): FullTextContext {
		return this.getTypedRuleContext(FullTextContext, 0) as FullTextContext;
	}
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_primary;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterPrimary) {
	 		listener.enterPrimary(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitPrimary) {
	 		listener.exitPrimary(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitPrimary) {
			return visitor.visitPrimary(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ComparisonContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public field(): FieldContext {
		return this.getTypedRuleContext(FieldContext, 0) as FieldContext;
	}
	public EQUALS(): TerminalNode {
		return this.getToken(FilterQueryParser.EQUALS, 0);
	}
	public value_list(): ValueContext[] {
		return this.getTypedRuleContexts(ValueContext) as ValueContext[];
	}
	public value(i: number): ValueContext {
		return this.getTypedRuleContext(ValueContext, i) as ValueContext;
	}
	public NOT_EQUALS(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_EQUALS, 0);
	}
	public NEQ(): TerminalNode {
		return this.getToken(FilterQueryParser.NEQ, 0);
	}
	public LT(): TerminalNode {
		return this.getToken(FilterQueryParser.LT, 0);
	}
	public LE(): TerminalNode {
		return this.getToken(FilterQueryParser.LE, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(FilterQueryParser.GT, 0);
	}
	public GE(): TerminalNode {
		return this.getToken(FilterQueryParser.GE, 0);
	}
	public LIKE(): TerminalNode {
		return this.getToken(FilterQueryParser.LIKE, 0);
	}
	public ILIKE(): TerminalNode {
		return this.getToken(FilterQueryParser.ILIKE, 0);
	}
	public NOT(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT, 0);
	}
	public BETWEEN(): TerminalNode {
		return this.getToken(FilterQueryParser.BETWEEN, 0);
	}
	public AND(): TerminalNode {
		return this.getToken(FilterQueryParser.AND, 0);
	}
	public inClause(): InClauseContext {
		return this.getTypedRuleContext(InClauseContext, 0) as InClauseContext;
	}
	public notInClause(): NotInClauseContext {
		return this.getTypedRuleContext(NotInClauseContext, 0) as NotInClauseContext;
	}
	public EXISTS(): TerminalNode {
		return this.getToken(FilterQueryParser.EXISTS, 0);
	}
	public REGEXP(): TerminalNode {
		return this.getToken(FilterQueryParser.REGEXP, 0);
	}
	public CONTAINS(): TerminalNode {
		return this.getToken(FilterQueryParser.CONTAINS, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_comparison;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterComparison) {
	 		listener.enterComparison(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitComparison) {
	 		listener.exitComparison(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitComparison) {
			return visitor.visitComparison(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class InClauseContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IN(): TerminalNode {
		return this.getToken(FilterQueryParser.IN, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public valueList(): ValueListContext {
		return this.getTypedRuleContext(ValueListContext, 0) as ValueListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public LBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.RBRACK, 0);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_inClause;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterInClause) {
	 		listener.enterInClause(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitInClause) {
	 		listener.exitInClause(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitInClause) {
			return visitor.visitInClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class NotInClauseContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NOT(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT, 0);
	}
	public IN(): TerminalNode {
		return this.getToken(FilterQueryParser.IN, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public valueList(): ValueListContext {
		return this.getTypedRuleContext(ValueListContext, 0) as ValueListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public LBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.RBRACK, 0);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_notInClause;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterNotInClause) {
	 		listener.enterNotInClause(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitNotInClause) {
	 		listener.exitNotInClause(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitNotInClause) {
			return visitor.visitNotInClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ValueListContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public value_list(): ValueContext[] {
		return this.getTypedRuleContexts(ValueContext) as ValueContext[];
	}
	public value(i: number): ValueContext {
		return this.getTypedRuleContext(ValueContext, i) as ValueContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(FilterQueryParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_valueList;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterValueList) {
	 		listener.enterValueList(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitValueList) {
	 		listener.exitValueList(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitValueList) {
			return visitor.visitValueList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FullTextContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED_TEXT(): TerminalNode {
		return this.getToken(FilterQueryParser.QUOTED_TEXT, 0);
	}
	public FREETEXT(): TerminalNode {
		return this.getToken(FilterQueryParser.FREETEXT, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_fullText;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterFullText) {
	 		listener.enterFullText(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitFullText) {
	 		listener.exitFullText(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitFullText) {
			return visitor.visitFullText(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionCallContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public functionParamList(): FunctionParamListContext {
		return this.getTypedRuleContext(FunctionParamListContext, 0) as FunctionParamListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public HASTOKEN(): TerminalNode {
		return this.getToken(FilterQueryParser.HASTOKEN, 0);
	}
	public HAS(): TerminalNode {
		return this.getToken(FilterQueryParser.HAS, 0);
	}
	public HASANY(): TerminalNode {
		return this.getToken(FilterQueryParser.HASANY, 0);
	}
	public HASALL(): TerminalNode {
		return this.getToken(FilterQueryParser.HASALL, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_functionCall;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterFunctionCall) {
	 		listener.enterFunctionCall(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitFunctionCall) {
	 		listener.exitFunctionCall(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitFunctionCall) {
			return visitor.visitFunctionCall(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SearchCallContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SEARCH(): TerminalNode {
		return this.getToken(FilterQueryParser.SEARCH, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public valueList(): ValueListContext {
		return this.getTypedRuleContext(ValueListContext, 0) as ValueListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_searchCall;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterSearchCall) {
			listener.enterSearchCall(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitSearchCall) {
			listener.exitSearchCall(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitSearchCall) {
			return visitor.visitSearchCall(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionParamListContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public functionParam_list(): FunctionParamContext[] {
		return this.getTypedRuleContexts(FunctionParamContext) as FunctionParamContext[];
	}
	public functionParam(i: number): FunctionParamContext {
		return this.getTypedRuleContext(FunctionParamContext, i) as FunctionParamContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(FilterQueryParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_functionParamList;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterFunctionParamList) {
	 		listener.enterFunctionParamList(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitFunctionParamList) {
	 		listener.exitFunctionParamList(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitFunctionParamList) {
			return visitor.visitFunctionParamList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionParamContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public field(): FieldContext {
		return this.getTypedRuleContext(FieldContext, 0) as FieldContext;
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
	public array(): ArrayContext {
		return this.getTypedRuleContext(ArrayContext, 0) as ArrayContext;
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_functionParam;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterFunctionParam) {
	 		listener.enterFunctionParam(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitFunctionParam) {
	 		listener.exitFunctionParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitFunctionParam) {
			return visitor.visitFunctionParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ArrayContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.LBRACK, 0);
	}
	public valueList(): ValueListContext {
		return this.getTypedRuleContext(ValueListContext, 0) as ValueListContext;
	}
	public RBRACK(): TerminalNode {
		return this.getToken(FilterQueryParser.RBRACK, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_array;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterArray) {
	 		listener.enterArray(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitArray) {
	 		listener.exitArray(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitArray) {
			return visitor.visitArray(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ValueContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED_TEXT(): TerminalNode {
		return this.getToken(FilterQueryParser.QUOTED_TEXT, 0);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(FilterQueryParser.NUMBER, 0);
	}
	public BOOL(): TerminalNode {
		return this.getToken(FilterQueryParser.BOOL, 0);
	}
	public KEY(): TerminalNode {
		return this.getToken(FilterQueryParser.KEY, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_value;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterValue) {
	 		listener.enterValue(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitValue) {
	 		listener.exitValue(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitValue) {
			return visitor.visitValue(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class KeyContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public KEY(): TerminalNode {
		return this.getToken(FilterQueryParser.KEY, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_key;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterKey) {
	 		listener.enterKey(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitKey) {
	 		listener.exitKey(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitKey) {
			return visitor.visitKey(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FieldContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
	}
	public exactCall(): ExactCallContext {
		return this.getTypedRuleContext(ExactCallContext, 0) as ExactCallContext;
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_field;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterField) {
			listener.enterField(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitField) {
			listener.exitField(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitField) {
			return visitor.visitField(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExactCallContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public EXACT(): TerminalNode {
		return this.getToken(FilterQueryParser.EXACT, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_exactCall;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterExactCall) {
			listener.enterExactCall(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitExactCall) {
			listener.exitExactCall(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitExactCall) {
			return visitor.visitExactCall(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
