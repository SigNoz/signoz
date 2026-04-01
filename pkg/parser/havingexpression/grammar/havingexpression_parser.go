// Code generated from grammar/HavingExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // HavingExpression

import (
	"fmt"
	"strconv"
	"sync"

	"github.com/antlr4-go/antlr/v4"
)

// Suppress unused import errors
var _ = fmt.Printf
var _ = strconv.Itoa
var _ = sync.Once{}

type HavingExpressionParser struct {
	*antlr.BaseParser
}

var HavingExpressionParserStaticData struct {
	once                   sync.Once
	serializedATN          []int32
	LiteralNames           []string
	SymbolicNames          []string
	RuleNames              []string
	PredictionContextCache *antlr.PredictionContextCache
	atn                    *antlr.ATN
	decisionToDFA          []*antlr.DFA
}

func havingexpressionParserInit() {
	staticData := &HavingExpressionParserStaticData
	staticData.LiteralNames = []string{
		"", "'('", "')'", "','", "", "'!='", "'<>'", "'<'", "'<='", "'>'", "'>='",
		"'+'", "'-'", "'*'", "'/'", "'%'",
	}
	staticData.SymbolicNames = []string{
		"", "LPAREN", "RPAREN", "COMMA", "EQUALS", "NOT_EQUALS", "NEQ", "LT",
		"LE", "GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT", "NOT",
		"AND", "OR", "IN", "BOOL", "NUMBER", "IDENTIFIER", "STRING", "WS",
	}
	staticData.RuleNames = []string{
		"query", "expression", "orExpression", "andExpression", "primary", "comparison",
		"compOp", "inList", "operand", "term", "factor", "atom", "functionCall",
		"functionArgList", "funcArg", "funcArgToken", "identifier",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 1, 24, 183, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7,
		4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2, 10, 7,
		10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15, 7, 15,
		2, 16, 7, 16, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 5, 2, 43,
		8, 2, 10, 2, 12, 2, 46, 9, 2, 1, 3, 1, 3, 1, 3, 1, 3, 5, 3, 52, 8, 3, 10,
		3, 12, 3, 55, 9, 3, 1, 4, 3, 4, 58, 8, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4,
		3, 4, 65, 8, 4, 1, 4, 3, 4, 68, 8, 4, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1,
		5, 3, 5, 76, 8, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 3, 5, 83, 8, 5, 1, 6,
		1, 6, 1, 7, 1, 7, 1, 7, 5, 7, 90, 8, 7, 10, 7, 12, 7, 93, 9, 7, 1, 8, 1,
		8, 1, 8, 1, 8, 1, 8, 1, 8, 5, 8, 101, 8, 8, 10, 8, 12, 8, 104, 9, 8, 1,
		9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 5, 9, 112, 8, 9, 10, 9, 12, 9, 115, 9,
		9, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 3, 10, 124, 8, 10,
		1, 11, 1, 11, 1, 11, 1, 11, 3, 11, 130, 8, 11, 1, 12, 1, 12, 1, 12, 3,
		12, 135, 8, 12, 1, 12, 1, 12, 1, 13, 1, 13, 1, 13, 5, 13, 142, 8, 13, 10,
		13, 12, 13, 145, 9, 13, 1, 14, 4, 14, 148, 8, 14, 11, 14, 12, 14, 149,
		1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1,
		15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15, 1, 15,
		5, 15, 173, 8, 15, 10, 15, 12, 15, 176, 9, 15, 1, 15, 3, 15, 179, 8, 15,
		1, 16, 1, 16, 1, 16, 0, 2, 16, 18, 17, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18,
		20, 22, 24, 26, 28, 30, 32, 0, 3, 1, 0, 4, 10, 1, 0, 11, 12, 1, 0, 13,
		15, 204, 0, 34, 1, 0, 0, 0, 2, 37, 1, 0, 0, 0, 4, 39, 1, 0, 0, 0, 6, 47,
		1, 0, 0, 0, 8, 67, 1, 0, 0, 0, 10, 82, 1, 0, 0, 0, 12, 84, 1, 0, 0, 0,
		14, 86, 1, 0, 0, 0, 16, 94, 1, 0, 0, 0, 18, 105, 1, 0, 0, 0, 20, 123, 1,
		0, 0, 0, 22, 129, 1, 0, 0, 0, 24, 131, 1, 0, 0, 0, 26, 138, 1, 0, 0, 0,
		28, 147, 1, 0, 0, 0, 30, 178, 1, 0, 0, 0, 32, 180, 1, 0, 0, 0, 34, 35,
		3, 2, 1, 0, 35, 36, 5, 0, 0, 1, 36, 1, 1, 0, 0, 0, 37, 38, 3, 4, 2, 0,
		38, 3, 1, 0, 0, 0, 39, 44, 3, 6, 3, 0, 40, 41, 5, 18, 0, 0, 41, 43, 3,
		6, 3, 0, 42, 40, 1, 0, 0, 0, 43, 46, 1, 0, 0, 0, 44, 42, 1, 0, 0, 0, 44,
		45, 1, 0, 0, 0, 45, 5, 1, 0, 0, 0, 46, 44, 1, 0, 0, 0, 47, 53, 3, 8, 4,
		0, 48, 49, 5, 17, 0, 0, 49, 52, 3, 8, 4, 0, 50, 52, 3, 8, 4, 0, 51, 48,
		1, 0, 0, 0, 51, 50, 1, 0, 0, 0, 52, 55, 1, 0, 0, 0, 53, 51, 1, 0, 0, 0,
		53, 54, 1, 0, 0, 0, 54, 7, 1, 0, 0, 0, 55, 53, 1, 0, 0, 0, 56, 58, 5, 16,
		0, 0, 57, 56, 1, 0, 0, 0, 57, 58, 1, 0, 0, 0, 58, 59, 1, 0, 0, 0, 59, 60,
		5, 1, 0, 0, 60, 61, 3, 4, 2, 0, 61, 62, 5, 2, 0, 0, 62, 68, 1, 0, 0, 0,
		63, 65, 5, 16, 0, 0, 64, 63, 1, 0, 0, 0, 64, 65, 1, 0, 0, 0, 65, 66, 1,
		0, 0, 0, 66, 68, 3, 10, 5, 0, 67, 57, 1, 0, 0, 0, 67, 64, 1, 0, 0, 0, 68,
		9, 1, 0, 0, 0, 69, 70, 3, 16, 8, 0, 70, 71, 3, 12, 6, 0, 71, 72, 3, 16,
		8, 0, 72, 83, 1, 0, 0, 0, 73, 75, 3, 16, 8, 0, 74, 76, 5, 16, 0, 0, 75,
		74, 1, 0, 0, 0, 75, 76, 1, 0, 0, 0, 76, 77, 1, 0, 0, 0, 77, 78, 5, 19,
		0, 0, 78, 79, 5, 1, 0, 0, 79, 80, 3, 14, 7, 0, 80, 81, 5, 2, 0, 0, 81,
		83, 1, 0, 0, 0, 82, 69, 1, 0, 0, 0, 82, 73, 1, 0, 0, 0, 83, 11, 1, 0, 0,
		0, 84, 85, 7, 0, 0, 0, 85, 13, 1, 0, 0, 0, 86, 91, 5, 21, 0, 0, 87, 88,
		5, 3, 0, 0, 88, 90, 5, 21, 0, 0, 89, 87, 1, 0, 0, 0, 90, 93, 1, 0, 0, 0,
		91, 89, 1, 0, 0, 0, 91, 92, 1, 0, 0, 0, 92, 15, 1, 0, 0, 0, 93, 91, 1,
		0, 0, 0, 94, 95, 6, 8, -1, 0, 95, 96, 3, 18, 9, 0, 96, 102, 1, 0, 0, 0,
		97, 98, 10, 2, 0, 0, 98, 99, 7, 1, 0, 0, 99, 101, 3, 18, 9, 0, 100, 97,
		1, 0, 0, 0, 101, 104, 1, 0, 0, 0, 102, 100, 1, 0, 0, 0, 102, 103, 1, 0,
		0, 0, 103, 17, 1, 0, 0, 0, 104, 102, 1, 0, 0, 0, 105, 106, 6, 9, -1, 0,
		106, 107, 3, 20, 10, 0, 107, 113, 1, 0, 0, 0, 108, 109, 10, 2, 0, 0, 109,
		110, 7, 2, 0, 0, 110, 112, 3, 20, 10, 0, 111, 108, 1, 0, 0, 0, 112, 115,
		1, 0, 0, 0, 113, 111, 1, 0, 0, 0, 113, 114, 1, 0, 0, 0, 114, 19, 1, 0,
		0, 0, 115, 113, 1, 0, 0, 0, 116, 117, 7, 1, 0, 0, 117, 124, 3, 20, 10,
		0, 118, 119, 5, 1, 0, 0, 119, 120, 3, 16, 8, 0, 120, 121, 5, 2, 0, 0, 121,
		124, 1, 0, 0, 0, 122, 124, 3, 22, 11, 0, 123, 116, 1, 0, 0, 0, 123, 118,
		1, 0, 0, 0, 123, 122, 1, 0, 0, 0, 124, 21, 1, 0, 0, 0, 125, 130, 3, 24,
		12, 0, 126, 130, 3, 32, 16, 0, 127, 130, 5, 21, 0, 0, 128, 130, 5, 23,
		0, 0, 129, 125, 1, 0, 0, 0, 129, 126, 1, 0, 0, 0, 129, 127, 1, 0, 0, 0,
		129, 128, 1, 0, 0, 0, 130, 23, 1, 0, 0, 0, 131, 132, 5, 22, 0, 0, 132,
		134, 5, 1, 0, 0, 133, 135, 3, 26, 13, 0, 134, 133, 1, 0, 0, 0, 134, 135,
		1, 0, 0, 0, 135, 136, 1, 0, 0, 0, 136, 137, 5, 2, 0, 0, 137, 25, 1, 0,
		0, 0, 138, 143, 3, 28, 14, 0, 139, 140, 5, 3, 0, 0, 140, 142, 3, 28, 14,
		0, 141, 139, 1, 0, 0, 0, 142, 145, 1, 0, 0, 0, 143, 141, 1, 0, 0, 0, 143,
		144, 1, 0, 0, 0, 144, 27, 1, 0, 0, 0, 145, 143, 1, 0, 0, 0, 146, 148, 3,
		30, 15, 0, 147, 146, 1, 0, 0, 0, 148, 149, 1, 0, 0, 0, 149, 147, 1, 0,
		0, 0, 149, 150, 1, 0, 0, 0, 150, 29, 1, 0, 0, 0, 151, 179, 5, 22, 0, 0,
		152, 179, 5, 23, 0, 0, 153, 179, 5, 21, 0, 0, 154, 179, 5, 20, 0, 0, 155,
		179, 5, 4, 0, 0, 156, 179, 5, 5, 0, 0, 157, 179, 5, 6, 0, 0, 158, 179,
		5, 7, 0, 0, 159, 179, 5, 8, 0, 0, 160, 179, 5, 9, 0, 0, 161, 179, 5, 10,
		0, 0, 162, 179, 5, 11, 0, 0, 163, 179, 5, 12, 0, 0, 164, 179, 5, 13, 0,
		0, 165, 179, 5, 14, 0, 0, 166, 179, 5, 15, 0, 0, 167, 179, 5, 16, 0, 0,
		168, 179, 5, 17, 0, 0, 169, 179, 5, 18, 0, 0, 170, 174, 5, 1, 0, 0, 171,
		173, 3, 30, 15, 0, 172, 171, 1, 0, 0, 0, 173, 176, 1, 0, 0, 0, 174, 172,
		1, 0, 0, 0, 174, 175, 1, 0, 0, 0, 175, 177, 1, 0, 0, 0, 176, 174, 1, 0,
		0, 0, 177, 179, 5, 2, 0, 0, 178, 151, 1, 0, 0, 0, 178, 152, 1, 0, 0, 0,
		178, 153, 1, 0, 0, 0, 178, 154, 1, 0, 0, 0, 178, 155, 1, 0, 0, 0, 178,
		156, 1, 0, 0, 0, 178, 157, 1, 0, 0, 0, 178, 158, 1, 0, 0, 0, 178, 159,
		1, 0, 0, 0, 178, 160, 1, 0, 0, 0, 178, 161, 1, 0, 0, 0, 178, 162, 1, 0,
		0, 0, 178, 163, 1, 0, 0, 0, 178, 164, 1, 0, 0, 0, 178, 165, 1, 0, 0, 0,
		178, 166, 1, 0, 0, 0, 178, 167, 1, 0, 0, 0, 178, 168, 1, 0, 0, 0, 178,
		169, 1, 0, 0, 0, 178, 170, 1, 0, 0, 0, 179, 31, 1, 0, 0, 0, 180, 181, 5,
		22, 0, 0, 181, 33, 1, 0, 0, 0, 18, 44, 51, 53, 57, 64, 67, 75, 82, 91,
		102, 113, 123, 129, 134, 143, 149, 174, 178,
	}
	deserializer := antlr.NewATNDeserializer(nil)
	staticData.atn = deserializer.Deserialize(staticData.serializedATN)
	atn := staticData.atn
	staticData.decisionToDFA = make([]*antlr.DFA, len(atn.DecisionToState))
	decisionToDFA := staticData.decisionToDFA
	for index, state := range atn.DecisionToState {
		decisionToDFA[index] = antlr.NewDFA(state, index)
	}
}

