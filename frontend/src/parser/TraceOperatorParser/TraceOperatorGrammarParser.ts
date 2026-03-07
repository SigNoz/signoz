// Generated from ./TraceOperatorGrammar.g4 by ANTLR 4.13.1
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
import TraceOperatorGrammarListener from "./TraceOperatorGrammarListener.js";
import TraceOperatorGrammarVisitor from "./TraceOperatorGrammarVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class TraceOperatorGrammarParser extends Parser {
	public static readonly T__0 = 1;
	public static readonly T__1 = 2;
	public static readonly T__2 = 3;
	public static readonly T__3 = 4;
	public static readonly T__4 = 5;
	public static readonly T__5 = 6;
	public static readonly T__6 = 7;
	public static readonly IDENTIFIER = 8;
	public static readonly WS = 9;
	public static readonly EOF = Token.EOF;
	public static readonly RULE_query = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_atom = 2;
	public static readonly RULE_operator = 3;
	public static readonly literalNames: (string | null)[] = [ null, "'NOT'", 
                                                            "'('", "')'", 
                                                            "'=>'", "'&&'", 
                                                            "'||'", "'->'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             "IDENTIFIER", 
                                                             "WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"query", "expression", "atom", "operator",
	];
	public get grammarFileName(): string { return "TraceOperatorGrammar.g4"; }
	public get literalNames(): (string | null)[] { return TraceOperatorGrammarParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return TraceOperatorGrammarParser.symbolicNames; }
	public get ruleNames(): string[] { return TraceOperatorGrammarParser.ruleNames; }
	public get serializedATN(): number[] { return TraceOperatorGrammarParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, TraceOperatorGrammarParser._ATN, TraceOperatorGrammarParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, TraceOperatorGrammarParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 9;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 8;
				this.expression();
				}
				}
				this.state = 11;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 262) !== 0));
			this.state = 13;
			this.match(TraceOperatorGrammarParser.EOF);
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
		this.enterRule(localctx, 2, TraceOperatorGrammarParser.RULE_expression);
		try {
			this.state = 38;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 1, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 15;
				this.match(TraceOperatorGrammarParser.T__0);
				this.state = 16;
				this.expression();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 17;
				this.match(TraceOperatorGrammarParser.T__1);
				this.state = 18;
				this.expression();
				this.state = 19;
				this.match(TraceOperatorGrammarParser.T__2);
				this.state = 20;
				this.operator();
				this.state = 21;
				this.expression();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 23;
				this.match(TraceOperatorGrammarParser.T__1);
				this.state = 24;
				this.expression();
				this.state = 25;
				this.match(TraceOperatorGrammarParser.T__2);
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 27;
				localctx._left = this.atom();
				this.state = 28;
				this.operator();
				this.state = 29;
				localctx._right = this.expression();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 31;
				localctx._left = this.atom();
				this.state = 32;
				this.operator();
				this.state = 33;
				this.match(TraceOperatorGrammarParser.T__1);
				this.state = 34;
				localctx._expr = this.expression();
				this.state = 35;
				this.match(TraceOperatorGrammarParser.T__2);
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 37;
				this.atom();
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
	public atom(): AtomContext {
		let localctx: AtomContext = new AtomContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, TraceOperatorGrammarParser.RULE_atom);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 40;
			this.match(TraceOperatorGrammarParser.IDENTIFIER);
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
	public operator(): OperatorContext {
		let localctx: OperatorContext = new OperatorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, TraceOperatorGrammarParser.RULE_operator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 42;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 242) !== 0))) {
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

	public static readonly _serializedATN: number[] = [4,1,9,45,2,0,7,0,2,1,
	7,1,2,2,7,2,2,3,7,3,1,0,4,0,10,8,0,11,0,12,0,11,1,0,1,0,1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
	1,1,3,1,39,8,1,1,2,1,2,1,3,1,3,1,3,0,0,4,0,2,4,6,0,1,2,0,1,1,4,7,46,0,9,
	1,0,0,0,2,38,1,0,0,0,4,40,1,0,0,0,6,42,1,0,0,0,8,10,3,2,1,0,9,8,1,0,0,0,
	10,11,1,0,0,0,11,9,1,0,0,0,11,12,1,0,0,0,12,13,1,0,0,0,13,14,5,0,0,1,14,
	1,1,0,0,0,15,16,5,1,0,0,16,39,3,2,1,0,17,18,5,2,0,0,18,19,3,2,1,0,19,20,
	5,3,0,0,20,21,3,6,3,0,21,22,3,2,1,0,22,39,1,0,0,0,23,24,5,2,0,0,24,25,3,
	2,1,0,25,26,5,3,0,0,26,39,1,0,0,0,27,28,3,4,2,0,28,29,3,6,3,0,29,30,3,2,
	1,0,30,39,1,0,0,0,31,32,3,4,2,0,32,33,3,6,3,0,33,34,5,2,0,0,34,35,3,2,1,
	0,35,36,5,3,0,0,36,39,1,0,0,0,37,39,3,4,2,0,38,15,1,0,0,0,38,17,1,0,0,0,
	38,23,1,0,0,0,38,27,1,0,0,0,38,31,1,0,0,0,38,37,1,0,0,0,39,3,1,0,0,0,40,
	41,5,8,0,0,41,5,1,0,0,0,42,43,7,0,0,0,43,7,1,0,0,0,2,11,38];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!TraceOperatorGrammarParser.__ATN) {
			TraceOperatorGrammarParser.__ATN = new ATNDeserializer().deserialize(TraceOperatorGrammarParser._serializedATN);
		}

		return TraceOperatorGrammarParser.__ATN;
	}


	static DecisionsToDFA = TraceOperatorGrammarParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class QueryContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammarParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(TraceOperatorGrammarParser.EOF, 0);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammarParser.RULE_query;
	}
	public enterRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.enterQuery) {
	 		listener.enterQuery(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.exitQuery) {
	 		listener.exitQuery(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammarVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	public _left!: AtomContext;
	public _right!: ExpressionContext;
	public _expr!: ExpressionContext;
	constructor(parser?: TraceOperatorGrammarParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public operator(): OperatorContext {
		return this.getTypedRuleContext(OperatorContext, 0) as OperatorContext;
	}
	public atom(): AtomContext {
		return this.getTypedRuleContext(AtomContext, 0) as AtomContext;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammarParser.RULE_expression;
	}
	public enterRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.enterExpression) {
	 		listener.enterExpression(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.exitExpression) {
	 		listener.exitExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammarVisitor<Result>): Result {
		if (visitor.visitExpression) {
			return visitor.visitExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AtomContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammarParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(TraceOperatorGrammarParser.IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammarParser.RULE_atom;
	}
	public enterRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.enterAtom) {
	 		listener.enterAtom(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.exitAtom) {
	 		listener.exitAtom(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammarVisitor<Result>): Result {
		if (visitor.visitAtom) {
			return visitor.visitAtom(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class OperatorContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammarParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammarParser.RULE_operator;
	}
	public enterRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.enterOperator) {
	 		listener.enterOperator(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammarListener): void {
	    if(listener.exitOperator) {
	 		listener.exitOperator(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammarVisitor<Result>): Result {
		if (visitor.visitOperator) {
			return visitor.visitOperator(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
