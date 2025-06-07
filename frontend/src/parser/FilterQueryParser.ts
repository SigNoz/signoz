// Generated from src/query-grammar/FilterQuery.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer,
	DecisionState,
	DFA,
	FailedPredicateException,
	RecognitionException,
	NoViableAltException,
	BailErrorStrategy,
	Parser,
	ParserATNSimulator,
	RuleContext,
	ParserRuleContext,
	PredictionMode,
	PredictionContextCache,
	TerminalNode,
	RuleNode,
	Token,
	TokenStream,
	Interval,
	IntervalSet,
} from 'antlr4';
import FilterQueryListener from './FilterQueryListener.js';
import FilterQueryVisitor from './FilterQueryVisitor.js';

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
	public static readonly NOT_LIKE = 14;
	public static readonly ILIKE = 15;
	public static readonly NOT_ILIKE = 16;
	public static readonly BETWEEN = 17;
	public static readonly NOT_BETWEEN = 18;
	public static readonly EXISTS = 19;
	public static readonly NOT_EXISTS = 20;
	public static readonly REGEXP = 21;
	public static readonly NOT_REGEXP = 22;
	public static readonly CONTAINS = 23;
	public static readonly NOT_CONTAINS = 24;
	public static readonly IN = 25;
	public static readonly NOT_IN = 26;
	public static readonly NOT = 27;
	public static readonly AND = 28;
	public static readonly OR = 29;
	public static readonly HAS = 30;
	public static readonly HASANY = 31;
	public static readonly HASALL = 32;
	public static readonly HASNONE = 33;
	public static readonly BOOL = 34;
	public static readonly NUMBER = 35;
	public static readonly QUOTED_TEXT = 36;
	public static readonly KEY = 37;
	public static readonly WS = 38;
	public static readonly EOF = Token.EOF;
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
	public static readonly RULE_functionParamList = 12;
	public static readonly RULE_functionParam = 13;
	public static readonly RULE_array = 14;
	public static readonly RULE_value = 15;
	public static readonly RULE_key = 16;
	public static readonly literalNames: (string | null)[] = [
		null,
		"'('",
		"')'",
		"'['",
		"']'",
		"','",
		null,
		"'!='",
		"'<>'",
		"'<'",
		"'<='",
		"'>'",
		"'>='",
	];
	public static readonly symbolicNames: (string | null)[] = [
		null,
		'LPAREN',
		'RPAREN',
		'LBRACK',
		'RBRACK',
		'COMMA',
		'EQUALS',
		'NOT_EQUALS',
		'NEQ',
		'LT',
		'LE',
		'GT',
		'GE',
		'LIKE',
		'NOT_LIKE',
		'ILIKE',
		'NOT_ILIKE',
		'BETWEEN',
		'NOT_BETWEEN',
		'EXISTS',
		'NOT_EXISTS',
		'REGEXP',
		'NOT_REGEXP',
		'CONTAINS',
		'NOT_CONTAINS',
		'IN',
		'NOT_IN',
		'NOT',
		'AND',
		'OR',
		'HAS',
		'HASANY',
		'HASALL',
		'HASNONE',
		'BOOL',
		'NUMBER',
		'QUOTED_TEXT',
		'KEY',
		'WS',
	];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		'query',
		'expression',
		'orExpression',
		'andExpression',
		'unaryExpression',
		'primary',
		'comparison',
		'inClause',
		'notInClause',
		'valueList',
		'fullText',
		'functionCall',
		'functionParamList',
		'functionParam',
		'array',
		'value',
		'key',
	];
	public get grammarFileName(): string {
		return 'FilterQuery.g4';
	}
	public get literalNames(): (string | null)[] {
		return FilterQueryParser.literalNames;
	}
	public get symbolicNames(): (string | null)[] {
		return FilterQueryParser.symbolicNames;
	}
	public get ruleNames(): string[] {
		return FilterQueryParser.ruleNames;
	}
	public get serializedATN(): number[] {
		return FilterQueryParser._serializedATN;
	}

	protected createFailedPredicateException(
		predicate?: string,
		message?: string,
	): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(
			this,
			FilterQueryParser._ATN,
			FilterQueryParser.DecisionsToDFA,
			new PredictionContextCache(),
		);
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, FilterQueryParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 34;
				this.expression();
				this.state = 40;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (
					((_la & ~0x1f) === 0 && ((1 << _la) & 4160749570) !== 0) ||
					(((_la - 32) & ~0x1f) === 0 && ((1 << (_la - 32)) & 51) !== 0)
				) {
					{
						this.state = 38;
						this._errHandler.sync(this);
						switch (this._input.LA(1)) {
							case 28:
							case 29:
								{
									this.state = 35;
									_la = this._input.LA(1);
									if (!(_la === 28 || _la === 29)) {
										this._errHandler.recoverInline(this);
									} else {
										this._errHandler.reportMatch(this);
										this.consume();
									}
									this.state = 36;
									this.expression();
								}
								break;
							case 1:
							case 27:
							case 30:
							case 31:
							case 32:
							case 33:
							case 36:
							case 37:
								{
									this.state = 37;
									this.expression();
								}
								break;
							default:
								throw new NoViableAltException(this);
						}
					}
					this.state = 42;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 43;
				this.match(FilterQueryParser.EOF);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression(): ExpressionContext {
		let localctx: ExpressionContext = new ExpressionContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 2, FilterQueryParser.RULE_expression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 45;
				this.orExpression();
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public orExpression(): OrExpressionContext {
		let localctx: OrExpressionContext = new OrExpressionContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 4, FilterQueryParser.RULE_orExpression);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 47;
				this.andExpression();
				this.state = 52;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 2, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
							{
								this.state = 48;
								this.match(FilterQueryParser.OR);
								this.state = 49;
								this.andExpression();
							}
						}
					}
					this.state = 54;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 2, this._ctx);
				}
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public andExpression(): AndExpressionContext {
		let localctx: AndExpressionContext = new AndExpressionContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 6, FilterQueryParser.RULE_andExpression);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 55;
				this.unaryExpression();
				this.state = 61;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
							this.state = 59;
							this._errHandler.sync(this);
							switch (this._input.LA(1)) {
								case 28:
									{
										this.state = 56;
										this.match(FilterQueryParser.AND);
										this.state = 57;
										this.unaryExpression();
									}
									break;
								case 1:
								case 27:
								case 30:
								case 31:
								case 32:
								case 33:
								case 36:
								case 37:
									{
										this.state = 58;
										this.unaryExpression();
									}
									break;
								default:
									throw new NoViableAltException(this);
							}
						}
					}
					this.state = 63;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
				}
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public unaryExpression(): UnaryExpressionContext {
		let localctx: UnaryExpressionContext = new UnaryExpressionContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 8, FilterQueryParser.RULE_unaryExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 65;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === 27) {
					{
						this.state = 64;
						this.match(FilterQueryParser.NOT);
					}
				}

				this.state = 67;
				this.primary();
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public primary(): PrimaryContext {
		let localctx: PrimaryContext = new PrimaryContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 10, FilterQueryParser.RULE_primary);
		try {
			this.state = 76;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
				case 1:
					this.enterOuterAlt(localctx, 1);
					{
						this.state = 69;
						this.match(FilterQueryParser.LPAREN);
						this.state = 70;
						this.orExpression();
						this.state = 71;
						this.match(FilterQueryParser.RPAREN);
					}
					break;
				case 37:
					this.enterOuterAlt(localctx, 2);
					{
						this.state = 73;
						this.comparison();
					}
					break;
				case 30:
				case 31:
				case 32:
				case 33:
					this.enterOuterAlt(localctx, 3);
					{
						this.state = 74;
						this.functionCall();
					}
					break;
				case 36:
					this.enterOuterAlt(localctx, 4);
					{
						this.state = 75;
						this.fullText();
					}
					break;
				default:
					throw new NoViableAltException(this);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparison(): ComparisonContext {
		let localctx: ComparisonContext = new ComparisonContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 12, FilterQueryParser.RULE_comparison);
		let _la: number;
		try {
			this.state = 150;
			this._errHandler.sync(this);
			switch (this._interp.adaptivePredict(this._input, 7, this._ctx)) {
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
						if (!(_la === 7 || _la === 8)) {
							this._errHandler.recoverInline(this);
						} else {
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
						if (!(_la === 13 || _la === 15)) {
							this._errHandler.recoverInline(this);
						} else {
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
						_la = this._input.LA(1);
						if (!(_la === 14 || _la === 16)) {
							this._errHandler.recoverInline(this);
						} else {
							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 108;
						this.value();
					}
					break;
				case 9:
					this.enterOuterAlt(localctx, 9);
					{
						this.state = 110;
						this.key();
						this.state = 111;
						this.match(FilterQueryParser.BETWEEN);
						this.state = 112;
						this.value();
						this.state = 113;
						this.match(FilterQueryParser.AND);
						this.state = 114;
						this.value();
					}
					break;
				case 10:
					this.enterOuterAlt(localctx, 10);
					{
						this.state = 116;
						this.key();
						this.state = 117;
						this.match(FilterQueryParser.NOT_BETWEEN);
						this.state = 118;
						this.value();
						this.state = 119;
						this.match(FilterQueryParser.AND);
						this.state = 120;
						this.value();
					}
					break;
				case 11:
					this.enterOuterAlt(localctx, 11);
					{
						this.state = 122;
						this.key();
						this.state = 123;
						this.inClause();
					}
					break;
				case 12:
					this.enterOuterAlt(localctx, 12);
					{
						this.state = 125;
						this.key();
						this.state = 126;
						this.notInClause();
					}
					break;
				case 13:
					this.enterOuterAlt(localctx, 13);
					{
						this.state = 128;
						this.key();
						this.state = 129;
						this.match(FilterQueryParser.EXISTS);
					}
					break;
				case 14:
					this.enterOuterAlt(localctx, 14);
					{
						this.state = 131;
						this.key();
						this.state = 132;
						this.match(FilterQueryParser.NOT_EXISTS);
					}
					break;
				case 15:
					this.enterOuterAlt(localctx, 15);
					{
						this.state = 134;
						this.key();
						this.state = 135;
						this.match(FilterQueryParser.REGEXP);
						this.state = 136;
						this.value();
					}
					break;
				case 16:
					this.enterOuterAlt(localctx, 16);
					{
						this.state = 138;
						this.key();
						this.state = 139;
						this.match(FilterQueryParser.NOT_REGEXP);
						this.state = 140;
						this.value();
					}
					break;
				case 17:
					this.enterOuterAlt(localctx, 17);
					{
						this.state = 142;
						this.key();
						this.state = 143;
						this.match(FilterQueryParser.CONTAINS);
						this.state = 144;
						this.value();
					}
					break;
				case 18:
					this.enterOuterAlt(localctx, 18);
					{
						this.state = 146;
						this.key();
						this.state = 147;
						this.match(FilterQueryParser.NOT_CONTAINS);
						this.state = 148;
						this.value();
					}
					break;
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public inClause(): InClauseContext {
		let localctx: InClauseContext = new InClauseContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 14, FilterQueryParser.RULE_inClause);
		try {
			this.state = 162;
			this._errHandler.sync(this);
			switch (this._interp.adaptivePredict(this._input, 8, this._ctx)) {
				case 1:
					this.enterOuterAlt(localctx, 1);
					{
						this.state = 152;
						this.match(FilterQueryParser.IN);
						this.state = 153;
						this.match(FilterQueryParser.LPAREN);
						this.state = 154;
						this.valueList();
						this.state = 155;
						this.match(FilterQueryParser.RPAREN);
					}
					break;
				case 2:
					this.enterOuterAlt(localctx, 2);
					{
						this.state = 157;
						this.match(FilterQueryParser.IN);
						this.state = 158;
						this.match(FilterQueryParser.LBRACK);
						this.state = 159;
						this.valueList();
						this.state = 160;
						this.match(FilterQueryParser.RBRACK);
					}
					break;
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public notInClause(): NotInClauseContext {
		let localctx: NotInClauseContext = new NotInClauseContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 16, FilterQueryParser.RULE_notInClause);
		try {
			this.state = 174;
			this._errHandler.sync(this);
			switch (this._interp.adaptivePredict(this._input, 9, this._ctx)) {
				case 1:
					this.enterOuterAlt(localctx, 1);
					{
						this.state = 164;
						this.match(FilterQueryParser.NOT_IN);
						this.state = 165;
						this.match(FilterQueryParser.LPAREN);
						this.state = 166;
						this.valueList();
						this.state = 167;
						this.match(FilterQueryParser.RPAREN);
					}
					break;
				case 2:
					this.enterOuterAlt(localctx, 2);
					{
						this.state = 169;
						this.match(FilterQueryParser.NOT_IN);
						this.state = 170;
						this.match(FilterQueryParser.LBRACK);
						this.state = 171;
						this.valueList();
						this.state = 172;
						this.match(FilterQueryParser.RBRACK);
					}
					break;
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public valueList(): ValueListContext {
		let localctx: ValueListContext = new ValueListContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 18, FilterQueryParser.RULE_valueList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 176;
				this.value();
				this.state = 181;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === 5) {
					{
						{
							this.state = 177;
							this.match(FilterQueryParser.COMMA);
							this.state = 178;
							this.value();
						}
					}
					this.state = 183;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fullText(): FullTextContext {
		let localctx: FullTextContext = new FullTextContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 20, FilterQueryParser.RULE_fullText);
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 184;
				this.match(FilterQueryParser.QUOTED_TEXT);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionCall(): FunctionCallContext {
		let localctx: FunctionCallContext = new FunctionCallContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 22, FilterQueryParser.RULE_functionCall);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 186;
				_la = this._input.LA(1);
				if (!(((_la - 30) & ~0x1f) === 0 && ((1 << (_la - 30)) & 15) !== 0)) {
					this._errHandler.recoverInline(this);
				} else {
					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 187;
				this.match(FilterQueryParser.LPAREN);
				this.state = 188;
				this.functionParamList();
				this.state = 189;
				this.match(FilterQueryParser.RPAREN);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionParamList(): FunctionParamListContext {
		let localctx: FunctionParamListContext = new FunctionParamListContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 24, FilterQueryParser.RULE_functionParamList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 191;
				this.functionParam();
				this.state = 196;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === 5) {
					{
						{
							this.state = 192;
							this.match(FilterQueryParser.COMMA);
							this.state = 193;
							this.functionParam();
						}
					}
					this.state = 198;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionParam(): FunctionParamContext {
		let localctx: FunctionParamContext = new FunctionParamContext(
			this,
			this._ctx,
			this.state,
		);
		this.enterRule(localctx, 26, FilterQueryParser.RULE_functionParam);
		try {
			this.state = 202;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
				case 37:
					this.enterOuterAlt(localctx, 1);
					{
						this.state = 199;
						this.key();
					}
					break;
				case 34:
				case 35:
				case 36:
					this.enterOuterAlt(localctx, 2);
					{
						this.state = 200;
						this.value();
					}
					break;
				case 3:
					this.enterOuterAlt(localctx, 3);
					{
						this.state = 201;
						this.array();
					}
					break;
				default:
					throw new NoViableAltException(this);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public array(): ArrayContext {
		let localctx: ArrayContext = new ArrayContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, FilterQueryParser.RULE_array);
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 204;
				this.match(FilterQueryParser.LBRACK);
				this.state = 205;
				this.valueList();
				this.state = 206;
				this.match(FilterQueryParser.RBRACK);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, FilterQueryParser.RULE_value);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 208;
				_la = this._input.LA(1);
				if (!(((_la - 34) & ~0x1f) === 0 && ((1 << (_la - 34)) & 7) !== 0)) {
					this._errHandler.recoverInline(this);
				} else {
					this._errHandler.reportMatch(this);
					this.consume();
				}
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public key(): KeyContext {
		let localctx: KeyContext = new KeyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, FilterQueryParser.RULE_key);
		try {
			this.enterOuterAlt(localctx, 1);
			{
				this.state = 210;
				this.match(FilterQueryParser.KEY);
			}
		} catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		} finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [
		4,
		1,
		38,
		213,
		2,
		0,
		7,
		0,
		2,
		1,
		7,
		1,
		2,
		2,
		7,
		2,
		2,
		3,
		7,
		3,
		2,
		4,
		7,
		4,
		2,
		5,
		7,
		5,
		2,
		6,
		7,
		6,
		2,
		7,
		7,
		7,
		2,
		8,
		7,
		8,
		2,
		9,
		7,
		9,
		2,
		10,
		7,
		10,
		2,
		11,
		7,
		11,
		2,
		12,
		7,
		12,
		2,
		13,
		7,
		13,
		2,
		14,
		7,
		14,
		2,
		15,
		7,
		15,
		2,
		16,
		7,
		16,
		1,
		0,
		1,
		0,
		1,
		0,
		1,
		0,
		5,
		0,
		39,
		8,
		0,
		10,
		0,
		12,
		0,
		42,
		9,
		0,
		1,
		0,
		1,
		0,
		1,
		1,
		1,
		1,
		1,
		2,
		1,
		2,
		1,
		2,
		5,
		2,
		51,
		8,
		2,
		10,
		2,
		12,
		2,
		54,
		9,
		2,
		1,
		3,
		1,
		3,
		1,
		3,
		1,
		3,
		5,
		3,
		60,
		8,
		3,
		10,
		3,
		12,
		3,
		63,
		9,
		3,
		1,
		4,
		3,
		4,
		66,
		8,
		4,
		1,
		4,
		1,
		4,
		1,
		5,
		1,
		5,
		1,
		5,
		1,
		5,
		1,
		5,
		1,
		5,
		1,
		5,
		3,
		5,
		77,
		8,
		5,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		1,
		6,
		3,
		6,
		151,
		8,
		6,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		1,
		7,
		3,
		7,
		163,
		8,
		7,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		1,
		8,
		3,
		8,
		175,
		8,
		8,
		1,
		9,
		1,
		9,
		1,
		9,
		5,
		9,
		180,
		8,
		9,
		10,
		9,
		12,
		9,
		183,
		9,
		9,
		1,
		10,
		1,
		10,
		1,
		11,
		1,
		11,
		1,
		11,
		1,
		11,
		1,
		11,
		1,
		12,
		1,
		12,
		1,
		12,
		5,
		12,
		195,
		8,
		12,
		10,
		12,
		12,
		12,
		198,
		9,
		12,
		1,
		13,
		1,
		13,
		1,
		13,
		3,
		13,
		203,
		8,
		13,
		1,
		14,
		1,
		14,
		1,
		14,
		1,
		14,
		1,
		15,
		1,
		15,
		1,
		16,
		1,
		16,
		1,
		16,
		0,
		0,
		17,
		0,
		2,
		4,
		6,
		8,
		10,
		12,
		14,
		16,
		18,
		20,
		22,
		24,
		26,
		28,
		30,
		32,
		0,
		6,
		1,
		0,
		28,
		29,
		1,
		0,
		7,
		8,
		2,
		0,
		13,
		13,
		15,
		15,
		2,
		0,
		14,
		14,
		16,
		16,
		1,
		0,
		30,
		33,
		1,
		0,
		34,
		36,
		227,
		0,
		34,
		1,
		0,
		0,
		0,
		2,
		45,
		1,
		0,
		0,
		0,
		4,
		47,
		1,
		0,
		0,
		0,
		6,
		55,
		1,
		0,
		0,
		0,
		8,
		65,
		1,
		0,
		0,
		0,
		10,
		76,
		1,
		0,
		0,
		0,
		12,
		150,
		1,
		0,
		0,
		0,
		14,
		162,
		1,
		0,
		0,
		0,
		16,
		174,
		1,
		0,
		0,
		0,
		18,
		176,
		1,
		0,
		0,
		0,
		20,
		184,
		1,
		0,
		0,
		0,
		22,
		186,
		1,
		0,
		0,
		0,
		24,
		191,
		1,
		0,
		0,
		0,
		26,
		202,
		1,
		0,
		0,
		0,
		28,
		204,
		1,
		0,
		0,
		0,
		30,
		208,
		1,
		0,
		0,
		0,
		32,
		210,
		1,
		0,
		0,
		0,
		34,
		40,
		3,
		2,
		1,
		0,
		35,
		36,
		7,
		0,
		0,
		0,
		36,
		39,
		3,
		2,
		1,
		0,
		37,
		39,
		3,
		2,
		1,
		0,
		38,
		35,
		1,
		0,
		0,
		0,
		38,
		37,
		1,
		0,
		0,
		0,
		39,
		42,
		1,
		0,
		0,
		0,
		40,
		38,
		1,
		0,
		0,
		0,
		40,
		41,
		1,
		0,
		0,
		0,
		41,
		43,
		1,
		0,
		0,
		0,
		42,
		40,
		1,
		0,
		0,
		0,
		43,
		44,
		5,
		0,
		0,
		1,
		44,
		1,
		1,
		0,
		0,
		0,
		45,
		46,
		3,
		4,
		2,
		0,
		46,
		3,
		1,
		0,
		0,
		0,
		47,
		52,
		3,
		6,
		3,
		0,
		48,
		49,
		5,
		29,
		0,
		0,
		49,
		51,
		3,
		6,
		3,
		0,
		50,
		48,
		1,
		0,
		0,
		0,
		51,
		54,
		1,
		0,
		0,
		0,
		52,
		50,
		1,
		0,
		0,
		0,
		52,
		53,
		1,
		0,
		0,
		0,
		53,
		5,
		1,
		0,
		0,
		0,
		54,
		52,
		1,
		0,
		0,
		0,
		55,
		61,
		3,
		8,
		4,
		0,
		56,
		57,
		5,
		28,
		0,
		0,
		57,
		60,
		3,
		8,
		4,
		0,
		58,
		60,
		3,
		8,
		4,
		0,
		59,
		56,
		1,
		0,
		0,
		0,
		59,
		58,
		1,
		0,
		0,
		0,
		60,
		63,
		1,
		0,
		0,
		0,
		61,
		59,
		1,
		0,
		0,
		0,
		61,
		62,
		1,
		0,
		0,
		0,
		62,
		7,
		1,
		0,
		0,
		0,
		63,
		61,
		1,
		0,
		0,
		0,
		64,
		66,
		5,
		27,
		0,
		0,
		65,
		64,
		1,
		0,
		0,
		0,
		65,
		66,
		1,
		0,
		0,
		0,
		66,
		67,
		1,
		0,
		0,
		0,
		67,
		68,
		3,
		10,
		5,
		0,
		68,
		9,
		1,
		0,
		0,
		0,
		69,
		70,
		5,
		1,
		0,
		0,
		70,
		71,
		3,
		4,
		2,
		0,
		71,
		72,
		5,
		2,
		0,
		0,
		72,
		77,
		1,
		0,
		0,
		0,
		73,
		77,
		3,
		12,
		6,
		0,
		74,
		77,
		3,
		22,
		11,
		0,
		75,
		77,
		3,
		20,
		10,
		0,
		76,
		69,
		1,
		0,
		0,
		0,
		76,
		73,
		1,
		0,
		0,
		0,
		76,
		74,
		1,
		0,
		0,
		0,
		76,
		75,
		1,
		0,
		0,
		0,
		77,
		11,
		1,
		0,
		0,
		0,
		78,
		79,
		3,
		32,
		16,
		0,
		79,
		80,
		5,
		6,
		0,
		0,
		80,
		81,
		3,
		30,
		15,
		0,
		81,
		151,
		1,
		0,
		0,
		0,
		82,
		83,
		3,
		32,
		16,
		0,
		83,
		84,
		7,
		1,
		0,
		0,
		84,
		85,
		3,
		30,
		15,
		0,
		85,
		151,
		1,
		0,
		0,
		0,
		86,
		87,
		3,
		32,
		16,
		0,
		87,
		88,
		5,
		9,
		0,
		0,
		88,
		89,
		3,
		30,
		15,
		0,
		89,
		151,
		1,
		0,
		0,
		0,
		90,
		91,
		3,
		32,
		16,
		0,
		91,
		92,
		5,
		10,
		0,
		0,
		92,
		93,
		3,
		30,
		15,
		0,
		93,
		151,
		1,
		0,
		0,
		0,
		94,
		95,
		3,
		32,
		16,
		0,
		95,
		96,
		5,
		11,
		0,
		0,
		96,
		97,
		3,
		30,
		15,
		0,
		97,
		151,
		1,
		0,
		0,
		0,
		98,
		99,
		3,
		32,
		16,
		0,
		99,
		100,
		5,
		12,
		0,
		0,
		100,
		101,
		3,
		30,
		15,
		0,
		101,
		151,
		1,
		0,
		0,
		0,
		102,
		103,
		3,
		32,
		16,
		0,
		103,
		104,
		7,
		2,
		0,
		0,
		104,
		105,
		3,
		30,
		15,
		0,
		105,
		151,
		1,
		0,
		0,
		0,
		106,
		107,
		3,
		32,
		16,
		0,
		107,
		108,
		7,
		3,
		0,
		0,
		108,
		109,
		3,
		30,
		15,
		0,
		109,
		151,
		1,
		0,
		0,
		0,
		110,
		111,
		3,
		32,
		16,
		0,
		111,
		112,
		5,
		17,
		0,
		0,
		112,
		113,
		3,
		30,
		15,
		0,
		113,
		114,
		5,
		28,
		0,
		0,
		114,
		115,
		3,
		30,
		15,
		0,
		115,
		151,
		1,
		0,
		0,
		0,
		116,
		117,
		3,
		32,
		16,
		0,
		117,
		118,
		5,
		18,
		0,
		0,
		118,
		119,
		3,
		30,
		15,
		0,
		119,
		120,
		5,
		28,
		0,
		0,
		120,
		121,
		3,
		30,
		15,
		0,
		121,
		151,
		1,
		0,
		0,
		0,
		122,
		123,
		3,
		32,
		16,
		0,
		123,
		124,
		3,
		14,
		7,
		0,
		124,
		151,
		1,
		0,
		0,
		0,
		125,
		126,
		3,
		32,
		16,
		0,
		126,
		127,
		3,
		16,
		8,
		0,
		127,
		151,
		1,
		0,
		0,
		0,
		128,
		129,
		3,
		32,
		16,
		0,
		129,
		130,
		5,
		19,
		0,
		0,
		130,
		151,
		1,
		0,
		0,
		0,
		131,
		132,
		3,
		32,
		16,
		0,
		132,
		133,
		5,
		20,
		0,
		0,
		133,
		151,
		1,
		0,
		0,
		0,
		134,
		135,
		3,
		32,
		16,
		0,
		135,
		136,
		5,
		21,
		0,
		0,
		136,
		137,
		3,
		30,
		15,
		0,
		137,
		151,
		1,
		0,
		0,
		0,
		138,
		139,
		3,
		32,
		16,
		0,
		139,
		140,
		5,
		22,
		0,
		0,
		140,
		141,
		3,
		30,
		15,
		0,
		141,
		151,
		1,
		0,
		0,
		0,
		142,
		143,
		3,
		32,
		16,
		0,
		143,
		144,
		5,
		23,
		0,
		0,
		144,
		145,
		3,
		30,
		15,
		0,
		145,
		151,
		1,
		0,
		0,
		0,
		146,
		147,
		3,
		32,
		16,
		0,
		147,
		148,
		5,
		24,
		0,
		0,
		148,
		149,
		3,
		30,
		15,
		0,
		149,
		151,
		1,
		0,
		0,
		0,
		150,
		78,
		1,
		0,
		0,
		0,
		150,
		82,
		1,
		0,
		0,
		0,
		150,
		86,
		1,
		0,
		0,
		0,
		150,
		90,
		1,
		0,
		0,
		0,
		150,
		94,
		1,
		0,
		0,
		0,
		150,
		98,
		1,
		0,
		0,
		0,
		150,
		102,
		1,
		0,
		0,
		0,
		150,
		106,
		1,
		0,
		0,
		0,
		150,
		110,
		1,
		0,
		0,
		0,
		150,
		116,
		1,
		0,
		0,
		0,
		150,
		122,
		1,
		0,
		0,
		0,
		150,
		125,
		1,
		0,
		0,
		0,
		150,
		128,
		1,
		0,
		0,
		0,
		150,
		131,
		1,
		0,
		0,
		0,
		150,
		134,
		1,
		0,
		0,
		0,
		150,
		138,
		1,
		0,
		0,
		0,
		150,
		142,
		1,
		0,
		0,
		0,
		150,
		146,
		1,
		0,
		0,
		0,
		151,
		13,
		1,
		0,
		0,
		0,
		152,
		153,
		5,
		25,
		0,
		0,
		153,
		154,
		5,
		1,
		0,
		0,
		154,
		155,
		3,
		18,
		9,
		0,
		155,
		156,
		5,
		2,
		0,
		0,
		156,
		163,
		1,
		0,
		0,
		0,
		157,
		158,
		5,
		25,
		0,
		0,
		158,
		159,
		5,
		3,
		0,
		0,
		159,
		160,
		3,
		18,
		9,
		0,
		160,
		161,
		5,
		4,
		0,
		0,
		161,
		163,
		1,
		0,
		0,
		0,
		162,
		152,
		1,
		0,
		0,
		0,
		162,
		157,
		1,
		0,
		0,
		0,
		163,
		15,
		1,
		0,
		0,
		0,
		164,
		165,
		5,
		26,
		0,
		0,
		165,
		166,
		5,
		1,
		0,
		0,
		166,
		167,
		3,
		18,
		9,
		0,
		167,
		168,
		5,
		2,
		0,
		0,
		168,
		175,
		1,
		0,
		0,
		0,
		169,
		170,
		5,
		26,
		0,
		0,
		170,
		171,
		5,
		3,
		0,
		0,
		171,
		172,
		3,
		18,
		9,
		0,
		172,
		173,
		5,
		4,
		0,
		0,
		173,
		175,
		1,
		0,
		0,
		0,
		174,
		164,
		1,
		0,
		0,
		0,
		174,
		169,
		1,
		0,
		0,
		0,
		175,
		17,
		1,
		0,
		0,
		0,
		176,
		181,
		3,
		30,
		15,
		0,
		177,
		178,
		5,
		5,
		0,
		0,
		178,
		180,
		3,
		30,
		15,
		0,
		179,
		177,
		1,
		0,
		0,
		0,
		180,
		183,
		1,
		0,
		0,
		0,
		181,
		179,
		1,
		0,
		0,
		0,
		181,
		182,
		1,
		0,
		0,
		0,
		182,
		19,
		1,
		0,
		0,
		0,
		183,
		181,
		1,
		0,
		0,
		0,
		184,
		185,
		5,
		36,
		0,
		0,
		185,
		21,
		1,
		0,
		0,
		0,
		186,
		187,
		7,
		4,
		0,
		0,
		187,
		188,
		5,
		1,
		0,
		0,
		188,
		189,
		3,
		24,
		12,
		0,
		189,
		190,
		5,
		2,
		0,
		0,
		190,
		23,
		1,
		0,
		0,
		0,
		191,
		196,
		3,
		26,
		13,
		0,
		192,
		193,
		5,
		5,
		0,
		0,
		193,
		195,
		3,
		26,
		13,
		0,
		194,
		192,
		1,
		0,
		0,
		0,
		195,
		198,
		1,
		0,
		0,
		0,
		196,
		194,
		1,
		0,
		0,
		0,
		196,
		197,
		1,
		0,
		0,
		0,
		197,
		25,
		1,
		0,
		0,
		0,
		198,
		196,
		1,
		0,
		0,
		0,
		199,
		203,
		3,
		32,
		16,
		0,
		200,
		203,
		3,
		30,
		15,
		0,
		201,
		203,
		3,
		28,
		14,
		0,
		202,
		199,
		1,
		0,
		0,
		0,
		202,
		200,
		1,
		0,
		0,
		0,
		202,
		201,
		1,
		0,
		0,
		0,
		203,
		27,
		1,
		0,
		0,
		0,
		204,
		205,
		5,
		3,
		0,
		0,
		205,
		206,
		3,
		18,
		9,
		0,
		206,
		207,
		5,
		4,
		0,
		0,
		207,
		29,
		1,
		0,
		0,
		0,
		208,
		209,
		7,
		5,
		0,
		0,
		209,
		31,
		1,
		0,
		0,
		0,
		210,
		211,
		5,
		37,
		0,
		0,
		211,
		33,
		1,
		0,
		0,
		0,
		13,
		38,
		40,
		52,
		59,
		61,
		65,
		76,
		150,
		162,
		174,
		181,
		196,
		202,
	];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!FilterQueryParser.__ATN) {
			FilterQueryParser.__ATN = new ATNDeserializer().deserialize(
				FilterQueryParser._serializedATN,
			);
		}

		return FilterQueryParser.__ATN;
	}

	static DecisionsToDFA = FilterQueryParser._ATN.decisionToState.map(
		(ds: DecisionState, index: number) => new DFA(ds, index),
	);
}

export class QueryContext extends ParserRuleContext {
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(FilterQueryParser.EOF, 0);
	}
	public AND_list(): TerminalNode[] {
		return this.getTokens(FilterQueryParser.AND);
	}
	public AND(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.AND, i);
	}
	public OR_list(): TerminalNode[] {
		return this.getTokens(FilterQueryParser.OR);
	}
	public OR(i: number): TerminalNode {
		return this.getToken(FilterQueryParser.OR, i);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_query;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterQuery) {
			listener.enterQuery(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitQuery) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public orExpression(): OrExpressionContext {
		return this.getTypedRuleContext(
			OrExpressionContext,
			0,
		) as OrExpressionContext;
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_expression;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterExpression) {
			listener.enterExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitExpression) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public andExpression_list(): AndExpressionContext[] {
		return this.getTypedRuleContexts(
			AndExpressionContext,
		) as AndExpressionContext[];
	}
	public andExpression(i: number): AndExpressionContext {
		return this.getTypedRuleContext(
			AndExpressionContext,
			i,
		) as AndExpressionContext;
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
		if (listener.enterOrExpression) {
			listener.enterOrExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitOrExpression) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public unaryExpression_list(): UnaryExpressionContext[] {
		return this.getTypedRuleContexts(
			UnaryExpressionContext,
		) as UnaryExpressionContext[];
	}
	public unaryExpression(i: number): UnaryExpressionContext {
		return this.getTypedRuleContext(
			UnaryExpressionContext,
			i,
		) as UnaryExpressionContext;
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
		if (listener.enterAndExpression) {
			listener.enterAndExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitAndExpression) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
		if (listener.enterUnaryExpression) {
			listener.enterUnaryExpression(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitUnaryExpression) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public orExpression(): OrExpressionContext {
		return this.getTypedRuleContext(
			OrExpressionContext,
			0,
		) as OrExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
	}
	public comparison(): ComparisonContext {
		return this.getTypedRuleContext(ComparisonContext, 0) as ComparisonContext;
	}
	public functionCall(): FunctionCallContext {
		return this.getTypedRuleContext(
			FunctionCallContext,
			0,
		) as FunctionCallContext;
	}
	public fullText(): FullTextContext {
		return this.getTypedRuleContext(FullTextContext, 0) as FullTextContext;
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_primary;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterPrimary) {
			listener.enterPrimary(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitPrimary) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
	public NOT_LIKE(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_LIKE, 0);
	}
	public NOT_ILIKE(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_ILIKE, 0);
	}
	public BETWEEN(): TerminalNode {
		return this.getToken(FilterQueryParser.BETWEEN, 0);
	}
	public AND(): TerminalNode {
		return this.getToken(FilterQueryParser.AND, 0);
	}
	public NOT_BETWEEN(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_BETWEEN, 0);
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
	public NOT_EXISTS(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_EXISTS, 0);
	}
	public REGEXP(): TerminalNode {
		return this.getToken(FilterQueryParser.REGEXP, 0);
	}
	public NOT_REGEXP(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_REGEXP, 0);
	}
	public CONTAINS(): TerminalNode {
		return this.getToken(FilterQueryParser.CONTAINS, 0);
	}
	public NOT_CONTAINS(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_CONTAINS, 0);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_comparison;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterComparison) {
			listener.enterComparison(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitComparison) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_inClause;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterInClause) {
			listener.enterInClause(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitInClause) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public NOT_IN(): TerminalNode {
		return this.getToken(FilterQueryParser.NOT_IN, 0);
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
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_notInClause;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterNotInClause) {
			listener.enterNotInClause(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitNotInClause) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
		if (listener.enterValueList) {
			listener.enterValueList(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitValueList) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public QUOTED_TEXT(): TerminalNode {
		return this.getToken(FilterQueryParser.QUOTED_TEXT, 0);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_fullText;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterFullText) {
			listener.enterFullText(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitFullText) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.LPAREN, 0);
	}
	public functionParamList(): FunctionParamListContext {
		return this.getTypedRuleContext(
			FunctionParamListContext,
			0,
		) as FunctionParamListContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(FilterQueryParser.RPAREN, 0);
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
	public HASNONE(): TerminalNode {
		return this.getToken(FilterQueryParser.HASNONE, 0);
	}
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_functionCall;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterFunctionCall) {
			listener.enterFunctionCall(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitFunctionCall) {
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

export class FunctionParamListContext extends ParserRuleContext {
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
		super(parent, invokingState);
		this.parser = parser;
	}
	public functionParam_list(): FunctionParamContext[] {
		return this.getTypedRuleContexts(
			FunctionParamContext,
		) as FunctionParamContext[];
	}
	public functionParam(i: number): FunctionParamContext {
		return this.getTypedRuleContext(
			FunctionParamContext,
			i,
		) as FunctionParamContext;
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
		if (listener.enterFunctionParamList) {
			listener.enterFunctionParamList(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitFunctionParamList) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
		if (listener.enterFunctionParam) {
			listener.enterFunctionParam(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitFunctionParam) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
		if (listener.enterArray) {
			listener.enterArray(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitArray) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
	public get ruleIndex(): number {
		return FilterQueryParser.RULE_value;
	}
	public enterRule(listener: FilterQueryListener): void {
		if (listener.enterValue) {
			listener.enterValue(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitValue) {
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
	constructor(
		parser?: FilterQueryParser,
		parent?: ParserRuleContext,
		invokingState?: number,
	) {
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
		if (listener.enterKey) {
			listener.enterKey(this);
		}
	}
	public exitRule(listener: FilterQueryListener): void {
		if (listener.exitKey) {
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