// HavingExpressionParserInit initializes any static state used to implement HavingExpressionParser. By default the
// static state used to implement the parser is lazily initialized during the first call to
// NewHavingExpressionParser(). You can call this function if you wish to initialize the static state ahead
// of time.
func HavingExpressionParserInit() {
	staticData := &HavingExpressionParserStaticData
	staticData.once.Do(havingexpressionParserInit)
}

// NewHavingExpressionParser produces a new parser instance for the optional input antlr.TokenStream.
func NewHavingExpressionParser(input antlr.TokenStream) *HavingExpressionParser {
	HavingExpressionParserInit()
	this := new(HavingExpressionParser)
	this.BaseParser = antlr.NewBaseParser(input)
	staticData := &HavingExpressionParserStaticData
	this.Interpreter = antlr.NewParserATNSimulator(this, staticData.atn, staticData.decisionToDFA, staticData.PredictionContextCache)
	this.RuleNames = staticData.RuleNames
	this.LiteralNames = staticData.LiteralNames
	this.SymbolicNames = staticData.SymbolicNames
	this.GrammarFileName = "HavingExpression.g4"

	return this
}

// HavingExpressionParser tokens.
const (
	HavingExpressionParserEOF        = antlr.TokenEOF
	HavingExpressionParserLPAREN     = 1
	HavingExpressionParserRPAREN     = 2
	HavingExpressionParserCOMMA      = 3
	HavingExpressionParserEQUALS     = 4
	HavingExpressionParserNOT_EQUALS = 5
	HavingExpressionParserNEQ        = 6
	HavingExpressionParserLT         = 7
	HavingExpressionParserLE         = 8
	HavingExpressionParserGT         = 9
	HavingExpressionParserGE         = 10
	HavingExpressionParserPLUS       = 11
	HavingExpressionParserMINUS      = 12
	HavingExpressionParserSTAR       = 13
	HavingExpressionParserSLASH      = 14
	HavingExpressionParserPERCENT    = 15
	HavingExpressionParserNOT        = 16
	HavingExpressionParserAND        = 17
	HavingExpressionParserOR         = 18
	HavingExpressionParserIN         = 19
	HavingExpressionParserBOOL       = 20
	HavingExpressionParserNUMBER     = 21
	HavingExpressionParserIDENTIFIER = 22
	HavingExpressionParserSTRING     = 23
	HavingExpressionParserWS         = 24
)

