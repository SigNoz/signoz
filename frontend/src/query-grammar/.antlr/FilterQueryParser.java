// Generated from /Users/abhikumar/Documents/Projects/signoz/frontend/src/query-grammar/FilterQuery.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue"})
public class FilterQueryParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		LPAREN=1, RPAREN=2, LBRACK=3, RBRACK=4, COMMA=5, EQUALS=6, NOT_EQUALS=7, 
		NEQ=8, LT=9, LE=10, GT=11, GE=12, LIKE=13, ILIKE=14, BETWEEN=15, EXISTS=16, 
		REGEXP=17, CONTAINS=18, IN=19, NOT=20, AND=21, OR=22, HAS=23, HASANY=24, 
		HASALL=25, BOOL=26, NUMBER=27, QUOTED_TEXT=28, KEY=29, WS=30, FREETEXT=31;
	public static final int
		RULE_query = 0, RULE_expression = 1, RULE_orExpression = 2, RULE_andExpression = 3, 
		RULE_unaryExpression = 4, RULE_primary = 5, RULE_comparison = 6, RULE_inClause = 7, 
		RULE_notInClause = 8, RULE_valueList = 9, RULE_fullText = 10, RULE_functionCall = 11, 
		RULE_functionParamList = 12, RULE_functionParam = 13, RULE_array = 14, 
		RULE_value = 15, RULE_key = 16;
	private static String[] makeRuleNames() {
		return new String[] {
			"query", "expression", "orExpression", "andExpression", "unaryExpression", 
			"primary", "comparison", "inClause", "notInClause", "valueList", "fullText", 
			"functionCall", "functionParamList", "functionParam", "array", "value", 
			"key"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, "'('", "')'", "'['", "']'", "','", null, "'!='", "'<>'", "'<'", 
			"'<='", "'>'", "'>='"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "EQUALS", "NOT_EQUALS", 
			"NEQ", "LT", "LE", "GT", "GE", "LIKE", "ILIKE", "BETWEEN", "EXISTS", 
			"REGEXP", "CONTAINS", "IN", "NOT", "AND", "OR", "HAS", "HASANY", "HASALL", 
			"BOOL", "NUMBER", "QUOTED_TEXT", "KEY", "WS", "FREETEXT"
		};
	}
	private static final String[] _SYMBOLIC_NAMES = makeSymbolicNames();
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}

	@Override
	public String getGrammarFileName() { return "FilterQuery.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public FilterQueryParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class QueryContext extends ParserRuleContext {
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode EOF() { return getToken(FilterQueryParser.EOF, 0); }
		public QueryContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_query; }
	}

	public final QueryContext query() throws RecognitionException {
		QueryContext _localctx = new QueryContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_query);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(34);
			expression();
			setState(35);
			match(EOF);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ExpressionContext extends ParserRuleContext {
		public OrExpressionContext orExpression() {
			return getRuleContext(OrExpressionContext.class,0);
		}
		public ExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression; }
	}

	public final ExpressionContext expression() throws RecognitionException {
		ExpressionContext _localctx = new ExpressionContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_expression);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(37);
			orExpression();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class OrExpressionContext extends ParserRuleContext {
		public List<AndExpressionContext> andExpression() {
			return getRuleContexts(AndExpressionContext.class);
		}
		public AndExpressionContext andExpression(int i) {
			return getRuleContext(AndExpressionContext.class,i);
		}
		public List<TerminalNode> OR() { return getTokens(FilterQueryParser.OR); }
		public TerminalNode OR(int i) {
			return getToken(FilterQueryParser.OR, i);
		}
		public OrExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orExpression; }
	}

	public final OrExpressionContext orExpression() throws RecognitionException {
		OrExpressionContext _localctx = new OrExpressionContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_orExpression);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(39);
			andExpression();
			setState(44);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==OR) {
				{
				{
				setState(40);
				match(OR);
				setState(41);
				andExpression();
				}
				}
				setState(46);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class AndExpressionContext extends ParserRuleContext {
		public List<UnaryExpressionContext> unaryExpression() {
			return getRuleContexts(UnaryExpressionContext.class);
		}
		public UnaryExpressionContext unaryExpression(int i) {
			return getRuleContext(UnaryExpressionContext.class,i);
		}
		public List<TerminalNode> AND() { return getTokens(FilterQueryParser.AND); }
		public TerminalNode AND(int i) {
			return getToken(FilterQueryParser.AND, i);
		}
		public AndExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_andExpression; }
	}

	public final AndExpressionContext andExpression() throws RecognitionException {
		AndExpressionContext _localctx = new AndExpressionContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_andExpression);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(47);
			unaryExpression();
			setState(53);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while ((((_la) & ~0x3f) == 0 && ((1L << _la) & 3215982594L) != 0)) {
				{
				setState(51);
				_errHandler.sync(this);
				switch (_input.LA(1)) {
				case AND:
					{
					setState(48);
					match(AND);
					setState(49);
					unaryExpression();
					}
					break;
				case LPAREN:
				case NOT:
				case HAS:
				case HASANY:
				case HASALL:
				case BOOL:
				case NUMBER:
				case QUOTED_TEXT:
				case KEY:
				case FREETEXT:
					{
					setState(50);
					unaryExpression();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				setState(55);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class UnaryExpressionContext extends ParserRuleContext {
		public PrimaryContext primary() {
			return getRuleContext(PrimaryContext.class,0);
		}
		public TerminalNode NOT() { return getToken(FilterQueryParser.NOT, 0); }
		public UnaryExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_unaryExpression; }
	}

	public final UnaryExpressionContext unaryExpression() throws RecognitionException {
		UnaryExpressionContext _localctx = new UnaryExpressionContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_unaryExpression);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(57);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==NOT) {
				{
				setState(56);
				match(NOT);
				}
			}

			setState(59);
			primary();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class PrimaryContext extends ParserRuleContext {
		public TerminalNode LPAREN() { return getToken(FilterQueryParser.LPAREN, 0); }
		public OrExpressionContext orExpression() {
			return getRuleContext(OrExpressionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(FilterQueryParser.RPAREN, 0); }
		public ComparisonContext comparison() {
			return getRuleContext(ComparisonContext.class,0);
		}
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public FullTextContext fullText() {
			return getRuleContext(FullTextContext.class,0);
		}
		public KeyContext key() {
			return getRuleContext(KeyContext.class,0);
		}
		public ValueContext value() {
			return getRuleContext(ValueContext.class,0);
		}
		public PrimaryContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_primary; }
	}

	public final PrimaryContext primary() throws RecognitionException {
		PrimaryContext _localctx = new PrimaryContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_primary);
		try {
			setState(70);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,4,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(61);
				match(LPAREN);
				setState(62);
				orExpression();
				setState(63);
				match(RPAREN);
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(65);
				comparison();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(66);
				functionCall();
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(67);
				fullText();
				}
				break;
			case 5:
				enterOuterAlt(_localctx, 5);
				{
				setState(68);
				key();
				}
				break;
			case 6:
				enterOuterAlt(_localctx, 6);
				{
				setState(69);
				value();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ComparisonContext extends ParserRuleContext {
		public KeyContext key() {
			return getRuleContext(KeyContext.class,0);
		}
		public TerminalNode EQUALS() { return getToken(FilterQueryParser.EQUALS, 0); }
		public List<ValueContext> value() {
			return getRuleContexts(ValueContext.class);
		}
		public ValueContext value(int i) {
			return getRuleContext(ValueContext.class,i);
		}
		public TerminalNode NOT_EQUALS() { return getToken(FilterQueryParser.NOT_EQUALS, 0); }
		public TerminalNode NEQ() { return getToken(FilterQueryParser.NEQ, 0); }
		public TerminalNode LT() { return getToken(FilterQueryParser.LT, 0); }
		public TerminalNode LE() { return getToken(FilterQueryParser.LE, 0); }
		public TerminalNode GT() { return getToken(FilterQueryParser.GT, 0); }
		public TerminalNode GE() { return getToken(FilterQueryParser.GE, 0); }
		public TerminalNode LIKE() { return getToken(FilterQueryParser.LIKE, 0); }
		public TerminalNode ILIKE() { return getToken(FilterQueryParser.ILIKE, 0); }
		public TerminalNode NOT() { return getToken(FilterQueryParser.NOT, 0); }
		public TerminalNode BETWEEN() { return getToken(FilterQueryParser.BETWEEN, 0); }
		public TerminalNode AND() { return getToken(FilterQueryParser.AND, 0); }
		public InClauseContext inClause() {
			return getRuleContext(InClauseContext.class,0);
		}
		public NotInClauseContext notInClause() {
			return getRuleContext(NotInClauseContext.class,0);
		}
		public TerminalNode EXISTS() { return getToken(FilterQueryParser.EXISTS, 0); }
		public TerminalNode REGEXP() { return getToken(FilterQueryParser.REGEXP, 0); }
		public TerminalNode CONTAINS() { return getToken(FilterQueryParser.CONTAINS, 0); }
		public ComparisonContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_comparison; }
	}

	public final ComparisonContext comparison() throws RecognitionException {
		ComparisonContext _localctx = new ComparisonContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_comparison);
		int _la;
		try {
			setState(149);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,5,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(72);
				key();
				setState(73);
				match(EQUALS);
				setState(74);
				value();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(76);
				key();
				setState(77);
				_la = _input.LA(1);
				if ( !(_la==NOT_EQUALS || _la==NEQ) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(78);
				value();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(80);
				key();
				setState(81);
				match(LT);
				setState(82);
				value();
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(84);
				key();
				setState(85);
				match(LE);
				setState(86);
				value();
				}
				break;
			case 5:
				enterOuterAlt(_localctx, 5);
				{
				setState(88);
				key();
				setState(89);
				match(GT);
				setState(90);
				value();
				}
				break;
			case 6:
				enterOuterAlt(_localctx, 6);
				{
				setState(92);
				key();
				setState(93);
				match(GE);
				setState(94);
				value();
				}
				break;
			case 7:
				enterOuterAlt(_localctx, 7);
				{
				setState(96);
				key();
				setState(97);
				_la = _input.LA(1);
				if ( !(_la==LIKE || _la==ILIKE) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(98);
				value();
				}
				break;
			case 8:
				enterOuterAlt(_localctx, 8);
				{
				setState(100);
				key();
				setState(101);
				match(NOT);
				setState(102);
				_la = _input.LA(1);
				if ( !(_la==LIKE || _la==ILIKE) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(103);
				value();
				}
				break;
			case 9:
				enterOuterAlt(_localctx, 9);
				{
				setState(105);
				key();
				setState(106);
				match(BETWEEN);
				setState(107);
				value();
				setState(108);
				match(AND);
				setState(109);
				value();
				}
				break;
			case 10:
				enterOuterAlt(_localctx, 10);
				{
				setState(111);
				key();
				setState(112);
				match(NOT);
				setState(113);
				match(BETWEEN);
				setState(114);
				value();
				setState(115);
				match(AND);
				setState(116);
				value();
				}
				break;
			case 11:
				enterOuterAlt(_localctx, 11);
				{
				setState(118);
				key();
				setState(119);
				inClause();
				}
				break;
			case 12:
				enterOuterAlt(_localctx, 12);
				{
				setState(121);
				key();
				setState(122);
				notInClause();
				}
				break;
			case 13:
				enterOuterAlt(_localctx, 13);
				{
				setState(124);
				key();
				setState(125);
				match(EXISTS);
				}
				break;
			case 14:
				enterOuterAlt(_localctx, 14);
				{
				setState(127);
				key();
				setState(128);
				match(NOT);
				setState(129);
				match(EXISTS);
				}
				break;
			case 15:
				enterOuterAlt(_localctx, 15);
				{
				setState(131);
				key();
				setState(132);
				match(REGEXP);
				setState(133);
				value();
				}
				break;
			case 16:
				enterOuterAlt(_localctx, 16);
				{
				setState(135);
				key();
				setState(136);
				match(NOT);
				setState(137);
				match(REGEXP);
				setState(138);
				value();
				}
				break;
			case 17:
				enterOuterAlt(_localctx, 17);
				{
				setState(140);
				key();
				setState(141);
				match(CONTAINS);
				setState(142);
				value();
				}
				break;
			case 18:
				enterOuterAlt(_localctx, 18);
				{
				setState(144);
				key();
				setState(145);
				match(NOT);
				setState(146);
				match(CONTAINS);
				setState(147);
				value();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class InClauseContext extends ParserRuleContext {
		public TerminalNode IN() { return getToken(FilterQueryParser.IN, 0); }
		public TerminalNode LPAREN() { return getToken(FilterQueryParser.LPAREN, 0); }
		public ValueListContext valueList() {
			return getRuleContext(ValueListContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(FilterQueryParser.RPAREN, 0); }
		public TerminalNode LBRACK() { return getToken(FilterQueryParser.LBRACK, 0); }
		public TerminalNode RBRACK() { return getToken(FilterQueryParser.RBRACK, 0); }
		public ValueContext value() {
			return getRuleContext(ValueContext.class,0);
		}
		public InClauseContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_inClause; }
	}

	public final InClauseContext inClause() throws RecognitionException {
		InClauseContext _localctx = new InClauseContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_inClause);
		try {
			setState(163);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,6,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(151);
				match(IN);
				setState(152);
				match(LPAREN);
				setState(153);
				valueList();
				setState(154);
				match(RPAREN);
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(156);
				match(IN);
				setState(157);
				match(LBRACK);
				setState(158);
				valueList();
				setState(159);
				match(RBRACK);
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(161);
				match(IN);
				setState(162);
				value();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class NotInClauseContext extends ParserRuleContext {
		public TerminalNode NOT() { return getToken(FilterQueryParser.NOT, 0); }
		public TerminalNode IN() { return getToken(FilterQueryParser.IN, 0); }
		public TerminalNode LPAREN() { return getToken(FilterQueryParser.LPAREN, 0); }
		public ValueListContext valueList() {
			return getRuleContext(ValueListContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(FilterQueryParser.RPAREN, 0); }
		public TerminalNode LBRACK() { return getToken(FilterQueryParser.LBRACK, 0); }
		public TerminalNode RBRACK() { return getToken(FilterQueryParser.RBRACK, 0); }
		public ValueContext value() {
			return getRuleContext(ValueContext.class,0);
		}
		public NotInClauseContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_notInClause; }
	}

	public final NotInClauseContext notInClause() throws RecognitionException {
		NotInClauseContext _localctx = new NotInClauseContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_notInClause);
		try {
			setState(180);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,7,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(165);
				match(NOT);
				setState(166);
				match(IN);
				setState(167);
				match(LPAREN);
				setState(168);
				valueList();
				setState(169);
				match(RPAREN);
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(171);
				match(NOT);
				setState(172);
				match(IN);
				setState(173);
				match(LBRACK);
				setState(174);
				valueList();
				setState(175);
				match(RBRACK);
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(177);
				match(NOT);
				setState(178);
				match(IN);
				setState(179);
				value();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ValueListContext extends ParserRuleContext {
		public List<ValueContext> value() {
			return getRuleContexts(ValueContext.class);
		}
		public ValueContext value(int i) {
			return getRuleContext(ValueContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(FilterQueryParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(FilterQueryParser.COMMA, i);
		}
		public ValueListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_valueList; }
	}

	public final ValueListContext valueList() throws RecognitionException {
		ValueListContext _localctx = new ValueListContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_valueList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(182);
			value();
			setState(187);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(183);
				match(COMMA);
				setState(184);
				value();
				}
				}
				setState(189);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FullTextContext extends ParserRuleContext {
		public TerminalNode QUOTED_TEXT() { return getToken(FilterQueryParser.QUOTED_TEXT, 0); }
		public TerminalNode FREETEXT() { return getToken(FilterQueryParser.FREETEXT, 0); }
		public FullTextContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_fullText; }
	}

	public final FullTextContext fullText() throws RecognitionException {
		FullTextContext _localctx = new FullTextContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_fullText);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(190);
			_la = _input.LA(1);
			if ( !(_la==QUOTED_TEXT || _la==FREETEXT) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FunctionCallContext extends ParserRuleContext {
		public TerminalNode LPAREN() { return getToken(FilterQueryParser.LPAREN, 0); }
		public FunctionParamListContext functionParamList() {
			return getRuleContext(FunctionParamListContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(FilterQueryParser.RPAREN, 0); }
		public TerminalNode HAS() { return getToken(FilterQueryParser.HAS, 0); }
		public TerminalNode HASANY() { return getToken(FilterQueryParser.HASANY, 0); }
		public TerminalNode HASALL() { return getToken(FilterQueryParser.HASALL, 0); }
		public FunctionCallContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionCall; }
	}

	public final FunctionCallContext functionCall() throws RecognitionException {
		FunctionCallContext _localctx = new FunctionCallContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_functionCall);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(192);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 58720256L) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			setState(193);
			match(LPAREN);
			setState(194);
			functionParamList();
			setState(195);
			match(RPAREN);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FunctionParamListContext extends ParserRuleContext {
		public List<FunctionParamContext> functionParam() {
			return getRuleContexts(FunctionParamContext.class);
		}
		public FunctionParamContext functionParam(int i) {
			return getRuleContext(FunctionParamContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(FilterQueryParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(FilterQueryParser.COMMA, i);
		}
		public FunctionParamListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionParamList; }
	}

	public final FunctionParamListContext functionParamList() throws RecognitionException {
		FunctionParamListContext _localctx = new FunctionParamListContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_functionParamList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(197);
			functionParam();
			setState(202);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(198);
				match(COMMA);
				setState(199);
				functionParam();
				}
				}
				setState(204);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FunctionParamContext extends ParserRuleContext {
		public KeyContext key() {
			return getRuleContext(KeyContext.class,0);
		}
		public ValueContext value() {
			return getRuleContext(ValueContext.class,0);
		}
		public ArrayContext array() {
			return getRuleContext(ArrayContext.class,0);
		}
		public FunctionParamContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionParam; }
	}

	public final FunctionParamContext functionParam() throws RecognitionException {
		FunctionParamContext _localctx = new FunctionParamContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_functionParam);
		try {
			setState(208);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,10,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(205);
				key();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(206);
				value();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(207);
				array();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ArrayContext extends ParserRuleContext {
		public TerminalNode LBRACK() { return getToken(FilterQueryParser.LBRACK, 0); }
		public ValueListContext valueList() {
			return getRuleContext(ValueListContext.class,0);
		}
		public TerminalNode RBRACK() { return getToken(FilterQueryParser.RBRACK, 0); }
		public ArrayContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_array; }
	}

	public final ArrayContext array() throws RecognitionException {
		ArrayContext _localctx = new ArrayContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_array);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(210);
			match(LBRACK);
			setState(211);
			valueList();
			setState(212);
			match(RBRACK);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ValueContext extends ParserRuleContext {
		public TerminalNode QUOTED_TEXT() { return getToken(FilterQueryParser.QUOTED_TEXT, 0); }
		public TerminalNode NUMBER() { return getToken(FilterQueryParser.NUMBER, 0); }
		public TerminalNode BOOL() { return getToken(FilterQueryParser.BOOL, 0); }
		public TerminalNode KEY() { return getToken(FilterQueryParser.KEY, 0); }
		public ValueContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_value; }
	}

	public final ValueContext value() throws RecognitionException {
		ValueContext _localctx = new ValueContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_value);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(214);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 1006632960L) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class KeyContext extends ParserRuleContext {
		public TerminalNode KEY() { return getToken(FilterQueryParser.KEY, 0); }
		public KeyContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_key; }
	}

	public final KeyContext key() throws RecognitionException {
		KeyContext _localctx = new KeyContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_key);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(216);
			match(KEY);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static final String _serializedATN =
		"\u0004\u0001\u001f\u00db\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001"+
		"\u0002\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004"+
		"\u0002\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007\u0007\u0007"+
		"\u0002\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b\u0007\u000b"+
		"\u0002\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002\u000f\u0007"+
		"\u000f\u0002\u0010\u0007\u0010\u0001\u0000\u0001\u0000\u0001\u0000\u0001"+
		"\u0001\u0001\u0001\u0001\u0002\u0001\u0002\u0001\u0002\u0005\u0002+\b"+
		"\u0002\n\u0002\f\u0002.\t\u0002\u0001\u0003\u0001\u0003\u0001\u0003\u0001"+
		"\u0003\u0005\u00034\b\u0003\n\u0003\f\u00037\t\u0003\u0001\u0004\u0003"+
		"\u0004:\b\u0004\u0001\u0004\u0001\u0004\u0001\u0005\u0001\u0005\u0001"+
		"\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0001"+
		"\u0005\u0003\u0005G\b\u0005\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0003\u0006\u0096\b\u0006\u0001\u0007\u0001\u0007\u0001"+
		"\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0001"+
		"\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0003\u0007\u00a4\b\u0007\u0001"+
		"\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001"+
		"\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0003\b\u00b5\b\b\u0001\t\u0001"+
		"\t\u0001\t\u0005\t\u00ba\b\t\n\t\f\t\u00bd\t\t\u0001\n\u0001\n\u0001\u000b"+
		"\u0001\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001\f\u0001\f\u0001"+
		"\f\u0005\f\u00c9\b\f\n\f\f\f\u00cc\t\f\u0001\r\u0001\r\u0001\r\u0003\r"+
		"\u00d1\b\r\u0001\u000e\u0001\u000e\u0001\u000e\u0001\u000e\u0001\u000f"+
		"\u0001\u000f\u0001\u0010\u0001\u0010\u0001\u0010\u0000\u0000\u0011\u0000"+
		"\u0002\u0004\u0006\b\n\f\u000e\u0010\u0012\u0014\u0016\u0018\u001a\u001c"+
		"\u001e \u0000\u0005\u0001\u0000\u0007\b\u0001\u0000\r\u000e\u0002\u0000"+
		"\u001c\u001c\u001f\u001f\u0001\u0000\u0017\u0019\u0001\u0000\u001a\u001d"+
		"\u00eb\u0000\"\u0001\u0000\u0000\u0000\u0002%\u0001\u0000\u0000\u0000"+
		"\u0004\'\u0001\u0000\u0000\u0000\u0006/\u0001\u0000\u0000\u0000\b9\u0001"+
		"\u0000\u0000\u0000\nF\u0001\u0000\u0000\u0000\f\u0095\u0001\u0000\u0000"+
		"\u0000\u000e\u00a3\u0001\u0000\u0000\u0000\u0010\u00b4\u0001\u0000\u0000"+
		"\u0000\u0012\u00b6\u0001\u0000\u0000\u0000\u0014\u00be\u0001\u0000\u0000"+
		"\u0000\u0016\u00c0\u0001\u0000\u0000\u0000\u0018\u00c5\u0001\u0000\u0000"+
		"\u0000\u001a\u00d0\u0001\u0000\u0000\u0000\u001c\u00d2\u0001\u0000\u0000"+
		"\u0000\u001e\u00d6\u0001\u0000\u0000\u0000 \u00d8\u0001\u0000\u0000\u0000"+
		"\"#\u0003\u0002\u0001\u0000#$\u0005\u0000\u0000\u0001$\u0001\u0001\u0000"+
		"\u0000\u0000%&\u0003\u0004\u0002\u0000&\u0003\u0001\u0000\u0000\u0000"+
		"\',\u0003\u0006\u0003\u0000()\u0005\u0016\u0000\u0000)+\u0003\u0006\u0003"+
		"\u0000*(\u0001\u0000\u0000\u0000+.\u0001\u0000\u0000\u0000,*\u0001\u0000"+
		"\u0000\u0000,-\u0001\u0000\u0000\u0000-\u0005\u0001\u0000\u0000\u0000"+
		".,\u0001\u0000\u0000\u0000/5\u0003\b\u0004\u000001\u0005\u0015\u0000\u0000"+
		"14\u0003\b\u0004\u000024\u0003\b\u0004\u000030\u0001\u0000\u0000\u0000"+
		"32\u0001\u0000\u0000\u000047\u0001\u0000\u0000\u000053\u0001\u0000\u0000"+
		"\u000056\u0001\u0000\u0000\u00006\u0007\u0001\u0000\u0000\u000075\u0001"+
		"\u0000\u0000\u00008:\u0005\u0014\u0000\u000098\u0001\u0000\u0000\u0000"+
		"9:\u0001\u0000\u0000\u0000:;\u0001\u0000\u0000\u0000;<\u0003\n\u0005\u0000"+
		"<\t\u0001\u0000\u0000\u0000=>\u0005\u0001\u0000\u0000>?\u0003\u0004\u0002"+
		"\u0000?@\u0005\u0002\u0000\u0000@G\u0001\u0000\u0000\u0000AG\u0003\f\u0006"+
		"\u0000BG\u0003\u0016\u000b\u0000CG\u0003\u0014\n\u0000DG\u0003 \u0010"+
		"\u0000EG\u0003\u001e\u000f\u0000F=\u0001\u0000\u0000\u0000FA\u0001\u0000"+
		"\u0000\u0000FB\u0001\u0000\u0000\u0000FC\u0001\u0000\u0000\u0000FD\u0001"+
		"\u0000\u0000\u0000FE\u0001\u0000\u0000\u0000G\u000b\u0001\u0000\u0000"+
		"\u0000HI\u0003 \u0010\u0000IJ\u0005\u0006\u0000\u0000JK\u0003\u001e\u000f"+
		"\u0000K\u0096\u0001\u0000\u0000\u0000LM\u0003 \u0010\u0000MN\u0007\u0000"+
		"\u0000\u0000NO\u0003\u001e\u000f\u0000O\u0096\u0001\u0000\u0000\u0000"+
		"PQ\u0003 \u0010\u0000QR\u0005\t\u0000\u0000RS\u0003\u001e\u000f\u0000"+
		"S\u0096\u0001\u0000\u0000\u0000TU\u0003 \u0010\u0000UV\u0005\n\u0000\u0000"+
		"VW\u0003\u001e\u000f\u0000W\u0096\u0001\u0000\u0000\u0000XY\u0003 \u0010"+
		"\u0000YZ\u0005\u000b\u0000\u0000Z[\u0003\u001e\u000f\u0000[\u0096\u0001"+
		"\u0000\u0000\u0000\\]\u0003 \u0010\u0000]^\u0005\f\u0000\u0000^_\u0003"+
		"\u001e\u000f\u0000_\u0096\u0001\u0000\u0000\u0000`a\u0003 \u0010\u0000"+
		"ab\u0007\u0001\u0000\u0000bc\u0003\u001e\u000f\u0000c\u0096\u0001\u0000"+
		"\u0000\u0000de\u0003 \u0010\u0000ef\u0005\u0014\u0000\u0000fg\u0007\u0001"+
		"\u0000\u0000gh\u0003\u001e\u000f\u0000h\u0096\u0001\u0000\u0000\u0000"+
		"ij\u0003 \u0010\u0000jk\u0005\u000f\u0000\u0000kl\u0003\u001e\u000f\u0000"+
		"lm\u0005\u0015\u0000\u0000mn\u0003\u001e\u000f\u0000n\u0096\u0001\u0000"+
		"\u0000\u0000op\u0003 \u0010\u0000pq\u0005\u0014\u0000\u0000qr\u0005\u000f"+
		"\u0000\u0000rs\u0003\u001e\u000f\u0000st\u0005\u0015\u0000\u0000tu\u0003"+
		"\u001e\u000f\u0000u\u0096\u0001\u0000\u0000\u0000vw\u0003 \u0010\u0000"+
		"wx\u0003\u000e\u0007\u0000x\u0096\u0001\u0000\u0000\u0000yz\u0003 \u0010"+
		"\u0000z{\u0003\u0010\b\u0000{\u0096\u0001\u0000\u0000\u0000|}\u0003 \u0010"+
		"\u0000}~\u0005\u0010\u0000\u0000~\u0096\u0001\u0000\u0000\u0000\u007f"+
		"\u0080\u0003 \u0010\u0000\u0080\u0081\u0005\u0014\u0000\u0000\u0081\u0082"+
		"\u0005\u0010\u0000\u0000\u0082\u0096\u0001\u0000\u0000\u0000\u0083\u0084"+
		"\u0003 \u0010\u0000\u0084\u0085\u0005\u0011\u0000\u0000\u0085\u0086\u0003"+
		"\u001e\u000f\u0000\u0086\u0096\u0001\u0000\u0000\u0000\u0087\u0088\u0003"+
		" \u0010\u0000\u0088\u0089\u0005\u0014\u0000\u0000\u0089\u008a\u0005\u0011"+
		"\u0000\u0000\u008a\u008b\u0003\u001e\u000f\u0000\u008b\u0096\u0001\u0000"+
		"\u0000\u0000\u008c\u008d\u0003 \u0010\u0000\u008d\u008e\u0005\u0012\u0000"+
		"\u0000\u008e\u008f\u0003\u001e\u000f\u0000\u008f\u0096\u0001\u0000\u0000"+
		"\u0000\u0090\u0091\u0003 \u0010\u0000\u0091\u0092\u0005\u0014\u0000\u0000"+
		"\u0092\u0093\u0005\u0012\u0000\u0000\u0093\u0094\u0003\u001e\u000f\u0000"+
		"\u0094\u0096\u0001\u0000\u0000\u0000\u0095H\u0001\u0000\u0000\u0000\u0095"+
		"L\u0001\u0000\u0000\u0000\u0095P\u0001\u0000\u0000\u0000\u0095T\u0001"+
		"\u0000\u0000\u0000\u0095X\u0001\u0000\u0000\u0000\u0095\\\u0001\u0000"+
		"\u0000\u0000\u0095`\u0001\u0000\u0000\u0000\u0095d\u0001\u0000\u0000\u0000"+
		"\u0095i\u0001\u0000\u0000\u0000\u0095o\u0001\u0000\u0000\u0000\u0095v"+
		"\u0001\u0000\u0000\u0000\u0095y\u0001\u0000\u0000\u0000\u0095|\u0001\u0000"+
		"\u0000\u0000\u0095\u007f\u0001\u0000\u0000\u0000\u0095\u0083\u0001\u0000"+
		"\u0000\u0000\u0095\u0087\u0001\u0000\u0000\u0000\u0095\u008c\u0001\u0000"+
		"\u0000\u0000\u0095\u0090\u0001\u0000\u0000\u0000\u0096\r\u0001\u0000\u0000"+
		"\u0000\u0097\u0098\u0005\u0013\u0000\u0000\u0098\u0099\u0005\u0001\u0000"+
		"\u0000\u0099\u009a\u0003\u0012\t\u0000\u009a\u009b\u0005\u0002\u0000\u0000"+
		"\u009b\u00a4\u0001\u0000\u0000\u0000\u009c\u009d\u0005\u0013\u0000\u0000"+
		"\u009d\u009e\u0005\u0003\u0000\u0000\u009e\u009f\u0003\u0012\t\u0000\u009f"+
		"\u00a0\u0005\u0004\u0000\u0000\u00a0\u00a4\u0001\u0000\u0000\u0000\u00a1"+
		"\u00a2\u0005\u0013\u0000\u0000\u00a2\u00a4\u0003\u001e\u000f\u0000\u00a3"+
		"\u0097\u0001\u0000\u0000\u0000\u00a3\u009c\u0001\u0000\u0000\u0000\u00a3"+
		"\u00a1\u0001\u0000\u0000\u0000\u00a4\u000f\u0001\u0000\u0000\u0000\u00a5"+
		"\u00a6\u0005\u0014\u0000\u0000\u00a6\u00a7\u0005\u0013\u0000\u0000\u00a7"+
		"\u00a8\u0005\u0001\u0000\u0000\u00a8\u00a9\u0003\u0012\t\u0000\u00a9\u00aa"+
		"\u0005\u0002\u0000\u0000\u00aa\u00b5\u0001\u0000\u0000\u0000\u00ab\u00ac"+
		"\u0005\u0014\u0000\u0000\u00ac\u00ad\u0005\u0013\u0000\u0000\u00ad\u00ae"+
		"\u0005\u0003\u0000\u0000\u00ae\u00af\u0003\u0012\t\u0000\u00af\u00b0\u0005"+
		"\u0004\u0000\u0000\u00b0\u00b5\u0001\u0000\u0000\u0000\u00b1\u00b2\u0005"+
		"\u0014\u0000\u0000\u00b2\u00b3\u0005\u0013\u0000\u0000\u00b3\u00b5\u0003"+
		"\u001e\u000f\u0000\u00b4\u00a5\u0001\u0000\u0000\u0000\u00b4\u00ab\u0001"+
		"\u0000\u0000\u0000\u00b4\u00b1\u0001\u0000\u0000\u0000\u00b5\u0011\u0001"+
		"\u0000\u0000\u0000\u00b6\u00bb\u0003\u001e\u000f\u0000\u00b7\u00b8\u0005"+
		"\u0005\u0000\u0000\u00b8\u00ba\u0003\u001e\u000f\u0000\u00b9\u00b7\u0001"+
		"\u0000\u0000\u0000\u00ba\u00bd\u0001\u0000\u0000\u0000\u00bb\u00b9\u0001"+
		"\u0000\u0000\u0000\u00bb\u00bc\u0001\u0000\u0000\u0000\u00bc\u0013\u0001"+
		"\u0000\u0000\u0000\u00bd\u00bb\u0001\u0000\u0000\u0000\u00be\u00bf\u0007"+
		"\u0002\u0000\u0000\u00bf\u0015\u0001\u0000\u0000\u0000\u00c0\u00c1\u0007"+
		"\u0003\u0000\u0000\u00c1\u00c2\u0005\u0001\u0000\u0000\u00c2\u00c3\u0003"+
		"\u0018\f\u0000\u00c3\u00c4\u0005\u0002\u0000\u0000\u00c4\u0017\u0001\u0000"+
		"\u0000\u0000\u00c5\u00ca\u0003\u001a\r\u0000\u00c6\u00c7\u0005\u0005\u0000"+
		"\u0000\u00c7\u00c9\u0003\u001a\r\u0000\u00c8\u00c6\u0001\u0000\u0000\u0000"+
		"\u00c9\u00cc\u0001\u0000\u0000\u0000\u00ca\u00c8\u0001\u0000\u0000\u0000"+
		"\u00ca\u00cb\u0001\u0000\u0000\u0000\u00cb\u0019\u0001\u0000\u0000\u0000"+
		"\u00cc\u00ca\u0001\u0000\u0000\u0000\u00cd\u00d1\u0003 \u0010\u0000\u00ce"+
		"\u00d1\u0003\u001e\u000f\u0000\u00cf\u00d1\u0003\u001c\u000e\u0000\u00d0"+
		"\u00cd\u0001\u0000\u0000\u0000\u00d0\u00ce\u0001\u0000\u0000\u0000\u00d0"+
		"\u00cf\u0001\u0000\u0000\u0000\u00d1\u001b\u0001\u0000\u0000\u0000\u00d2"+
		"\u00d3\u0005\u0003\u0000\u0000\u00d3\u00d4\u0003\u0012\t\u0000\u00d4\u00d5"+
		"\u0005\u0004\u0000\u0000\u00d5\u001d\u0001\u0000\u0000\u0000\u00d6\u00d7"+
		"\u0007\u0004\u0000\u0000\u00d7\u001f\u0001\u0000\u0000\u0000\u00d8\u00d9"+
		"\u0005\u001d\u0000\u0000\u00d9!\u0001\u0000\u0000\u0000\u000b,359F\u0095"+
		"\u00a3\u00b4\u00bb\u00ca\u00d0";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}