// Generated from src/TraceOperator/TraceOperatorGrammer.g4 by ANTLR 4.13.1
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
import TraceOperatorGrammerListener from "./TraceOperatorGrammerListener.js";
import TraceOperatorGrammerVisitor from "./TraceOperatorGrammerVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class TraceOperatorGrammerParser extends Parser {
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
	public static readonly literalNames: (string | null)[] = [ null, "'('", 
                                                            "')'", "'=>'", 
                                                            "'&&'", "'||'", 
                                                            "'NOT'", "'->'" ];
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
	public get grammarFileName(): string { return "TraceOperatorGrammer.g4"; }
	public get literalNames(): (string | null)[] { return TraceOperatorGrammerParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return TraceOperatorGrammerParser.symbolicNames; }
	public get ruleNames(): string[] { return TraceOperatorGrammerParser.ruleNames; }
	public get serializedATN(): number[] { return TraceOperatorGrammerParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, TraceOperatorGrammerParser._ATN, TraceOperatorGrammerParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, TraceOperatorGrammerParser.RULE_query);
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
			} while (_la===1 || _la===8);
			this.state = 13;
			this.match(TraceOperatorGrammerParser.EOF);
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
		this.enterRule(localctx, 2, TraceOperatorGrammerParser.RULE_expression);
		try {
			this.state = 36;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 1, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 15;
				this.match(TraceOperatorGrammerParser.T__0);
				this.state = 16;
				this.expression();
				this.state = 17;
				this.match(TraceOperatorGrammerParser.T__1);
				this.state = 18;
				this.operator();
				this.state = 19;
				this.expression();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 21;
				this.match(TraceOperatorGrammerParser.T__0);
				this.state = 22;
				this.expression();
				this.state = 23;
				this.match(TraceOperatorGrammerParser.T__1);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 25;
				localctx._left = this.atom();
				this.state = 26;
				this.operator();
				this.state = 27;
				localctx._right = this.atom();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 29;
				localctx._left = this.atom();
				this.state = 30;
				this.operator();
				this.state = 31;
				this.match(TraceOperatorGrammerParser.T__0);
				this.state = 32;
				localctx._expr = this.expression();
				this.state = 33;
				this.match(TraceOperatorGrammerParser.T__1);
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 35;
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
		this.enterRule(localctx, 4, TraceOperatorGrammerParser.RULE_atom);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 38;
			this.match(TraceOperatorGrammerParser.IDENTIFIER);
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
		this.enterRule(localctx, 6, TraceOperatorGrammerParser.RULE_operator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 40;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 248) !== 0))) {
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

	public static readonly _serializedATN: number[] = [4,1,9,43,2,0,7,0,2,1,
	7,1,2,2,7,2,2,3,7,3,1,0,4,0,10,8,0,11,0,12,0,11,1,0,1,0,1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,
	37,8,1,1,2,1,2,1,3,1,3,1,3,0,0,4,0,2,4,6,0,1,1,0,3,7,43,0,9,1,0,0,0,2,36,
	1,0,0,0,4,38,1,0,0,0,6,40,1,0,0,0,8,10,3,2,1,0,9,8,1,0,0,0,10,11,1,0,0,
	0,11,9,1,0,0,0,11,12,1,0,0,0,12,13,1,0,0,0,13,14,5,0,0,1,14,1,1,0,0,0,15,
	16,5,1,0,0,16,17,3,2,1,0,17,18,5,2,0,0,18,19,3,6,3,0,19,20,3,2,1,0,20,37,
	1,0,0,0,21,22,5,1,0,0,22,23,3,2,1,0,23,24,5,2,0,0,24,37,1,0,0,0,25,26,3,
	4,2,0,26,27,3,6,3,0,27,28,3,4,2,0,28,37,1,0,0,0,29,30,3,4,2,0,30,31,3,6,
	3,0,31,32,5,1,0,0,32,33,3,2,1,0,33,34,5,2,0,0,34,37,1,0,0,0,35,37,3,4,2,
	0,36,15,1,0,0,0,36,21,1,0,0,0,36,25,1,0,0,0,36,29,1,0,0,0,36,35,1,0,0,0,
	37,3,1,0,0,0,38,39,5,8,0,0,39,5,1,0,0,0,40,41,7,0,0,0,41,7,1,0,0,0,2,11,
	36];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!TraceOperatorGrammerParser.__ATN) {
			TraceOperatorGrammerParser.__ATN = new ATNDeserializer().deserialize(TraceOperatorGrammerParser._serializedATN);
		}

		return TraceOperatorGrammerParser.__ATN;
	}


	static DecisionsToDFA = TraceOperatorGrammerParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class QueryContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammerParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(TraceOperatorGrammerParser.EOF, 0);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammerParser.RULE_query;
	}
	public enterRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.enterQuery) {
	 		listener.enterQuery(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.exitQuery) {
	 		listener.exitQuery(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammerVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	public _left!: AtomContext;
	public _right!: AtomContext;
	public _expr!: ExpressionContext;
	constructor(parser?: TraceOperatorGrammerParser, parent?: ParserRuleContext, invokingState?: number) {
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
	public atom_list(): AtomContext[] {
		return this.getTypedRuleContexts(AtomContext) as AtomContext[];
	}
	public atom(i: number): AtomContext {
		return this.getTypedRuleContext(AtomContext, i) as AtomContext;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammerParser.RULE_expression;
	}
	public enterRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.enterExpression) {
	 		listener.enterExpression(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.exitExpression) {
	 		listener.exitExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammerVisitor<Result>): Result {
		if (visitor.visitExpression) {
			return visitor.visitExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AtomContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammerParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(TraceOperatorGrammerParser.IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammerParser.RULE_atom;
	}
	public enterRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.enterAtom) {
	 		listener.enterAtom(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.exitAtom) {
	 		listener.exitAtom(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammerVisitor<Result>): Result {
		if (visitor.visitAtom) {
			return visitor.visitAtom(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class OperatorContext extends ParserRuleContext {
	constructor(parser?: TraceOperatorGrammerParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return TraceOperatorGrammerParser.RULE_operator;
	}
	public enterRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.enterOperator) {
	 		listener.enterOperator(this);
		}
	}
	public exitRule(listener: TraceOperatorGrammerListener): void {
	    if(listener.exitOperator) {
	 		listener.exitOperator(this);
		}
	}
	// @Override
	public accept<Result>(visitor: TraceOperatorGrammerVisitor<Result>): Result {
		if (visitor.visitOperator) {
			return visitor.visitOperator(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