// HavingExpressionParser rules.
const (
	HavingExpressionParserRULE_query           = 0
	HavingExpressionParserRULE_expression      = 1
	HavingExpressionParserRULE_orExpression    = 2
	HavingExpressionParserRULE_andExpression   = 3
	HavingExpressionParserRULE_primary         = 4
	HavingExpressionParserRULE_comparison      = 5
	HavingExpressionParserRULE_compOp          = 6
	HavingExpressionParserRULE_inList          = 7
	HavingExpressionParserRULE_operand         = 8
	HavingExpressionParserRULE_term            = 9
	HavingExpressionParserRULE_factor          = 10
	HavingExpressionParserRULE_atom            = 11
	HavingExpressionParserRULE_functionCall    = 12
	HavingExpressionParserRULE_functionArgList = 13
	HavingExpressionParserRULE_funcArg         = 14
	HavingExpressionParserRULE_funcArgToken    = 15
	HavingExpressionParserRULE_identifier      = 16
)

// IQueryContext is an interface to support dynamic dispatch.
type IQueryContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Expression() IExpressionContext
	EOF() antlr.TerminalNode

	// IsQueryContext differentiates from other interfaces.
	IsQueryContext()
}

type QueryContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyQueryContext() *QueryContext {
	var p = new(QueryContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_query
	return p
}

func InitEmptyQueryContext(p *QueryContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_query
}

func (*QueryContext) IsQueryContext() {}

func NewQueryContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *QueryContext {
	var p = new(QueryContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_query

	return p
}

func (s *QueryContext) GetParser() antlr.Parser { return s.parser }

func (s *QueryContext) Expression() IExpressionContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IExpressionContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IExpressionContext)
}

func (s *QueryContext) EOF() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserEOF, 0)
}

func (s *QueryContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *QueryContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *QueryContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterQuery(s)
	}
}

func (s *QueryContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitQuery(s)
	}
}

func (s *QueryContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitQuery(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Query() (localctx IQueryContext) {
	localctx = NewQueryContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 0, HavingExpressionParserRULE_query)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(34)
		p.Expression()
	}
	{
		p.SetState(35)
		p.Match(HavingExpressionParserEOF)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IExpressionContext is an interface to support dynamic dispatch.
type IExpressionContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	OrExpression() IOrExpressionContext

	// IsExpressionContext differentiates from other interfaces.
	IsExpressionContext()
}

type ExpressionContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyExpressionContext() *ExpressionContext {
	var p = new(ExpressionContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_expression
	return p
}

func InitEmptyExpressionContext(p *ExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_expression
}

func (*ExpressionContext) IsExpressionContext() {}

func NewExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ExpressionContext {
	var p = new(ExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_expression

	return p
}

func (s *ExpressionContext) GetParser() antlr.Parser { return s.parser }

func (s *ExpressionContext) OrExpression() IOrExpressionContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IOrExpressionContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IOrExpressionContext)
}

func (s *ExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterExpression(s)
	}
}

func (s *ExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitExpression(s)
	}
}

func (s *ExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Expression() (localctx IExpressionContext) {
	localctx = NewExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 2, HavingExpressionParserRULE_expression)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(37)
		p.OrExpression()
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IOrExpressionContext is an interface to support dynamic dispatch.
type IOrExpressionContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllAndExpression() []IAndExpressionContext
	AndExpression(i int) IAndExpressionContext
	AllOR() []antlr.TerminalNode
	OR(i int) antlr.TerminalNode

	// IsOrExpressionContext differentiates from other interfaces.
	IsOrExpressionContext()
}

type OrExpressionContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyOrExpressionContext() *OrExpressionContext {
	var p = new(OrExpressionContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_orExpression
	return p
}

func InitEmptyOrExpressionContext(p *OrExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_orExpression
}

func (*OrExpressionContext) IsOrExpressionContext() {}

func NewOrExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *OrExpressionContext {
	var p = new(OrExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_orExpression

	return p
}

func (s *OrExpressionContext) GetParser() antlr.Parser { return s.parser }

func (s *OrExpressionContext) AllAndExpression() []IAndExpressionContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IAndExpressionContext); ok {
			len++
		}
	}

	tst := make([]IAndExpressionContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IAndExpressionContext); ok {
			tst[i] = t.(IAndExpressionContext)
			i++
		}
	}

	return tst
}

func (s *OrExpressionContext) AndExpression(i int) IAndExpressionContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IAndExpressionContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IAndExpressionContext)
}

func (s *OrExpressionContext) AllOR() []antlr.TerminalNode {
	return s.GetTokens(HavingExpressionParserOR)
}

func (s *OrExpressionContext) OR(i int) antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserOR, i)
}

func (s *OrExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *OrExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *OrExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterOrExpression(s)
	}
}

func (s *OrExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitOrExpression(s)
	}
}

func (s *OrExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitOrExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) OrExpression() (localctx IOrExpressionContext) {
	localctx = NewOrExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 4, HavingExpressionParserRULE_orExpression)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(39)
		p.AndExpression()
	}
	p.SetState(44)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserOR {
		{
			p.SetState(40)
			p.Match(HavingExpressionParserOR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(41)
			p.AndExpression()
		}

		p.SetState(46)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IAndExpressionContext is an interface to support dynamic dispatch.
type IAndExpressionContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllPrimary() []IPrimaryContext
	Primary(i int) IPrimaryContext
	AllAND() []antlr.TerminalNode
	AND(i int) antlr.TerminalNode

	// IsAndExpressionContext differentiates from other interfaces.
	IsAndExpressionContext()
}

type AndExpressionContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyAndExpressionContext() *AndExpressionContext {
	var p = new(AndExpressionContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_andExpression
	return p
}

func InitEmptyAndExpressionContext(p *AndExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_andExpression
}

func (*AndExpressionContext) IsAndExpressionContext() {}

func NewAndExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *AndExpressionContext {
	var p = new(AndExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_andExpression

	return p
}

func (s *AndExpressionContext) GetParser() antlr.Parser { return s.parser }

func (s *AndExpressionContext) AllPrimary() []IPrimaryContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IPrimaryContext); ok {
			len++
		}
	}

	tst := make([]IPrimaryContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IPrimaryContext); ok {
			tst[i] = t.(IPrimaryContext)
			i++
		}
	}

	return tst
}

