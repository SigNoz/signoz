// Generated from grammar/FilterQuery.g4 by ANTLR 4.13.2
// jshint ignore: start
import antlr4 from 'antlr4';
import FilterQueryListener from './FilterQueryListener.js';
const serializedATN = [4,1,33,219,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,
4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,
2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,1,0,1,0,1,0,1,0,5,0,39,8,0,10,0,
12,0,42,9,0,1,0,1,0,1,1,1,1,1,2,1,2,1,2,5,2,51,8,2,10,2,12,2,54,9,2,1,3,
1,3,1,3,1,3,5,3,60,8,3,10,3,12,3,63,9,3,1,4,3,4,66,8,4,1,4,1,4,1,5,1,5,1,
5,1,5,1,5,1,5,1,5,3,5,77,8,5,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,3,6,155,8,6,1,7,1,7,1,7,1,7,
1,7,1,7,1,7,1,7,1,7,1,7,3,7,167,8,7,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,1,8,
1,8,1,8,1,8,3,8,181,8,8,1,9,1,9,1,9,5,9,186,8,9,10,9,12,9,189,9,9,1,10,1,
10,1,11,1,11,1,11,1,11,1,11,1,12,1,12,1,12,5,12,201,8,12,10,12,12,12,204,
9,12,1,13,1,13,1,13,3,13,209,8,13,1,14,1,14,1,14,1,14,1,15,1,15,1,16,1,16,
1,16,0,0,17,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,0,6,1,0,23,24,
1,0,7,8,2,0,13,13,15,15,2,0,14,14,16,16,1,0,25,28,1,0,29,31,233,0,34,1,0,
0,0,2,45,1,0,0,0,4,47,1,0,0,0,6,55,1,0,0,0,8,65,1,0,0,0,10,76,1,0,0,0,12,
154,1,0,0,0,14,166,1,0,0,0,16,180,1,0,0,0,18,182,1,0,0,0,20,190,1,0,0,0,
22,192,1,0,0,0,24,197,1,0,0,0,26,208,1,0,0,0,28,210,1,0,0,0,30,214,1,0,0,
0,32,216,1,0,0,0,34,40,3,2,1,0,35,36,7,0,0,0,36,39,3,2,1,0,37,39,3,2,1,0,
38,35,1,0,0,0,38,37,1,0,0,0,39,42,1,0,0,0,40,38,1,0,0,0,40,41,1,0,0,0,41,
43,1,0,0,0,42,40,1,0,0,0,43,44,5,0,0,1,44,1,1,0,0,0,45,46,3,4,2,0,46,3,1,
0,0,0,47,52,3,6,3,0,48,49,5,24,0,0,49,51,3,6,3,0,50,48,1,0,0,0,51,54,1,0,
0,0,52,50,1,0,0,0,52,53,1,0,0,0,53,5,1,0,0,0,54,52,1,0,0,0,55,61,3,8,4,0,
56,57,5,23,0,0,57,60,3,8,4,0,58,60,3,8,4,0,59,56,1,0,0,0,59,58,1,0,0,0,60,
63,1,0,0,0,61,59,1,0,0,0,61,62,1,0,0,0,62,7,1,0,0,0,63,61,1,0,0,0,64,66,
5,22,0,0,65,64,1,0,0,0,65,66,1,0,0,0,66,67,1,0,0,0,67,68,3,10,5,0,68,9,1,
0,0,0,69,70,5,1,0,0,70,71,3,4,2,0,71,72,5,2,0,0,72,77,1,0,0,0,73,77,3,12,
6,0,74,77,3,22,11,0,75,77,3,20,10,0,76,69,1,0,0,0,76,73,1,0,0,0,76,74,1,
0,0,0,76,75,1,0,0,0,77,11,1,0,0,0,78,79,3,32,16,0,79,80,5,6,0,0,80,81,3,
30,15,0,81,155,1,0,0,0,82,83,3,32,16,0,83,84,7,1,0,0,84,85,3,30,15,0,85,
155,1,0,0,0,86,87,3,32,16,0,87,88,5,9,0,0,88,89,3,30,15,0,89,155,1,0,0,0,
90,91,3,32,16,0,91,92,5,10,0,0,92,93,3,30,15,0,93,155,1,0,0,0,94,95,3,32,
16,0,95,96,5,11,0,0,96,97,3,30,15,0,97,155,1,0,0,0,98,99,3,32,16,0,99,100,
5,12,0,0,100,101,3,30,15,0,101,155,1,0,0,0,102,103,3,32,16,0,103,104,7,2,
0,0,104,105,3,30,15,0,105,155,1,0,0,0,106,107,3,32,16,0,107,108,7,3,0,0,
108,109,3,30,15,0,109,155,1,0,0,0,110,111,3,32,16,0,111,112,5,17,0,0,112,
113,3,30,15,0,113,114,5,23,0,0,114,115,3,30,15,0,115,155,1,0,0,0,116,117,
3,32,16,0,117,118,5,22,0,0,118,119,5,17,0,0,119,120,3,30,15,0,120,121,5,
23,0,0,121,122,3,30,15,0,122,155,1,0,0,0,123,124,3,32,16,0,124,125,3,14,
7,0,125,155,1,0,0,0,126,127,3,32,16,0,127,128,3,16,8,0,128,155,1,0,0,0,129,
130,3,32,16,0,130,131,5,18,0,0,131,155,1,0,0,0,132,133,3,32,16,0,133,134,
5,22,0,0,134,135,5,18,0,0,135,155,1,0,0,0,136,137,3,32,16,0,137,138,5,19,
0,0,138,139,3,30,15,0,139,155,1,0,0,0,140,141,3,32,16,0,141,142,5,22,0,0,
142,143,5,19,0,0,143,144,3,30,15,0,144,155,1,0,0,0,145,146,3,32,16,0,146,
147,5,20,0,0,147,148,3,30,15,0,148,155,1,0,0,0,149,150,3,32,16,0,150,151,
5,22,0,0,151,152,5,20,0,0,152,153,3,30,15,0,153,155,1,0,0,0,154,78,1,0,0,
0,154,82,1,0,0,0,154,86,1,0,0,0,154,90,1,0,0,0,154,94,1,0,0,0,154,98,1,0,
0,0,154,102,1,0,0,0,154,106,1,0,0,0,154,110,1,0,0,0,154,116,1,0,0,0,154,
123,1,0,0,0,154,126,1,0,0,0,154,129,1,0,0,0,154,132,1,0,0,0,154,136,1,0,
0,0,154,140,1,0,0,0,154,145,1,0,0,0,154,149,1,0,0,0,155,13,1,0,0,0,156,157,
5,21,0,0,157,158,5,1,0,0,158,159,3,18,9,0,159,160,5,2,0,0,160,167,1,0,0,
0,161,162,5,21,0,0,162,163,5,3,0,0,163,164,3,18,9,0,164,165,5,4,0,0,165,
167,1,0,0,0,166,156,1,0,0,0,166,161,1,0,0,0,167,15,1,0,0,0,168,169,5,22,
0,0,169,170,5,21,0,0,170,171,5,1,0,0,171,172,3,18,9,0,172,173,5,2,0,0,173,
181,1,0,0,0,174,175,5,22,0,0,175,176,5,21,0,0,176,177,5,3,0,0,177,178,3,
18,9,0,178,179,5,4,0,0,179,181,1,0,0,0,180,168,1,0,0,0,180,174,1,0,0,0,181,
17,1,0,0,0,182,187,3,30,15,0,183,184,5,5,0,0,184,186,3,30,15,0,185,183,1,
0,0,0,186,189,1,0,0,0,187,185,1,0,0,0,187,188,1,0,0,0,188,19,1,0,0,0,189,
187,1,0,0,0,190,191,5,31,0,0,191,21,1,0,0,0,192,193,7,4,0,0,193,194,5,1,
0,0,194,195,3,24,12,0,195,196,5,2,0,0,196,23,1,0,0,0,197,202,3,26,13,0,198,
199,5,5,0,0,199,201,3,26,13,0,200,198,1,0,0,0,201,204,1,0,0,0,202,200,1,
0,0,0,202,203,1,0,0,0,203,25,1,0,0,0,204,202,1,0,0,0,205,209,3,32,16,0,206,
209,3,30,15,0,207,209,3,28,14,0,208,205,1,0,0,0,208,206,1,0,0,0,208,207,
1,0,0,0,209,27,1,0,0,0,210,211,5,3,0,0,211,212,3,18,9,0,212,213,5,4,0,0,
213,29,1,0,0,0,214,215,7,5,0,0,215,31,1,0,0,0,216,217,5,32,0,0,217,33,1,
0,0,0,13,38,40,52,59,61,65,76,154,166,180,187,202,208];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class FilterQueryParser extends antlr4.Parser {

    static grammarFileName = "FilterQuery.g4";
    static literalNames = [ null, "'('", "')'", "'['", "']'", "','", null, 
                            "'!='", "'<>'", "'<'", "'<='", "'>'", "'>='" ];
    static symbolicNames = [ null, "LPAREN", "RPAREN", "LBRACK", "RBRACK", 
                             "COMMA", "EQUALS", "NOT_EQUALS", "NEQ", "LT", 
                             "LE", "GT", "GE", "LIKE", "NOT_LIKE", "ILIKE", 
                             "NOT_ILIKE", "BETWEEN", "EXISTS", "REGEXP", 
                             "CONTAINS", "IN", "NOT", "AND", "OR", "HAS", 
                             "HASANY", "HASALL", "HASNONE", "BOOL", "NUMBER", 
                             "QUOTED_TEXT", "KEY", "WS" ];
    static ruleNames = [ "query", "expression", "orExpression", "andExpression", 
                         "unaryExpression", "primary", "comparison", "inClause", 
                         "notInClause", "valueList", "fullText", "functionCall", 
                         "functionParamList", "functionParam", "array", 
                         "value", "key" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = FilterQueryParser.ruleNames;
        this.literalNames = FilterQueryParser.literalNames;
        this.symbolicNames = FilterQueryParser.symbolicNames;
    }



	query() {
	    let localctx = new QueryContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, FilterQueryParser.RULE_query);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 34;
	        this.expression();
	        this.state = 40;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(((((_la - 1)) & ~0x1f) === 0 && ((1 << (_la - 1)) & 3487563777) !== 0)) {
	            this.state = 38;
	            this._errHandler.sync(this);
	            switch(this._input.LA(1)) {
	            case 23:
	            case 24:
	                this.state = 35;
	                _la = this._input.LA(1);
	                if(!(_la===23 || _la===24)) {
	                this._errHandler.recoverInline(this);
	                }
	                else {
	                	this._errHandler.reportMatch(this);
	                    this.consume();
	                }
	                this.state = 36;
	                this.expression();
	                break;
	            case 1:
	            case 22:
	            case 25:
	            case 26:
	            case 27:
	            case 28:
	            case 31:
	            case 32:
	                this.state = 37;
	                this.expression();
	                break;
	            default:
	                throw new antlr4.error.NoViableAltException(this);
	            }
	            this.state = 42;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	        this.state = 43;
	        this.match(FilterQueryParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	expression() {
	    let localctx = new ExpressionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, FilterQueryParser.RULE_expression);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 45;
	        this.orExpression();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	orExpression() {
	    let localctx = new OrExpressionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, FilterQueryParser.RULE_orExpression);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 47;
	        this.andExpression();
	        this.state = 52;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,2,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                this.state = 48;
	                this.match(FilterQueryParser.OR);
	                this.state = 49;
	                this.andExpression(); 
	            }
	            this.state = 54;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,2,this._ctx);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	andExpression() {
	    let localctx = new AndExpressionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, FilterQueryParser.RULE_andExpression);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 55;
	        this.unaryExpression();
	        this.state = 61;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,4,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                this.state = 59;
	                this._errHandler.sync(this);
	                switch(this._input.LA(1)) {
	                case 23:
	                    this.state = 56;
	                    this.match(FilterQueryParser.AND);
	                    this.state = 57;
	                    this.unaryExpression();
	                    break;
	                case 1:
	                case 22:
	                case 25:
	                case 26:
	                case 27:
	                case 28:
	                case 31:
	                case 32:
	                    this.state = 58;
	                    this.unaryExpression();
	                    break;
	                default:
	                    throw new antlr4.error.NoViableAltException(this);
	                } 
	            }
	            this.state = 63;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,4,this._ctx);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	unaryExpression() {
	    let localctx = new UnaryExpressionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, FilterQueryParser.RULE_unaryExpression);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 65;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 64;
	            this.match(FilterQueryParser.NOT);
	        }

	        this.state = 67;
	        this.primary();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	primary() {
	    let localctx = new PrimaryContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, FilterQueryParser.RULE_primary);
	    try {
	        this.state = 76;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 69;
	            this.match(FilterQueryParser.LPAREN);
	            this.state = 70;
	            this.orExpression();
	            this.state = 71;
	            this.match(FilterQueryParser.RPAREN);
	            break;
	        case 32:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 73;
	            this.comparison();
	            break;
	        case 25:
	        case 26:
	        case 27:
	        case 28:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 74;
	            this.functionCall();
	            break;
	        case 31:
	            this.enterOuterAlt(localctx, 4);
	            this.state = 75;
	            this.fullText();
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	comparison() {
	    let localctx = new ComparisonContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, FilterQueryParser.RULE_comparison);
	    var _la = 0;
	    try {
	        this.state = 154;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,7,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 78;
	            this.key();
	            this.state = 79;
	            this.match(FilterQueryParser.EQUALS);
	            this.state = 80;
	            this.value();
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
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
	            break;

	        case 3:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 86;
	            this.key();
	            this.state = 87;
	            this.match(FilterQueryParser.LT);
	            this.state = 88;
	            this.value();
	            break;

	        case 4:
	            this.enterOuterAlt(localctx, 4);
	            this.state = 90;
	            this.key();
	            this.state = 91;
	            this.match(FilterQueryParser.LE);
	            this.state = 92;
	            this.value();
	            break;

	        case 5:
	            this.enterOuterAlt(localctx, 5);
	            this.state = 94;
	            this.key();
	            this.state = 95;
	            this.match(FilterQueryParser.GT);
	            this.state = 96;
	            this.value();
	            break;

	        case 6:
	            this.enterOuterAlt(localctx, 6);
	            this.state = 98;
	            this.key();
	            this.state = 99;
	            this.match(FilterQueryParser.GE);
	            this.state = 100;
	            this.value();
	            break;

	        case 7:
	            this.enterOuterAlt(localctx, 7);
	            this.state = 102;
	            this.key();
	            this.state = 103;
	            _la = this._input.LA(1);
	            if(!(_la===13 || _la===15)) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 104;
	            this.value();
	            break;

	        case 8:
	            this.enterOuterAlt(localctx, 8);
	            this.state = 106;
	            this.key();
	            this.state = 107;
	            _la = this._input.LA(1);
	            if(!(_la===14 || _la===16)) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 108;
	            this.value();
	            break;

	        case 9:
	            this.enterOuterAlt(localctx, 9);
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
	            break;

	        case 10:
	            this.enterOuterAlt(localctx, 10);
	            this.state = 116;
	            this.key();
	            this.state = 117;
	            this.match(FilterQueryParser.NOT);
	            this.state = 118;
	            this.match(FilterQueryParser.BETWEEN);
	            this.state = 119;
	            this.value();
	            this.state = 120;
	            this.match(FilterQueryParser.AND);
	            this.state = 121;
	            this.value();
	            break;

	        case 11:
	            this.enterOuterAlt(localctx, 11);
	            this.state = 123;
	            this.key();
	            this.state = 124;
	            this.inClause();
	            break;

	        case 12:
	            this.enterOuterAlt(localctx, 12);
	            this.state = 126;
	            this.key();
	            this.state = 127;
	            this.notInClause();
	            break;

	        case 13:
	            this.enterOuterAlt(localctx, 13);
	            this.state = 129;
	            this.key();
	            this.state = 130;
	            this.match(FilterQueryParser.EXISTS);
	            break;

	        case 14:
	            this.enterOuterAlt(localctx, 14);
	            this.state = 132;
	            this.key();
	            this.state = 133;
	            this.match(FilterQueryParser.NOT);
	            this.state = 134;
	            this.match(FilterQueryParser.EXISTS);
	            break;

	        case 15:
	            this.enterOuterAlt(localctx, 15);
	            this.state = 136;
	            this.key();
	            this.state = 137;
	            this.match(FilterQueryParser.REGEXP);
	            this.state = 138;
	            this.value();
	            break;

	        case 16:
	            this.enterOuterAlt(localctx, 16);
	            this.state = 140;
	            this.key();
	            this.state = 141;
	            this.match(FilterQueryParser.NOT);
	            this.state = 142;
	            this.match(FilterQueryParser.REGEXP);
	            this.state = 143;
	            this.value();
	            break;

	        case 17:
	            this.enterOuterAlt(localctx, 17);
	            this.state = 145;
	            this.key();
	            this.state = 146;
	            this.match(FilterQueryParser.CONTAINS);
	            this.state = 147;
	            this.value();
	            break;

	        case 18:
	            this.enterOuterAlt(localctx, 18);
	            this.state = 149;
	            this.key();
	            this.state = 150;
	            this.match(FilterQueryParser.NOT);
	            this.state = 151;
	            this.match(FilterQueryParser.CONTAINS);
	            this.state = 152;
	            this.value();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	inClause() {
	    let localctx = new InClauseContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, FilterQueryParser.RULE_inClause);
	    try {
	        this.state = 166;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,8,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 156;
	            this.match(FilterQueryParser.IN);
	            this.state = 157;
	            this.match(FilterQueryParser.LPAREN);
	            this.state = 158;
	            this.valueList();
	            this.state = 159;
	            this.match(FilterQueryParser.RPAREN);
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 161;
	            this.match(FilterQueryParser.IN);
	            this.state = 162;
	            this.match(FilterQueryParser.LBRACK);
	            this.state = 163;
	            this.valueList();
	            this.state = 164;
	            this.match(FilterQueryParser.RBRACK);
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	notInClause() {
	    let localctx = new NotInClauseContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 16, FilterQueryParser.RULE_notInClause);
	    try {
	        this.state = 180;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,9,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 168;
	            this.match(FilterQueryParser.NOT);
	            this.state = 169;
	            this.match(FilterQueryParser.IN);
	            this.state = 170;
	            this.match(FilterQueryParser.LPAREN);
	            this.state = 171;
	            this.valueList();
	            this.state = 172;
	            this.match(FilterQueryParser.RPAREN);
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 174;
	            this.match(FilterQueryParser.NOT);
	            this.state = 175;
	            this.match(FilterQueryParser.IN);
	            this.state = 176;
	            this.match(FilterQueryParser.LBRACK);
	            this.state = 177;
	            this.valueList();
	            this.state = 178;
	            this.match(FilterQueryParser.RBRACK);
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	valueList() {
	    let localctx = new ValueListContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 18, FilterQueryParser.RULE_valueList);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 182;
	        this.value();
	        this.state = 187;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===5) {
	            this.state = 183;
	            this.match(FilterQueryParser.COMMA);
	            this.state = 184;
	            this.value();
	            this.state = 189;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	fullText() {
	    let localctx = new FullTextContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 20, FilterQueryParser.RULE_fullText);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 190;
	        this.match(FilterQueryParser.QUOTED_TEXT);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	functionCall() {
	    let localctx = new FunctionCallContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 22, FilterQueryParser.RULE_functionCall);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 192;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 503316480) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	        this.state = 193;
	        this.match(FilterQueryParser.LPAREN);
	        this.state = 194;
	        this.functionParamList();
	        this.state = 195;
	        this.match(FilterQueryParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	functionParamList() {
	    let localctx = new FunctionParamListContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 24, FilterQueryParser.RULE_functionParamList);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 197;
	        this.functionParam();
	        this.state = 202;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===5) {
	            this.state = 198;
	            this.match(FilterQueryParser.COMMA);
	            this.state = 199;
	            this.functionParam();
	            this.state = 204;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	functionParam() {
	    let localctx = new FunctionParamContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 26, FilterQueryParser.RULE_functionParam);
	    try {
	        this.state = 208;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 32:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 205;
	            this.key();
	            break;
	        case 29:
	        case 30:
	        case 31:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 206;
	            this.value();
	            break;
	        case 3:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 207;
	            this.array();
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	array() {
	    let localctx = new ArrayContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 28, FilterQueryParser.RULE_array);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 210;
	        this.match(FilterQueryParser.LBRACK);
	        this.state = 211;
	        this.valueList();
	        this.state = 212;
	        this.match(FilterQueryParser.RBRACK);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	value() {
	    let localctx = new ValueContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 30, FilterQueryParser.RULE_value);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 214;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 3758096384) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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



	key() {
	    let localctx = new KeyContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 32, FilterQueryParser.RULE_key);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 216;
	        this.match(FilterQueryParser.KEY);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
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


}

FilterQueryParser.EOF = antlr4.Token.EOF;
FilterQueryParser.LPAREN = 1;
FilterQueryParser.RPAREN = 2;
FilterQueryParser.LBRACK = 3;
FilterQueryParser.RBRACK = 4;
FilterQueryParser.COMMA = 5;
FilterQueryParser.EQUALS = 6;
FilterQueryParser.NOT_EQUALS = 7;
FilterQueryParser.NEQ = 8;
FilterQueryParser.LT = 9;
FilterQueryParser.LE = 10;
FilterQueryParser.GT = 11;
FilterQueryParser.GE = 12;
FilterQueryParser.LIKE = 13;
FilterQueryParser.NOT_LIKE = 14;
FilterQueryParser.ILIKE = 15;
FilterQueryParser.NOT_ILIKE = 16;
FilterQueryParser.BETWEEN = 17;
FilterQueryParser.EXISTS = 18;
FilterQueryParser.REGEXP = 19;
FilterQueryParser.CONTAINS = 20;
FilterQueryParser.IN = 21;
FilterQueryParser.NOT = 22;
FilterQueryParser.AND = 23;
FilterQueryParser.OR = 24;
FilterQueryParser.HAS = 25;
FilterQueryParser.HASANY = 26;
FilterQueryParser.HASALL = 27;
FilterQueryParser.HASNONE = 28;
FilterQueryParser.BOOL = 29;
FilterQueryParser.NUMBER = 30;
FilterQueryParser.QUOTED_TEXT = 31;
FilterQueryParser.KEY = 32;
FilterQueryParser.WS = 33;

FilterQueryParser.RULE_query = 0;
FilterQueryParser.RULE_expression = 1;
FilterQueryParser.RULE_orExpression = 2;
FilterQueryParser.RULE_andExpression = 3;
FilterQueryParser.RULE_unaryExpression = 4;
FilterQueryParser.RULE_primary = 5;
FilterQueryParser.RULE_comparison = 6;
FilterQueryParser.RULE_inClause = 7;
FilterQueryParser.RULE_notInClause = 8;
FilterQueryParser.RULE_valueList = 9;
FilterQueryParser.RULE_fullText = 10;
FilterQueryParser.RULE_functionCall = 11;
FilterQueryParser.RULE_functionParamList = 12;
FilterQueryParser.RULE_functionParam = 13;
FilterQueryParser.RULE_array = 14;
FilterQueryParser.RULE_value = 15;
FilterQueryParser.RULE_key = 16;

class QueryContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_query;
    }

	expression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ExpressionContext,i);
	    }
	};

	EOF() {
	    return this.getToken(FilterQueryParser.EOF, 0);
	};

	AND = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.AND);
	    } else {
	        return this.getToken(FilterQueryParser.AND, i);
	    }
	};


	OR = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.OR);
	    } else {
	        return this.getToken(FilterQueryParser.OR, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterQuery(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitQuery(this);
		}
	}


}



class ExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_expression;
    }

	orExpression() {
	    return this.getTypedRuleContext(OrExpressionContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitExpression(this);
		}
	}


}



class OrExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_orExpression;
    }

	andExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(AndExpressionContext);
	    } else {
	        return this.getTypedRuleContext(AndExpressionContext,i);
	    }
	};

	OR = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.OR);
	    } else {
	        return this.getToken(FilterQueryParser.OR, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterOrExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitOrExpression(this);
		}
	}


}



class AndExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_andExpression;
    }

	unaryExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(UnaryExpressionContext);
	    } else {
	        return this.getTypedRuleContext(UnaryExpressionContext,i);
	    }
	};

	AND = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.AND);
	    } else {
	        return this.getToken(FilterQueryParser.AND, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterAndExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitAndExpression(this);
		}
	}


}



class UnaryExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_unaryExpression;
    }

	primary() {
	    return this.getTypedRuleContext(PrimaryContext,0);
	};

	NOT() {
	    return this.getToken(FilterQueryParser.NOT, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterUnaryExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitUnaryExpression(this);
		}
	}


}



class PrimaryContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_primary;
    }

	LPAREN() {
	    return this.getToken(FilterQueryParser.LPAREN, 0);
	};

	orExpression() {
	    return this.getTypedRuleContext(OrExpressionContext,0);
	};

	RPAREN() {
	    return this.getToken(FilterQueryParser.RPAREN, 0);
	};

	comparison() {
	    return this.getTypedRuleContext(ComparisonContext,0);
	};

	functionCall() {
	    return this.getTypedRuleContext(FunctionCallContext,0);
	};

	fullText() {
	    return this.getTypedRuleContext(FullTextContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterPrimary(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitPrimary(this);
		}
	}


}



class ComparisonContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_comparison;
    }

	key() {
	    return this.getTypedRuleContext(KeyContext,0);
	};

	EQUALS() {
	    return this.getToken(FilterQueryParser.EQUALS, 0);
	};

	value = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ValueContext);
	    } else {
	        return this.getTypedRuleContext(ValueContext,i);
	    }
	};

	NOT_EQUALS() {
	    return this.getToken(FilterQueryParser.NOT_EQUALS, 0);
	};

	NEQ() {
	    return this.getToken(FilterQueryParser.NEQ, 0);
	};

	LT() {
	    return this.getToken(FilterQueryParser.LT, 0);
	};

	LE() {
	    return this.getToken(FilterQueryParser.LE, 0);
	};

	GT() {
	    return this.getToken(FilterQueryParser.GT, 0);
	};

	GE() {
	    return this.getToken(FilterQueryParser.GE, 0);
	};

	LIKE() {
	    return this.getToken(FilterQueryParser.LIKE, 0);
	};

	ILIKE() {
	    return this.getToken(FilterQueryParser.ILIKE, 0);
	};

	NOT_LIKE() {
	    return this.getToken(FilterQueryParser.NOT_LIKE, 0);
	};

	NOT_ILIKE() {
	    return this.getToken(FilterQueryParser.NOT_ILIKE, 0);
	};

	BETWEEN() {
	    return this.getToken(FilterQueryParser.BETWEEN, 0);
	};

	AND() {
	    return this.getToken(FilterQueryParser.AND, 0);
	};

	NOT() {
	    return this.getToken(FilterQueryParser.NOT, 0);
	};

	inClause() {
	    return this.getTypedRuleContext(InClauseContext,0);
	};

	notInClause() {
	    return this.getTypedRuleContext(NotInClauseContext,0);
	};

	EXISTS() {
	    return this.getToken(FilterQueryParser.EXISTS, 0);
	};

	REGEXP() {
	    return this.getToken(FilterQueryParser.REGEXP, 0);
	};

	CONTAINS() {
	    return this.getToken(FilterQueryParser.CONTAINS, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterComparison(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitComparison(this);
		}
	}


}



class InClauseContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_inClause;
    }

	IN() {
	    return this.getToken(FilterQueryParser.IN, 0);
	};

	LPAREN() {
	    return this.getToken(FilterQueryParser.LPAREN, 0);
	};

	valueList() {
	    return this.getTypedRuleContext(ValueListContext,0);
	};

	RPAREN() {
	    return this.getToken(FilterQueryParser.RPAREN, 0);
	};

	LBRACK() {
	    return this.getToken(FilterQueryParser.LBRACK, 0);
	};

	RBRACK() {
	    return this.getToken(FilterQueryParser.RBRACK, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterInClause(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitInClause(this);
		}
	}


}



class NotInClauseContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_notInClause;
    }

	NOT() {
	    return this.getToken(FilterQueryParser.NOT, 0);
	};

	IN() {
	    return this.getToken(FilterQueryParser.IN, 0);
	};

	LPAREN() {
	    return this.getToken(FilterQueryParser.LPAREN, 0);
	};

	valueList() {
	    return this.getTypedRuleContext(ValueListContext,0);
	};

	RPAREN() {
	    return this.getToken(FilterQueryParser.RPAREN, 0);
	};

	LBRACK() {
	    return this.getToken(FilterQueryParser.LBRACK, 0);
	};

	RBRACK() {
	    return this.getToken(FilterQueryParser.RBRACK, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterNotInClause(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitNotInClause(this);
		}
	}


}



class ValueListContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_valueList;
    }

	value = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ValueContext);
	    } else {
	        return this.getTypedRuleContext(ValueContext,i);
	    }
	};

	COMMA = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.COMMA);
	    } else {
	        return this.getToken(FilterQueryParser.COMMA, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterValueList(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitValueList(this);
		}
	}


}



class FullTextContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_fullText;
    }

	QUOTED_TEXT() {
	    return this.getToken(FilterQueryParser.QUOTED_TEXT, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterFullText(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitFullText(this);
		}
	}


}



class FunctionCallContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_functionCall;
    }

	LPAREN() {
	    return this.getToken(FilterQueryParser.LPAREN, 0);
	};

	functionParamList() {
	    return this.getTypedRuleContext(FunctionParamListContext,0);
	};

	RPAREN() {
	    return this.getToken(FilterQueryParser.RPAREN, 0);
	};

	HAS() {
	    return this.getToken(FilterQueryParser.HAS, 0);
	};

	HASANY() {
	    return this.getToken(FilterQueryParser.HASANY, 0);
	};

	HASALL() {
	    return this.getToken(FilterQueryParser.HASALL, 0);
	};

	HASNONE() {
	    return this.getToken(FilterQueryParser.HASNONE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterFunctionCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitFunctionCall(this);
		}
	}


}



class FunctionParamListContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_functionParamList;
    }

	functionParam = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(FunctionParamContext);
	    } else {
	        return this.getTypedRuleContext(FunctionParamContext,i);
	    }
	};

	COMMA = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(FilterQueryParser.COMMA);
	    } else {
	        return this.getToken(FilterQueryParser.COMMA, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterFunctionParamList(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitFunctionParamList(this);
		}
	}


}



class FunctionParamContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_functionParam;
    }

	key() {
	    return this.getTypedRuleContext(KeyContext,0);
	};

	value() {
	    return this.getTypedRuleContext(ValueContext,0);
	};

	array() {
	    return this.getTypedRuleContext(ArrayContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterFunctionParam(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitFunctionParam(this);
		}
	}


}



class ArrayContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_array;
    }

	LBRACK() {
	    return this.getToken(FilterQueryParser.LBRACK, 0);
	};

	valueList() {
	    return this.getTypedRuleContext(ValueListContext,0);
	};

	RBRACK() {
	    return this.getToken(FilterQueryParser.RBRACK, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterArray(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitArray(this);
		}
	}


}



class ValueContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_value;
    }

	QUOTED_TEXT() {
	    return this.getToken(FilterQueryParser.QUOTED_TEXT, 0);
	};

	NUMBER() {
	    return this.getToken(FilterQueryParser.NUMBER, 0);
	};

	BOOL() {
	    return this.getToken(FilterQueryParser.BOOL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterValue(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitValue(this);
		}
	}


}



class KeyContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = FilterQueryParser.RULE_key;
    }

	KEY() {
	    return this.getToken(FilterQueryParser.KEY, 0);
	};

	enterRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.enterKey(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof FilterQueryListener ) {
	        listener.exitKey(this);
		}
	}


}




FilterQueryParser.QueryContext = QueryContext; 
FilterQueryParser.ExpressionContext = ExpressionContext; 
FilterQueryParser.OrExpressionContext = OrExpressionContext; 
FilterQueryParser.AndExpressionContext = AndExpressionContext; 
FilterQueryParser.UnaryExpressionContext = UnaryExpressionContext; 
FilterQueryParser.PrimaryContext = PrimaryContext; 
FilterQueryParser.ComparisonContext = ComparisonContext; 
FilterQueryParser.InClauseContext = InClauseContext; 
FilterQueryParser.NotInClauseContext = NotInClauseContext; 
FilterQueryParser.ValueListContext = ValueListContext; 
FilterQueryParser.FullTextContext = FullTextContext; 
FilterQueryParser.FunctionCallContext = FunctionCallContext; 
FilterQueryParser.FunctionParamListContext = FunctionParamListContext; 
FilterQueryParser.FunctionParamContext = FunctionParamContext; 
FilterQueryParser.ArrayContext = ArrayContext; 
FilterQueryParser.ValueContext = ValueContext; 
FilterQueryParser.KeyContext = KeyContext; 
