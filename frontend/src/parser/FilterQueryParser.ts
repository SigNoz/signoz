// Generated from FilterQuery.g4 by ANTLR 4.13.2
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
	public static readonly PATTERN_CALL = 28;
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
	public static readonly RULE_patternCall = 13;
	public static readonly RULE_functionParamList = 14;
	public static readonly RULE_functionParam = 15;
	public static readonly RULE_array = 16;
	public static readonly RULE_value = 17;
	public static readonly RULE_key = 18;
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
                                                             "PATTERN_CALL", 
                                                             "BOOL", "NUMBER", 
                                                             "QUOTED_TEXT", 
                                                             "KEY", "WS", 
                                                             "FREETEXT" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"query", "expression", "orExpression", "andExpression", "unaryExpression", 
		"primary", "comparison", "inClause", "notInClause", "valueList", "fullText", 
		"functionCall", "searchCall", "patternCall", "functionParamList", "functionParam", 
		"array", "value", "key",
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
			this.state = 38;
			this.expression();
			this.state = 39;
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
			this.state = 41;
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
			this.state = 43;
			this.andExpression();
			this.state = 48;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===22) {
				{
				{
				this.state = 44;
				this.match(FilterQueryParser.OR);
				this.state = 45;
				this.andExpression();
				}
				}
				this.state = 50;
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
			this.state = 51;
			this.unaryExpression();
			this.state = 57;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4289724418) !== 0) || _la===32 || _la===34) {
				{
				this.state = 55;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 21:
					{
					this.state = 52;
					this.match(FilterQueryParser.AND);
					this.state = 53;
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
					this.state = 54;
					this.unaryExpression();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				this.state = 59;
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
			this.state = 61;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===20) {
				{
				this.state = 60;
				this.match(FilterQueryParser.NOT);
				}
			}

			this.state = 63;
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
			this.state = 76;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 4, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 65;
				this.match(FilterQueryParser.LPAREN);
				this.state = 66;
				this.orExpression();
				this.state = 67;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 69;
				this.comparison();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 70;
				this.functionCall();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 71;
				this.searchCall();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 72;
				this.patternCall();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 73;
				this.fullText();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 74;
				this.key();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 75;
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
			this.state = 155;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 78;
				this.key();
				this.state = 79;
				this.match(FilterQueryParser.EQUALS);
				this.state = 80;
				this.value();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 82;
				this.key();
				this.state = 83;
				_la = this._input.LA(1);
				if(!(_la===7 || _la===8)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 84;
				this.value();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 86;
				this.key();
				this.state = 87;
				this.match(FilterQueryParser.LT);
				this.state = 88;
				this.value();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 90;
				this.key();
				this.state = 91;
				this.match(FilterQueryParser.LE);
				this.state = 92;
				this.value();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 94;
				this.key();
				this.state = 95;
				this.match(FilterQueryParser.GT);
				this.state = 96;
				this.value();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 98;
				this.key();
				this.state = 99;
				this.match(FilterQueryParser.GE);
				this.state = 100;
				this.value();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 102;
				this.key();
				this.state = 103;
				_la = this._input.LA(1);
				if(!(_la===13 || _la===14)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 104;
				this.value();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 106;
				this.key();
				this.state = 107;
				this.match(FilterQueryParser.NOT);
				this.state = 108;
				_la = this._input.LA(1);
				if(!(_la===13 || _la===14)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 109;
				this.value();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 111;
				this.key();
				this.state = 112;
				this.match(FilterQueryParser.BETWEEN);
				this.state = 113;
				this.value();
				this.state = 114;
				this.match(FilterQueryParser.AND);
				this.state = 115;
				this.value();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 117;
				this.key();
				this.state = 118;
				this.match(FilterQueryParser.NOT);
				this.state = 119;
				this.match(FilterQueryParser.BETWEEN);
				this.state = 120;
				this.value();
				this.state = 121;
				this.match(FilterQueryParser.AND);
				this.state = 122;
				this.value();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 124;
				this.key();
				this.state = 125;
				this.inClause();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 127;
				this.key();
				this.state = 128;
				this.notInClause();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 130;
				this.key();
				this.state = 131;
				this.match(FilterQueryParser.EXISTS);
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 14);
				{
				this.state = 133;
				this.key();
				this.state = 134;
				this.match(FilterQueryParser.NOT);
				this.state = 135;
				this.match(FilterQueryParser.EXISTS);
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 15);
				{
				this.state = 137;
				this.key();
				this.state = 138;
				this.match(FilterQueryParser.REGEXP);
				this.state = 139;
				this.value();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 16);
				{
				this.state = 141;
				this.key();
				this.state = 142;
				this.match(FilterQueryParser.NOT);
				this.state = 143;
				this.match(FilterQueryParser.REGEXP);
				this.state = 144;
				this.value();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 17);
				{
				this.state = 146;
				this.key();
				this.state = 147;
				this.match(FilterQueryParser.CONTAINS);
				this.state = 148;
				this.value();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 18);
				{
				this.state = 150;
				this.key();
				this.state = 151;
				this.match(FilterQueryParser.NOT);
				this.state = 152;
				this.match(FilterQueryParser.CONTAINS);
				this.state = 153;
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
			this.state = 169;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 157;
				this.match(FilterQueryParser.IN);
				this.state = 158;
				this.match(FilterQueryParser.LPAREN);
				this.state = 159;
				this.valueList();
				this.state = 160;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 162;
				this.match(FilterQueryParser.IN);
				this.state = 163;
				this.match(FilterQueryParser.LBRACK);
				this.state = 164;
				this.valueList();
				this.state = 165;
				this.match(FilterQueryParser.RBRACK);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 167;
				this.match(FilterQueryParser.IN);
				this.state = 168;
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
			this.state = 186;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 171;
				this.match(FilterQueryParser.NOT);
				this.state = 172;
				this.match(FilterQueryParser.IN);
				this.state = 173;
				this.match(FilterQueryParser.LPAREN);
				this.state = 174;
				this.valueList();
				this.state = 175;
				this.match(FilterQueryParser.RPAREN);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 177;
				this.match(FilterQueryParser.NOT);
				this.state = 178;
				this.match(FilterQueryParser.IN);
				this.state = 179;
				this.match(FilterQueryParser.LBRACK);
				this.state = 180;
				this.valueList();
				this.state = 181;
				this.match(FilterQueryParser.RBRACK);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 183;
				this.match(FilterQueryParser.NOT);
				this.state = 184;
				this.match(FilterQueryParser.IN);
				this.state = 185;
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
			this.state = 188;
			this.value();
			this.state = 193;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===5) {
				{
				{
				this.state = 189;
				this.match(FilterQueryParser.COMMA);
				this.state = 190;
				this.value();
				}
				}
				this.state = 195;
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
			this.state = 196;
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
			this.state = 198;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 125829120) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 199;
			this.match(FilterQueryParser.LPAREN);
			this.state = 200;
			this.functionParamList();
			this.state = 201;
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
			this.state = 203;
			this.match(FilterQueryParser.SEARCH);
			this.state = 204;
			this.match(FilterQueryParser.LPAREN);
			this.state = 205;
			this.valueList();
			this.state = 206;
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
	public patternCall(): PatternCallContext {
		let localctx: PatternCallContext = new PatternCallContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, FilterQueryParser.RULE_patternCall);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 208;
			this.match(FilterQueryParser.PATTERN_CALL);
			this.state = 209;
			this.valueList();
			this.state = 210;
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
		this.enterRule(localctx, 28, FilterQueryParser.RULE_functionParamList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 212;
			this.functionParam();
			this.state = 217;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===5) {
				{
				{
				this.state = 213;
				this.match(FilterQueryParser.COMMA);
				this.state = 214;
				this.functionParam();
				}
				}
				this.state = 219;
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
		this.enterRule(localctx, 30, FilterQueryParser.RULE_functionParam);
		try {
			this.state = 223;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 220;
				this.key();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 221;
				this.value();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 222;
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
		this.enterRule(localctx, 32, FilterQueryParser.RULE_array);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 225;
			this.match(FilterQueryParser.LBRACK);
			this.state = 226;
			this.valueList();
			this.state = 227;
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
		this.enterRule(localctx, 34, FilterQueryParser.RULE_value);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 229;
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
		this.enterRule(localctx, 36, FilterQueryParser.RULE_key);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 231;
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

	public static readonly _serializedATN: number[] = [4,1,34,234,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,1,0,1,0,1,0,1,1,1,1,1,2,1,2,1,2,5,2,47,8,2,10,2,12,2,50,
	9,2,1,3,1,3,1,3,1,3,5,3,56,8,3,10,3,12,3,59,9,3,1,4,3,4,62,8,4,1,4,1,4,
	1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,3,5,77,8,5,1,6,1,6,1,6,1,6,
	1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
	1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
	1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
	1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
	1,6,3,6,156,8,6,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,3,7,170,
	8,7,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,3,8,187,
	8,8,1,9,1,9,1,9,5,9,192,8,9,10,9,12,9,195,9,9,1,10,1,10,1,11,1,11,1,11,
	1,11,1,11,1,12,1,12,1,12,1,12,1,12,1,13,1,13,1,13,1,13,1,14,1,14,1,14,5,
	14,216,8,14,10,14,12,14,219,9,14,1,15,1,15,1,15,3,15,224,8,15,1,16,1,16,
	1,16,1,16,1,17,1,17,1,18,1,18,1,18,0,0,19,0,2,4,6,8,10,12,14,16,18,20,22,
	24,26,28,30,32,34,36,0,5,1,0,7,8,1,0,13,14,2,0,31,31,34,34,1,0,23,26,1,
	0,29,32,250,0,38,1,0,0,0,2,41,1,0,0,0,4,43,1,0,0,0,6,51,1,0,0,0,8,61,1,
	0,0,0,10,76,1,0,0,0,12,155,1,0,0,0,14,169,1,0,0,0,16,186,1,0,0,0,18,188,
	1,0,0,0,20,196,1,0,0,0,22,198,1,0,0,0,24,203,1,0,0,0,26,208,1,0,0,0,28,
	212,1,0,0,0,30,223,1,0,0,0,32,225,1,0,0,0,34,229,1,0,0,0,36,231,1,0,0,0,
	38,39,3,2,1,0,39,40,5,0,0,1,40,1,1,0,0,0,41,42,3,4,2,0,42,3,1,0,0,0,43,
	48,3,6,3,0,44,45,5,22,0,0,45,47,3,6,3,0,46,44,1,0,0,0,47,50,1,0,0,0,48,
	46,1,0,0,0,48,49,1,0,0,0,49,5,1,0,0,0,50,48,1,0,0,0,51,57,3,8,4,0,52,53,
	5,21,0,0,53,56,3,8,4,0,54,56,3,8,4,0,55,52,1,0,0,0,55,54,1,0,0,0,56,59,
	1,0,0,0,57,55,1,0,0,0,57,58,1,0,0,0,58,7,1,0,0,0,59,57,1,0,0,0,60,62,5,
	20,0,0,61,60,1,0,0,0,61,62,1,0,0,0,62,63,1,0,0,0,63,64,3,10,5,0,64,9,1,
	0,0,0,65,66,5,1,0,0,66,67,3,4,2,0,67,68,5,2,0,0,68,77,1,0,0,0,69,77,3,12,
	6,0,70,77,3,22,11,0,71,77,3,24,12,0,72,77,3,26,13,0,73,77,3,20,10,0,74,
	77,3,36,18,0,75,77,3,34,17,0,76,65,1,0,0,0,76,69,1,0,0,0,76,70,1,0,0,0,
	76,71,1,0,0,0,76,72,1,0,0,0,76,73,1,0,0,0,76,74,1,0,0,0,76,75,1,0,0,0,77,
	11,1,0,0,0,78,79,3,36,18,0,79,80,5,6,0,0,80,81,3,34,17,0,81,156,1,0,0,0,
	82,83,3,36,18,0,83,84,7,0,0,0,84,85,3,34,17,0,85,156,1,0,0,0,86,87,3,36,
	18,0,87,88,5,9,0,0,88,89,3,34,17,0,89,156,1,0,0,0,90,91,3,36,18,0,91,92,
	5,10,0,0,92,93,3,34,17,0,93,156,1,0,0,0,94,95,3,36,18,0,95,96,5,11,0,0,
	96,97,3,34,17,0,97,156,1,0,0,0,98,99,3,36,18,0,99,100,5,12,0,0,100,101,
	3,34,17,0,101,156,1,0,0,0,102,103,3,36,18,0,103,104,7,1,0,0,104,105,3,34,
	17,0,105,156,1,0,0,0,106,107,3,36,18,0,107,108,5,20,0,0,108,109,7,1,0,0,
	109,110,3,34,17,0,110,156,1,0,0,0,111,112,3,36,18,0,112,113,5,15,0,0,113,
	114,3,34,17,0,114,115,5,21,0,0,115,116,3,34,17,0,116,156,1,0,0,0,117,118,
	3,36,18,0,118,119,5,20,0,0,119,120,5,15,0,0,120,121,3,34,17,0,121,122,5,
	21,0,0,122,123,3,34,17,0,123,156,1,0,0,0,124,125,3,36,18,0,125,126,3,14,
	7,0,126,156,1,0,0,0,127,128,3,36,18,0,128,129,3,16,8,0,129,156,1,0,0,0,
	130,131,3,36,18,0,131,132,5,16,0,0,132,156,1,0,0,0,133,134,3,36,18,0,134,
	135,5,20,0,0,135,136,5,16,0,0,136,156,1,0,0,0,137,138,3,36,18,0,138,139,
	5,17,0,0,139,140,3,34,17,0,140,156,1,0,0,0,141,142,3,36,18,0,142,143,5,
	20,0,0,143,144,5,17,0,0,144,145,3,34,17,0,145,156,1,0,0,0,146,147,3,36,
	18,0,147,148,5,18,0,0,148,149,3,34,17,0,149,156,1,0,0,0,150,151,3,36,18,
	0,151,152,5,20,0,0,152,153,5,18,0,0,153,154,3,34,17,0,154,156,1,0,0,0,155,
	78,1,0,0,0,155,82,1,0,0,0,155,86,1,0,0,0,155,90,1,0,0,0,155,94,1,0,0,0,
	155,98,1,0,0,0,155,102,1,0,0,0,155,106,1,0,0,0,155,111,1,0,0,0,155,117,
	1,0,0,0,155,124,1,0,0,0,155,127,1,0,0,0,155,130,1,0,0,0,155,133,1,0,0,0,
	155,137,1,0,0,0,155,141,1,0,0,0,155,146,1,0,0,0,155,150,1,0,0,0,156,13,
	1,0,0,0,157,158,5,19,0,0,158,159,5,1,0,0,159,160,3,18,9,0,160,161,5,2,0,
	0,161,170,1,0,0,0,162,163,5,19,0,0,163,164,5,3,0,0,164,165,3,18,9,0,165,
	166,5,4,0,0,166,170,1,0,0,0,167,168,5,19,0,0,168,170,3,34,17,0,169,157,
	1,0,0,0,169,162,1,0,0,0,169,167,1,0,0,0,170,15,1,0,0,0,171,172,5,20,0,0,
	172,173,5,19,0,0,173,174,5,1,0,0,174,175,3,18,9,0,175,176,5,2,0,0,176,187,
	1,0,0,0,177,178,5,20,0,0,178,179,5,19,0,0,179,180,5,3,0,0,180,181,3,18,
	9,0,181,182,5,4,0,0,182,187,1,0,0,0,183,184,5,20,0,0,184,185,5,19,0,0,185,
	187,3,34,17,0,186,171,1,0,0,0,186,177,1,0,0,0,186,183,1,0,0,0,187,17,1,
	0,0,0,188,193,3,34,17,0,189,190,5,5,0,0,190,192,3,34,17,0,191,189,1,0,0,
	0,192,195,1,0,0,0,193,191,1,0,0,0,193,194,1,0,0,0,194,19,1,0,0,0,195,193,
	1,0,0,0,196,197,7,2,0,0,197,21,1,0,0,0,198,199,7,3,0,0,199,200,5,1,0,0,
	200,201,3,28,14,0,201,202,5,2,0,0,202,23,1,0,0,0,203,204,5,27,0,0,204,205,
	5,1,0,0,205,206,3,18,9,0,206,207,5,2,0,0,207,25,1,0,0,0,208,209,5,28,0,
	0,209,210,3,18,9,0,210,211,5,2,0,0,211,27,1,0,0,0,212,217,3,30,15,0,213,
	214,5,5,0,0,214,216,3,30,15,0,215,213,1,0,0,0,216,219,1,0,0,0,217,215,1,
	0,0,0,217,218,1,0,0,0,218,29,1,0,0,0,219,217,1,0,0,0,220,224,3,36,18,0,
	221,224,3,34,17,0,222,224,3,32,16,0,223,220,1,0,0,0,223,221,1,0,0,0,223,
	222,1,0,0,0,224,31,1,0,0,0,225,226,5,3,0,0,226,227,3,18,9,0,227,228,5,4,
	0,0,228,33,1,0,0,0,229,230,7,4,0,0,230,35,1,0,0,0,231,232,5,32,0,0,232,
	37,1,0,0,0,11,48,55,57,61,76,155,169,186,193,217,223];

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
	public patternCall(): PatternCallContext {
		return this.getTypedRuleContext(PatternCallContext, 0) as PatternCallContext;
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
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
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


export class PatternCallContext extends ParserRuleContext {
	constructor(parser?: FilterQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public PATTERN_CALL(): TerminalNode {
		return this.getToken(FilterQueryParser.PATTERN_CALL, 0);
	}
	public valueList(): ValueListContext {
		return this.getTypedRuleContext(ValueListContext, 0) as ValueListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
    public get ruleIndex(): number {
    	return FilterQueryParser.RULE_patternCall;
	}
	public enterRule(listener: FilterQueryListener): void {
	    if(listener.enterPatternCall) {
	 		listener.enterPatternCall(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
	    if(listener.exitPatternCall) {
	 		listener.exitPatternCall(this);
		}
	}
	// @Override
	public accept<Result>(visitor: FilterQueryVisitor<Result>): Result {
		if (visitor.visitPatternCall) {
			return visitor.visitPatternCall(this);
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
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
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