func (s *AndExpressionContext) Primary(i int) IPrimaryContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IPrimaryContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IPrimaryContext)
}

func (s *AndExpressionContext) AllAND() []antlr.TerminalNode {
	return s.GetTokens(HavingExpressionParserAND)
}

func (s *AndExpressionContext) AND(i int) antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserAND, i)
}

func (s *AndExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *AndExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *AndExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterAndExpression(s)
	}
}

func (s *AndExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitAndExpression(s)
	}
}

func (s *AndExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitAndExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) AndExpression() (localctx IAndExpressionContext) {
	localctx = NewAndExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 6, HavingExpressionParserRULE_andExpression)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(47)
		p.Primary()
	}
	p.SetState(53)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&14882818) != 0 {
		p.SetState(51)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}

		switch p.GetTokenStream().LA(1) {
		case HavingExpressionParserAND:
			{
				p.SetState(48)
				p.Match(HavingExpressionParserAND)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}
			{
				p.SetState(49)
				p.Primary()
			}

		case HavingExpressionParserLPAREN, HavingExpressionParserPLUS, HavingExpressionParserMINUS, HavingExpressionParserNOT, HavingExpressionParserNUMBER, HavingExpressionParserIDENTIFIER, HavingExpressionParserSTRING:
			{
				p.SetState(50)
				p.Primary()
			}

		default:
			p.SetError(antlr.NewNoViableAltException(p, nil, nil, nil, nil, nil))
			goto errorExit
		}

		p.SetState(55)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IPrimaryContext is an interface to support dynamic dispatch.
type IPrimaryContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	LPAREN() antlr.TerminalNode
	OrExpression() IOrExpressionContext
	RPAREN() antlr.TerminalNode
	NOT() antlr.TerminalNode
	Comparison() IComparisonContext

	// IsPrimaryContext differentiates from other interfaces.
	IsPrimaryContext()
}

type PrimaryContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyPrimaryContext() *PrimaryContext {
	var p = new(PrimaryContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_primary
	return p
}

func InitEmptyPrimaryContext(p *PrimaryContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_primary
}

func (*PrimaryContext) IsPrimaryContext() {}

func NewPrimaryContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *PrimaryContext {
	var p = new(PrimaryContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_primary

	return p
}

func (s *PrimaryContext) GetParser() antlr.Parser { return s.parser }

func (s *PrimaryContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLPAREN, 0)
}

func (s *PrimaryContext) OrExpression() IOrExpressionContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IOrExpressionContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IOrExpressionContext)
}

func (s *PrimaryContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRPAREN, 0)
}

func (s *PrimaryContext) NOT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNOT, 0)
}

func (s *PrimaryContext) Comparison() IComparisonContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IComparisonContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IComparisonContext)
}

func (s *PrimaryContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *PrimaryContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *PrimaryContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterPrimary(s)
	}
}

func (s *PrimaryContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitPrimary(s)
	}
}

func (s *PrimaryContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitPrimary(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Primary() (localctx IPrimaryContext) {
	localctx = NewPrimaryContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 8, HavingExpressionParserRULE_primary)
	var _la int

	p.SetState(67)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 5, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		p.SetState(57)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(56)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(59)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(60)
			p.OrExpression()
		}
		{
			p.SetState(61)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		p.SetState(64)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(63)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(66)
			p.Comparison()
		}

	case antlr.ATNInvalidAltNumber:
		goto errorExit
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IComparisonContext is an interface to support dynamic dispatch.
type IComparisonContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllOperand() []IOperandContext
	Operand(i int) IOperandContext
	CompOp() ICompOpContext
	IN() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	InList() IInListContext
	RPAREN() antlr.TerminalNode
	NOT() antlr.TerminalNode

	// IsComparisonContext differentiates from other interfaces.
	IsComparisonContext()
}

type ComparisonContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyComparisonContext() *ComparisonContext {
	var p = new(ComparisonContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_comparison
	return p
}

func InitEmptyComparisonContext(p *ComparisonContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_comparison
}

func (*ComparisonContext) IsComparisonContext() {}

func NewComparisonContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ComparisonContext {
	var p = new(ComparisonContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_comparison

	return p
}

func (s *ComparisonContext) GetParser() antlr.Parser { return s.parser }

func (s *ComparisonContext) AllOperand() []IOperandContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IOperandContext); ok {
			len++
		}
	}

	tst := make([]IOperandContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IOperandContext); ok {
			tst[i] = t.(IOperandContext)
			i++
		}
	}

	return tst
}

func (s *ComparisonContext) Operand(i int) IOperandContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IOperandContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IOperandContext)
}

func (s *ComparisonContext) CompOp() ICompOpContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(ICompOpContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(ICompOpContext)
}

func (s *ComparisonContext) IN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserIN, 0)
}

func (s *ComparisonContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLPAREN, 0)
}

func (s *ComparisonContext) InList() IInListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IInListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IInListContext)
}

func (s *ComparisonContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRPAREN, 0)
}

func (s *ComparisonContext) NOT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNOT, 0)
}

func (s *ComparisonContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ComparisonContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ComparisonContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterComparison(s)
	}
}

func (s *ComparisonContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitComparison(s)
	}
}

func (s *ComparisonContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitComparison(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Comparison() (localctx IComparisonContext) {
	localctx = NewComparisonContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 10, HavingExpressionParserRULE_comparison)
	var _la int

	p.SetState(82)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 7, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(69)
			p.operand(0)
		}
		{
			p.SetState(70)
			p.CompOp()
		}
		{
			p.SetState(71)
			p.operand(0)
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(73)
			p.operand(0)
		}
		p.SetState(75)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(74)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(77)
			p.Match(HavingExpressionParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(78)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(79)
			p.InList()
		}
		{
			p.SetState(80)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case antlr.ATNInvalidAltNumber:
		goto errorExit
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// ICompOpContext is an interface to support dynamic dispatch.
type ICompOpContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	EQUALS() antlr.TerminalNode
	NOT_EQUALS() antlr.TerminalNode
	NEQ() antlr.TerminalNode
	LT() antlr.TerminalNode
	LE() antlr.TerminalNode
	GT() antlr.TerminalNode
	GE() antlr.TerminalNode

	// IsCompOpContext differentiates from other interfaces.
	IsCompOpContext()
}

type CompOpContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyCompOpContext() *CompOpContext {
	var p = new(CompOpContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_compOp
	return p
}

func InitEmptyCompOpContext(p *CompOpContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_compOp
}

func (*CompOpContext) IsCompOpContext() {}

func NewCompOpContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *CompOpContext {
	var p = new(CompOpContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_compOp

	return p
}

func (s *CompOpContext) GetParser() antlr.Parser { return s.parser }

func (s *CompOpContext) EQUALS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserEQUALS, 0)
}

func (s *CompOpContext) NOT_EQUALS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNOT_EQUALS, 0)
}

func (s *CompOpContext) NEQ() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNEQ, 0)
}

func (s *CompOpContext) LT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLT, 0)
}

func (s *CompOpContext) LE() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLE, 0)
}

func (s *CompOpContext) GT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserGT, 0)
}

func (s *CompOpContext) GE() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserGE, 0)
}

func (s *CompOpContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *CompOpContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *CompOpContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterCompOp(s)
	}
}

func (s *CompOpContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitCompOp(s)
	}
}

func (s *CompOpContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitCompOp(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) CompOp() (localctx ICompOpContext) {
	localctx = NewCompOpContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 12, HavingExpressionParserRULE_compOp)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(84)
		_la = p.GetTokenStream().LA(1)

		if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&2032) != 0) {
			p.GetErrorHandler().RecoverInline(p)
		} else {
			p.GetErrorHandler().ReportMatch(p)
			p.Consume()
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IInListContext is an interface to support dynamic dispatch.
type IInListContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllNUMBER() []antlr.TerminalNode
	NUMBER(i int) antlr.TerminalNode
	AllCOMMA() []antlr.TerminalNode
	COMMA(i int) antlr.TerminalNode

	// IsInListContext differentiates from other interfaces.
	IsInListContext()
}

type InListContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyInListContext() *InListContext {
	var p = new(InListContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_inList
	return p
}

func InitEmptyInListContext(p *InListContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_inList
}

func (*InListContext) IsInListContext() {}

func NewInListContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *InListContext {
	var p = new(InListContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_inList

	return p
}

func (s *InListContext) GetParser() antlr.Parser { return s.parser }

func (s *InListContext) AllNUMBER() []antlr.TerminalNode {
	return s.GetTokens(HavingExpressionParserNUMBER)
}

func (s *InListContext) NUMBER(i int) antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNUMBER, i)
}

func (s *InListContext) AllCOMMA() []antlr.TerminalNode {
	return s.GetTokens(HavingExpressionParserCOMMA)
}

func (s *InListContext) COMMA(i int) antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserCOMMA, i)
}

func (s *InListContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *InListContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *InListContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterInList(s)
	}
}

func (s *InListContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitInList(s)
	}
}

func (s *InListContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitInList(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) InList() (localctx IInListContext) {
	localctx = NewInListContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 14, HavingExpressionParserRULE_inList)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(86)
		p.Match(HavingExpressionParserNUMBER)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	p.SetState(91)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserCOMMA {
		{
			p.SetState(87)
			p.Match(HavingExpressionParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(88)
			p.Match(HavingExpressionParserNUMBER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

		p.SetState(93)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IOperandContext is an interface to support dynamic dispatch.
type IOperandContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Term() ITermContext
	Operand() IOperandContext
	PLUS() antlr.TerminalNode
	MINUS() antlr.TerminalNode

	// IsOperandContext differentiates from other interfaces.
	IsOperandContext()
}

type OperandContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyOperandContext() *OperandContext {
	var p = new(OperandContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_operand
	return p
}

func InitEmptyOperandContext(p *OperandContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_operand
}

func (*OperandContext) IsOperandContext() {}

func NewOperandContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *OperandContext {
	var p = new(OperandContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_operand

	return p
}

func (s *OperandContext) GetParser() antlr.Parser { return s.parser }

func (s *OperandContext) Term() ITermContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(ITermContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(ITermContext)
}

func (s *OperandContext) Operand() IOperandContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IOperandContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IOperandContext)
}

func (s *OperandContext) PLUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPLUS, 0)
}

func (s *OperandContext) MINUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserMINUS, 0)
}

func (s *OperandContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *OperandContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *OperandContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterOperand(s)
	}
}

func (s *OperandContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitOperand(s)
	}
}

func (s *OperandContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitOperand(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Operand() (localctx IOperandContext) {
	return p.operand(0)
}

func (p *HavingExpressionParser) operand(_p int) (localctx IOperandContext) {
	var _parentctx antlr.ParserRuleContext = p.GetParserRuleContext()

	_parentState := p.GetState()
	localctx = NewOperandContext(p, p.GetParserRuleContext(), _parentState)
	var _prevctx IOperandContext = localctx
	var _ antlr.ParserRuleContext = _prevctx // TODO: To prevent unused variable warning.
	_startState := 16
	p.EnterRecursionRule(localctx, 16, HavingExpressionParserRULE_operand, _p)
	var _la int

	var _alt int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(95)
		p.term(0)
	}

	p.GetParserRuleContext().SetStop(p.GetTokenStream().LT(-1))
	p.SetState(102)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 9, p.GetParserRuleContext())
	if p.HasError() {
		goto errorExit
	}
	for _alt != 2 && _alt != antlr.ATNInvalidAltNumber {
		if _alt == 1 {
			if p.GetParseListeners() != nil {
				p.TriggerExitRuleEvent()
			}
			_prevctx = localctx
			localctx = NewOperandContext(p, _parentctx, _parentState)
			p.PushNewRecursionContext(localctx, _startState, HavingExpressionParserRULE_operand)
			p.SetState(97)

			if !(p.Precpred(p.GetParserRuleContext(), 2)) {
				p.SetError(antlr.NewFailedPredicateException(p, "p.Precpred(p.GetParserRuleContext(), 2)", ""))
				goto errorExit
			}
			{
				p.SetState(98)
				_la = p.GetTokenStream().LA(1)

				if !(_la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS) {
					p.GetErrorHandler().RecoverInline(p)
				} else {
					p.GetErrorHandler().ReportMatch(p)
					p.Consume()
				}
			}
			{
				p.SetState(99)
				p.term(0)
			}

		}
		p.SetState(104)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 9, p.GetParserRuleContext())
		if p.HasError() {
			goto errorExit
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.UnrollRecursionContexts(_parentctx)
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// ITermContext is an interface to support dynamic dispatch.
type ITermContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Factor() IFactorContext
	Term() ITermContext
	STAR() antlr.TerminalNode
	SLASH() antlr.TerminalNode
	PERCENT() antlr.TerminalNode

	// IsTermContext differentiates from other interfaces.
	IsTermContext()
}

type TermContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyTermContext() *TermContext {
	var p = new(TermContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_term
	return p
}

func InitEmptyTermContext(p *TermContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_term
}

func (*TermContext) IsTermContext() {}

func NewTermContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *TermContext {
	var p = new(TermContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_term

	return p
}

func (s *TermContext) GetParser() antlr.Parser { return s.parser }

func (s *TermContext) Factor() IFactorContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFactorContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFactorContext)
}

func (s *TermContext) Term() ITermContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(ITermContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(ITermContext)
}

func (s *TermContext) STAR() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSTAR, 0)
}

func (s *TermContext) SLASH() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSLASH, 0)
}

func (s *TermContext) PERCENT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPERCENT, 0)
}

func (s *TermContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *TermContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *TermContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterTerm(s)
	}
}

func (s *TermContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitTerm(s)
	}
}

func (s *TermContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitTerm(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Term() (localctx ITermContext) {
	return p.term(0)
}

func (p *HavingExpressionParser) term(_p int) (localctx ITermContext) {
	var _parentctx antlr.ParserRuleContext = p.GetParserRuleContext()

	_parentState := p.GetState()
	localctx = NewTermContext(p, p.GetParserRuleContext(), _parentState)
	var _prevctx ITermContext = localctx
	var _ antlr.ParserRuleContext = _prevctx // TODO: To prevent unused variable warning.
	_startState := 18
	p.EnterRecursionRule(localctx, 18, HavingExpressionParserRULE_term, _p)
	var _la int

	var _alt int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(106)
		p.Factor()
	}

	p.GetParserRuleContext().SetStop(p.GetTokenStream().LT(-1))
	p.SetState(113)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 10, p.GetParserRuleContext())
	if p.HasError() {
		goto errorExit
	}
	for _alt != 2 && _alt != antlr.ATNInvalidAltNumber {
		if _alt == 1 {
			if p.GetParseListeners() != nil {
				p.TriggerExitRuleEvent()
			}
			_prevctx = localctx
			localctx = NewTermContext(p, _parentctx, _parentState)
			p.PushNewRecursionContext(localctx, _startState, HavingExpressionParserRULE_term)
			p.SetState(108)

			if !(p.Precpred(p.GetParserRuleContext(), 2)) {
				p.SetError(antlr.NewFailedPredicateException(p, "p.Precpred(p.GetParserRuleContext(), 2)", ""))
				goto errorExit
			}
			{
				p.SetState(109)
				_la = p.GetTokenStream().LA(1)

				if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&57344) != 0) {
					p.GetErrorHandler().RecoverInline(p)
				} else {
					p.GetErrorHandler().ReportMatch(p)
					p.Consume()
				}
			}
			{
				p.SetState(110)
				p.Factor()
			}

		}
		p.SetState(115)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 10, p.GetParserRuleContext())
		if p.HasError() {
			goto errorExit
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.UnrollRecursionContexts(_parentctx)
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IFactorContext is an interface to support dynamic dispatch.
type IFactorContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Factor() IFactorContext
	PLUS() antlr.TerminalNode
	MINUS() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	Operand() IOperandContext
	RPAREN() antlr.TerminalNode
	Atom() IAtomContext

	// IsFactorContext differentiates from other interfaces.
	IsFactorContext()
}

type FactorContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFactorContext() *FactorContext {
	var p = new(FactorContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_factor
	return p
}

func InitEmptyFactorContext(p *FactorContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_factor
}

func (*FactorContext) IsFactorContext() {}

func NewFactorContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FactorContext {
	var p = new(FactorContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_factor

	return p
}

func (s *FactorContext) GetParser() antlr.Parser { return s.parser }

func (s *FactorContext) Factor() IFactorContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFactorContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFactorContext)
}

func (s *FactorContext) PLUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPLUS, 0)
}

func (s *FactorContext) MINUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserMINUS, 0)
}

func (s *FactorContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLPAREN, 0)
}

func (s *FactorContext) Operand() IOperandContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IOperandContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IOperandContext)
}

func (s *FactorContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRPAREN, 0)
}

func (s *FactorContext) Atom() IAtomContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IAtomContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IAtomContext)
}

func (s *FactorContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FactorContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FactorContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterFactor(s)
	}
}

func (s *FactorContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitFactor(s)
	}
}

func (s *FactorContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitFactor(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Factor() (localctx IFactorContext) {
	localctx = NewFactorContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 20, HavingExpressionParserRULE_factor)
	var _la int

	p.SetState(123)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetTokenStream().LA(1) {
	case HavingExpressionParserPLUS, HavingExpressionParserMINUS:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(116)
			_la = p.GetTokenStream().LA(1)

			if !(_la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}
		{
			p.SetState(117)
			p.Factor()
		}

	case HavingExpressionParserLPAREN:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(118)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(119)
			p.operand(0)
		}
		{
			p.SetState(120)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNUMBER, HavingExpressionParserIDENTIFIER, HavingExpressionParserSTRING:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(122)
			p.Atom()
		}

	default:
		p.SetError(antlr.NewNoViableAltException(p, nil, nil, nil, nil, nil))
		goto errorExit
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IAtomContext is an interface to support dynamic dispatch.
type IAtomContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	FunctionCall() IFunctionCallContext
	Identifier() IIdentifierContext
	NUMBER() antlr.TerminalNode
	STRING() antlr.TerminalNode

	// IsAtomContext differentiates from other interfaces.
	IsAtomContext()
}

type AtomContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyAtomContext() *AtomContext {
	var p = new(AtomContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_atom
	return p
}

func InitEmptyAtomContext(p *AtomContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_atom
}

func (*AtomContext) IsAtomContext() {}

func NewAtomContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *AtomContext {
	var p = new(AtomContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_atom

	return p
}

func (s *AtomContext) GetParser() antlr.Parser { return s.parser }

func (s *AtomContext) FunctionCall() IFunctionCallContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFunctionCallContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFunctionCallContext)
}

func (s *AtomContext) Identifier() IIdentifierContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IIdentifierContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IIdentifierContext)
}

func (s *AtomContext) NUMBER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNUMBER, 0)
}

func (s *AtomContext) STRING() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSTRING, 0)
}

func (s *AtomContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *AtomContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *AtomContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterAtom(s)
	}
}

func (s *AtomContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitAtom(s)
	}
}

func (s *AtomContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitAtom(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Atom() (localctx IAtomContext) {
	localctx = NewAtomContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 22, HavingExpressionParserRULE_atom)
	p.SetState(129)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 12, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(125)
			p.FunctionCall()
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(126)
			p.Identifier()
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(127)
			p.Match(HavingExpressionParserNUMBER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 4:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(128)
			p.Match(HavingExpressionParserSTRING)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case antlr.ATNInvalidAltNumber:
		goto errorExit
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IFunctionCallContext is an interface to support dynamic dispatch.
type IFunctionCallContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	IDENTIFIER() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	RPAREN() antlr.TerminalNode
	FunctionArgList() IFunctionArgListContext

	// IsFunctionCallContext differentiates from other interfaces.
	IsFunctionCallContext()
}

type FunctionCallContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFunctionCallContext() *FunctionCallContext {
	var p = new(FunctionCallContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_functionCall
	return p
}

func InitEmptyFunctionCallContext(p *FunctionCallContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_functionCall
}

func (*FunctionCallContext) IsFunctionCallContext() {}

func NewFunctionCallContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FunctionCallContext {
	var p = new(FunctionCallContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_functionCall

	return p
}

func (s *FunctionCallContext) GetParser() antlr.Parser { return s.parser }

func (s *FunctionCallContext) IDENTIFIER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserIDENTIFIER, 0)
}

func (s *FunctionCallContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLPAREN, 0)
}

func (s *FunctionCallContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRPAREN, 0)
}

func (s *FunctionCallContext) FunctionArgList() IFunctionArgListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFunctionArgListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFunctionArgListContext)
}

func (s *FunctionCallContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FunctionCallContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FunctionCallContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterFunctionCall(s)
	}
}

func (s *FunctionCallContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitFunctionCall(s)
	}
}

func (s *FunctionCallContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitFunctionCall(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) FunctionCall() (localctx IFunctionCallContext) {
	localctx = NewFunctionCallContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 24, HavingExpressionParserRULE_functionCall)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(131)
		p.Match(HavingExpressionParserIDENTIFIER)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	{
		p.SetState(132)
		p.Match(HavingExpressionParserLPAREN)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	p.SetState(134)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	if (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&16252914) != 0 {
		{
			p.SetState(133)
			p.FunctionArgList()
		}

	}
	{
		p.SetState(136)
		p.Match(HavingExpressionParserRPAREN)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IFunctionArgListContext is an interface to support dynamic dispatch.
type IFunctionArgListContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllFuncArg() []IFuncArgContext
	FuncArg(i int) IFuncArgContext
	AllCOMMA() []antlr.TerminalNode
	COMMA(i int) antlr.TerminalNode

	// IsFunctionArgListContext differentiates from other interfaces.
	IsFunctionArgListContext()
}

type FunctionArgListContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFunctionArgListContext() *FunctionArgListContext {
	var p = new(FunctionArgListContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_functionArgList
	return p
}

func InitEmptyFunctionArgListContext(p *FunctionArgListContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_functionArgList
}

func (*FunctionArgListContext) IsFunctionArgListContext() {}

func NewFunctionArgListContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FunctionArgListContext {
	var p = new(FunctionArgListContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_functionArgList

	return p
}

func (s *FunctionArgListContext) GetParser() antlr.Parser { return s.parser }

func (s *FunctionArgListContext) AllFuncArg() []IFuncArgContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IFuncArgContext); ok {
			len++
		}
	}

	tst := make([]IFuncArgContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IFuncArgContext); ok {
			tst[i] = t.(IFuncArgContext)
			i++
		}
	}

	return tst
}

func (s *FunctionArgListContext) FuncArg(i int) IFuncArgContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFuncArgContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFuncArgContext)
}

func (s *FunctionArgListContext) AllCOMMA() []antlr.TerminalNode {
	return s.GetTokens(HavingExpressionParserCOMMA)
}

func (s *FunctionArgListContext) COMMA(i int) antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserCOMMA, i)
}

func (s *FunctionArgListContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FunctionArgListContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FunctionArgListContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterFunctionArgList(s)
	}
}

func (s *FunctionArgListContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitFunctionArgList(s)
	}
}

func (s *FunctionArgListContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitFunctionArgList(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) FunctionArgList() (localctx IFunctionArgListContext) {
	localctx = NewFunctionArgListContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 26, HavingExpressionParserRULE_functionArgList)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(138)
		p.FuncArg()
	}
	p.SetState(143)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserCOMMA {
		{
			p.SetState(139)
			p.Match(HavingExpressionParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(140)
			p.FuncArg()
		}

		p.SetState(145)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IFuncArgContext is an interface to support dynamic dispatch.
type IFuncArgContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllFuncArgToken() []IFuncArgTokenContext
	FuncArgToken(i int) IFuncArgTokenContext

	// IsFuncArgContext differentiates from other interfaces.
	IsFuncArgContext()
}

type FuncArgContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFuncArgContext() *FuncArgContext {
	var p = new(FuncArgContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_funcArg
	return p
}

func InitEmptyFuncArgContext(p *FuncArgContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_funcArg
}

func (*FuncArgContext) IsFuncArgContext() {}

func NewFuncArgContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FuncArgContext {
	var p = new(FuncArgContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_funcArg

	return p
}

func (s *FuncArgContext) GetParser() antlr.Parser { return s.parser }

func (s *FuncArgContext) AllFuncArgToken() []IFuncArgTokenContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IFuncArgTokenContext); ok {
			len++
		}
	}

	tst := make([]IFuncArgTokenContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IFuncArgTokenContext); ok {
			tst[i] = t.(IFuncArgTokenContext)
			i++
		}
	}

	return tst
}

func (s *FuncArgContext) FuncArgToken(i int) IFuncArgTokenContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFuncArgTokenContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFuncArgTokenContext)
}

func (s *FuncArgContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FuncArgContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FuncArgContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterFuncArg(s)
	}
}

func (s *FuncArgContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitFuncArg(s)
	}
}

func (s *FuncArgContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitFuncArg(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) FuncArg() (localctx IFuncArgContext) {
	localctx = NewFuncArgContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 28, HavingExpressionParserRULE_funcArg)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	p.SetState(147)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for ok := true; ok; ok = ((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&16252914) != 0) {
		{
			p.SetState(146)
			p.FuncArgToken()
		}

		p.SetState(149)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IFuncArgTokenContext is an interface to support dynamic dispatch.
type IFuncArgTokenContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	IDENTIFIER() antlr.TerminalNode
	STRING() antlr.TerminalNode
	NUMBER() antlr.TerminalNode
	BOOL() antlr.TerminalNode
	EQUALS() antlr.TerminalNode
	NOT_EQUALS() antlr.TerminalNode
	NEQ() antlr.TerminalNode
	LT() antlr.TerminalNode
	LE() antlr.TerminalNode
	GT() antlr.TerminalNode
	GE() antlr.TerminalNode
	PLUS() antlr.TerminalNode
	MINUS() antlr.TerminalNode
	STAR() antlr.TerminalNode
	SLASH() antlr.TerminalNode
	PERCENT() antlr.TerminalNode
	NOT() antlr.TerminalNode
	AND() antlr.TerminalNode
	OR() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	RPAREN() antlr.TerminalNode
	AllFuncArgToken() []IFuncArgTokenContext
	FuncArgToken(i int) IFuncArgTokenContext

	// IsFuncArgTokenContext differentiates from other interfaces.
	IsFuncArgTokenContext()
}

type FuncArgTokenContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFuncArgTokenContext() *FuncArgTokenContext {
	var p = new(FuncArgTokenContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_funcArgToken
	return p
}

func InitEmptyFuncArgTokenContext(p *FuncArgTokenContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_funcArgToken
}

func (*FuncArgTokenContext) IsFuncArgTokenContext() {}

func NewFuncArgTokenContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FuncArgTokenContext {
	var p = new(FuncArgTokenContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_funcArgToken

	return p
}

func (s *FuncArgTokenContext) GetParser() antlr.Parser { return s.parser }

func (s *FuncArgTokenContext) IDENTIFIER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserIDENTIFIER, 0)
}

func (s *FuncArgTokenContext) STRING() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSTRING, 0)
}

func (s *FuncArgTokenContext) NUMBER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNUMBER, 0)
}

func (s *FuncArgTokenContext) BOOL() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserBOOL, 0)
}

func (s *FuncArgTokenContext) EQUALS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserEQUALS, 0)
}

func (s *FuncArgTokenContext) NOT_EQUALS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNOT_EQUALS, 0)
}

func (s *FuncArgTokenContext) NEQ() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNEQ, 0)
}

func (s *FuncArgTokenContext) LT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLT, 0)
}

func (s *FuncArgTokenContext) LE() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLE, 0)
}

func (s *FuncArgTokenContext) GT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserGT, 0)
}

func (s *FuncArgTokenContext) GE() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserGE, 0)
}

func (s *FuncArgTokenContext) PLUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPLUS, 0)
}

func (s *FuncArgTokenContext) MINUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserMINUS, 0)
}

func (s *FuncArgTokenContext) STAR() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSTAR, 0)
}

func (s *FuncArgTokenContext) SLASH() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserSLASH, 0)
}

func (s *FuncArgTokenContext) PERCENT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPERCENT, 0)
}

func (s *FuncArgTokenContext) NOT() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNOT, 0)
}

func (s *FuncArgTokenContext) AND() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserAND, 0)
}

func (s *FuncArgTokenContext) OR() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserOR, 0)
}

func (s *FuncArgTokenContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLPAREN, 0)
}

func (s *FuncArgTokenContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRPAREN, 0)
}

func (s *FuncArgTokenContext) AllFuncArgToken() []IFuncArgTokenContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IFuncArgTokenContext); ok {
			len++
		}
	}

	tst := make([]IFuncArgTokenContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IFuncArgTokenContext); ok {
			tst[i] = t.(IFuncArgTokenContext)
			i++
		}
	}

	return tst
}

func (s *FuncArgTokenContext) FuncArgToken(i int) IFuncArgTokenContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFuncArgTokenContext); ok {
			if j == i {
				t = ctx.(antlr.RuleContext)
				break
			}
			j++
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFuncArgTokenContext)
}

func (s *FuncArgTokenContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FuncArgTokenContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FuncArgTokenContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterFuncArgToken(s)
	}
}

func (s *FuncArgTokenContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitFuncArgToken(s)
	}
}

func (s *FuncArgTokenContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitFuncArgToken(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) FuncArgToken() (localctx IFuncArgTokenContext) {
	localctx = NewFuncArgTokenContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 30, HavingExpressionParserRULE_funcArgToken)
	var _la int

	p.SetState(178)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetTokenStream().LA(1) {
	case HavingExpressionParserIDENTIFIER:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(151)
			p.Match(HavingExpressionParserIDENTIFIER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSTRING:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(152)
			p.Match(HavingExpressionParserSTRING)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNUMBER:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(153)
			p.Match(HavingExpressionParserNUMBER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserBOOL:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(154)
			p.Match(HavingExpressionParserBOOL)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserEQUALS:
		p.EnterOuterAlt(localctx, 5)
		{
			p.SetState(155)
			p.Match(HavingExpressionParserEQUALS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNOT_EQUALS:
		p.EnterOuterAlt(localctx, 6)
		{
			p.SetState(156)
			p.Match(HavingExpressionParserNOT_EQUALS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNEQ:
		p.EnterOuterAlt(localctx, 7)
		{
			p.SetState(157)
			p.Match(HavingExpressionParserNEQ)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLT:
		p.EnterOuterAlt(localctx, 8)
		{
			p.SetState(158)
			p.Match(HavingExpressionParserLT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLE:
		p.EnterOuterAlt(localctx, 9)
		{
			p.SetState(159)
			p.Match(HavingExpressionParserLE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserGT:
		p.EnterOuterAlt(localctx, 10)
		{
			p.SetState(160)
			p.Match(HavingExpressionParserGT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserGE:
		p.EnterOuterAlt(localctx, 11)
		{
			p.SetState(161)
			p.Match(HavingExpressionParserGE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserPLUS:
		p.EnterOuterAlt(localctx, 12)
		{
			p.SetState(162)
			p.Match(HavingExpressionParserPLUS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserMINUS:
		p.EnterOuterAlt(localctx, 13)
		{
			p.SetState(163)
			p.Match(HavingExpressionParserMINUS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSTAR:
		p.EnterOuterAlt(localctx, 14)
		{
			p.SetState(164)
			p.Match(HavingExpressionParserSTAR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSLASH:
		p.EnterOuterAlt(localctx, 15)
		{
			p.SetState(165)
			p.Match(HavingExpressionParserSLASH)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserPERCENT:
		p.EnterOuterAlt(localctx, 16)
		{
			p.SetState(166)
			p.Match(HavingExpressionParserPERCENT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNOT:
		p.EnterOuterAlt(localctx, 17)
		{
			p.SetState(167)
			p.Match(HavingExpressionParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserAND:
		p.EnterOuterAlt(localctx, 18)
		{
			p.SetState(168)
			p.Match(HavingExpressionParserAND)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserOR:
		p.EnterOuterAlt(localctx, 19)
		{
			p.SetState(169)
			p.Match(HavingExpressionParserOR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLPAREN:
		p.EnterOuterAlt(localctx, 20)
		{
			p.SetState(170)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		p.SetState(174)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		for (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&16252914) != 0 {
			{
				p.SetState(171)
				p.FuncArgToken()
			}

			p.SetState(176)
			p.GetErrorHandler().Sync(p)
			if p.HasError() {
				goto errorExit
			}
			_la = p.GetTokenStream().LA(1)
		}
		{
			p.SetState(177)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	default:
		p.SetError(antlr.NewNoViableAltException(p, nil, nil, nil, nil, nil))
		goto errorExit
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

// IIdentifierContext is an interface to support dynamic dispatch.
type IIdentifierContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	IDENTIFIER() antlr.TerminalNode

	// IsIdentifierContext differentiates from other interfaces.
	IsIdentifierContext()
}

type IdentifierContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyIdentifierContext() *IdentifierContext {
	var p = new(IdentifierContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_identifier
	return p
}

func InitEmptyIdentifierContext(p *IdentifierContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_identifier
}

func (*IdentifierContext) IsIdentifierContext() {}

func NewIdentifierContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *IdentifierContext {
	var p = new(IdentifierContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_identifier

	return p
}

func (s *IdentifierContext) GetParser() antlr.Parser { return s.parser }

func (s *IdentifierContext) IDENTIFIER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserIDENTIFIER, 0)
}

func (s *IdentifierContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *IdentifierContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *IdentifierContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterIdentifier(s)
	}
}

func (s *IdentifierContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitIdentifier(s)
	}
}

func (s *IdentifierContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitIdentifier(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) Identifier() (localctx IIdentifierContext) {
	localctx = NewIdentifierContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 32, HavingExpressionParserRULE_identifier)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(180)
		p.Match(HavingExpressionParserIDENTIFIER)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}

errorExit:
	if p.HasError() {
		v := p.GetError()
		localctx.SetException(v)
		p.GetErrorHandler().ReportError(p, v)
		p.GetErrorHandler().Recover(p, v)
		p.SetError(nil)
	}
	p.ExitRule()
	return localctx
	goto errorExit // Trick to prevent compiler error if the label is not used
}

func (p *HavingExpressionParser) Sempred(localctx antlr.RuleContext, ruleIndex, predIndex int) bool {
	switch ruleIndex {
	case 8:
		var t *OperandContext = nil
		if localctx != nil {
			t = localctx.(*OperandContext)
		}
		return p.Operand_Sempred(t, predIndex)

	case 9:
		var t *TermContext = nil
		if localctx != nil {
			t = localctx.(*TermContext)
		}
		return p.Term_Sempred(t, predIndex)

	default:
		panic("No predicate with index: " + fmt.Sprint(ruleIndex))
	}
}

func (p *HavingExpressionParser) Operand_Sempred(localctx antlr.RuleContext, predIndex int) bool {
	switch predIndex {
	case 0:
		return p.Precpred(p.GetParserRuleContext(), 2)

	default:
		panic("No predicate with index: " + fmt.Sprint(predIndex))
	}
}

func (p *HavingExpressionParser) Term_Sempred(localctx antlr.RuleContext, predIndex int) bool {
	switch predIndex {
	case 1:
		return p.Precpred(p.GetParserRuleContext(), 2)

	default:
		panic("No predicate with index: " + fmt.Sprint(predIndex))
	}
}
