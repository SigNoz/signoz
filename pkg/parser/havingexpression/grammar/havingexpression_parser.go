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
		"", "'('", "')'", "'['", "']'", "','", "", "'!='", "'<>'", "'<'", "'<='",
		"'>'", "'>='", "'+'", "'-'", "'*'", "'/'", "'%'",
	}
	staticData.SymbolicNames = []string{
		"", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "EQUALS", "NOT_EQUALS",
		"NEQ", "LT", "LE", "GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT",
		"NOT", "AND", "OR", "IN", "BOOL", "NUMBER", "IDENTIFIER", "STRING",
		"WS",
	}
	staticData.RuleNames = []string{
		"query", "expression", "orExpression", "andExpression", "primary", "comparison",
		"compOp", "inList", "signedNumber", "operand", "term", "factor", "atom",
		"functionCall", "functionArgList", "funcArg", "funcArgToken", "identifier",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 1, 26, 199, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7,
		4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2, 10, 7,
		10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15, 7, 15,
		2, 16, 7, 16, 2, 17, 7, 17, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 2, 1, 2, 1,
		2, 5, 2, 45, 8, 2, 10, 2, 12, 2, 48, 9, 2, 1, 3, 1, 3, 1, 3, 1, 3, 5, 3,
		54, 8, 3, 10, 3, 12, 3, 57, 9, 3, 1, 4, 3, 4, 60, 8, 4, 1, 4, 1, 4, 1,
		4, 1, 4, 1, 4, 3, 4, 67, 8, 4, 1, 4, 3, 4, 70, 8, 4, 1, 5, 1, 5, 1, 5,
		1, 5, 1, 5, 1, 5, 3, 5, 78, 8, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1,
		5, 3, 5, 87, 8, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 3, 5, 94, 8, 5, 1, 6,
		1, 6, 1, 7, 1, 7, 1, 7, 5, 7, 101, 8, 7, 10, 7, 12, 7, 104, 9, 7, 1, 8,
		3, 8, 107, 8, 8, 1, 8, 1, 8, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 5, 9,
		117, 8, 9, 10, 9, 12, 9, 120, 9, 9, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10,
		1, 10, 5, 10, 128, 8, 10, 10, 10, 12, 10, 131, 9, 10, 1, 11, 1, 11, 1,
		11, 1, 11, 1, 11, 1, 11, 1, 11, 3, 11, 140, 8, 11, 1, 12, 1, 12, 1, 12,
		1, 12, 3, 12, 146, 8, 12, 1, 13, 1, 13, 1, 13, 3, 13, 151, 8, 13, 1, 13,
		1, 13, 1, 14, 1, 14, 1, 14, 5, 14, 158, 8, 14, 10, 14, 12, 14, 161, 9,
		14, 1, 15, 4, 15, 164, 8, 15, 11, 15, 12, 15, 165, 1, 16, 1, 16, 1, 16,
		1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1,
		16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 5, 16, 189, 8, 16,
		10, 16, 12, 16, 192, 9, 16, 1, 16, 3, 16, 195, 8, 16, 1, 17, 1, 17, 1,
		17, 0, 2, 18, 20, 18, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26,
		28, 30, 32, 34, 0, 3, 1, 0, 6, 12, 1, 0, 13, 14, 1, 0, 15, 17, 222, 0,
		36, 1, 0, 0, 0, 2, 39, 1, 0, 0, 0, 4, 41, 1, 0, 0, 0, 6, 49, 1, 0, 0, 0,
		8, 69, 1, 0, 0, 0, 10, 93, 1, 0, 0, 0, 12, 95, 1, 0, 0, 0, 14, 97, 1, 0,
		0, 0, 16, 106, 1, 0, 0, 0, 18, 110, 1, 0, 0, 0, 20, 121, 1, 0, 0, 0, 22,
		139, 1, 0, 0, 0, 24, 145, 1, 0, 0, 0, 26, 147, 1, 0, 0, 0, 28, 154, 1,
		0, 0, 0, 30, 163, 1, 0, 0, 0, 32, 194, 1, 0, 0, 0, 34, 196, 1, 0, 0, 0,
		36, 37, 3, 2, 1, 0, 37, 38, 5, 0, 0, 1, 38, 1, 1, 0, 0, 0, 39, 40, 3, 4,
		2, 0, 40, 3, 1, 0, 0, 0, 41, 46, 3, 6, 3, 0, 42, 43, 5, 20, 0, 0, 43, 45,
		3, 6, 3, 0, 44, 42, 1, 0, 0, 0, 45, 48, 1, 0, 0, 0, 46, 44, 1, 0, 0, 0,
		46, 47, 1, 0, 0, 0, 47, 5, 1, 0, 0, 0, 48, 46, 1, 0, 0, 0, 49, 55, 3, 8,
		4, 0, 50, 51, 5, 19, 0, 0, 51, 54, 3, 8, 4, 0, 52, 54, 3, 8, 4, 0, 53,
		50, 1, 0, 0, 0, 53, 52, 1, 0, 0, 0, 54, 57, 1, 0, 0, 0, 55, 53, 1, 0, 0,
		0, 55, 56, 1, 0, 0, 0, 56, 7, 1, 0, 0, 0, 57, 55, 1, 0, 0, 0, 58, 60, 5,
		18, 0, 0, 59, 58, 1, 0, 0, 0, 59, 60, 1, 0, 0, 0, 60, 61, 1, 0, 0, 0, 61,
		62, 5, 1, 0, 0, 62, 63, 3, 4, 2, 0, 63, 64, 5, 2, 0, 0, 64, 70, 1, 0, 0,
		0, 65, 67, 5, 18, 0, 0, 66, 65, 1, 0, 0, 0, 66, 67, 1, 0, 0, 0, 67, 68,
		1, 0, 0, 0, 68, 70, 3, 10, 5, 0, 69, 59, 1, 0, 0, 0, 69, 66, 1, 0, 0, 0,
		70, 9, 1, 0, 0, 0, 71, 72, 3, 18, 9, 0, 72, 73, 3, 12, 6, 0, 73, 74, 3,
		18, 9, 0, 74, 94, 1, 0, 0, 0, 75, 77, 3, 18, 9, 0, 76, 78, 5, 18, 0, 0,
		77, 76, 1, 0, 0, 0, 77, 78, 1, 0, 0, 0, 78, 79, 1, 0, 0, 0, 79, 80, 5,
		21, 0, 0, 80, 81, 5, 1, 0, 0, 81, 82, 3, 14, 7, 0, 82, 83, 5, 2, 0, 0,
		83, 94, 1, 0, 0, 0, 84, 86, 3, 18, 9, 0, 85, 87, 5, 18, 0, 0, 86, 85, 1,
		0, 0, 0, 86, 87, 1, 0, 0, 0, 87, 88, 1, 0, 0, 0, 88, 89, 5, 21, 0, 0, 89,
		90, 5, 3, 0, 0, 90, 91, 3, 14, 7, 0, 91, 92, 5, 4, 0, 0, 92, 94, 1, 0,
		0, 0, 93, 71, 1, 0, 0, 0, 93, 75, 1, 0, 0, 0, 93, 84, 1, 0, 0, 0, 94, 11,
		1, 0, 0, 0, 95, 96, 7, 0, 0, 0, 96, 13, 1, 0, 0, 0, 97, 102, 3, 16, 8,
		0, 98, 99, 5, 5, 0, 0, 99, 101, 3, 16, 8, 0, 100, 98, 1, 0, 0, 0, 101,
		104, 1, 0, 0, 0, 102, 100, 1, 0, 0, 0, 102, 103, 1, 0, 0, 0, 103, 15, 1,
		0, 0, 0, 104, 102, 1, 0, 0, 0, 105, 107, 7, 1, 0, 0, 106, 105, 1, 0, 0,
		0, 106, 107, 1, 0, 0, 0, 107, 108, 1, 0, 0, 0, 108, 109, 5, 23, 0, 0, 109,
		17, 1, 0, 0, 0, 110, 111, 6, 9, -1, 0, 111, 112, 3, 20, 10, 0, 112, 118,
		1, 0, 0, 0, 113, 114, 10, 2, 0, 0, 114, 115, 7, 1, 0, 0, 115, 117, 3, 20,
		10, 0, 116, 113, 1, 0, 0, 0, 117, 120, 1, 0, 0, 0, 118, 116, 1, 0, 0, 0,
		118, 119, 1, 0, 0, 0, 119, 19, 1, 0, 0, 0, 120, 118, 1, 0, 0, 0, 121, 122,
		6, 10, -1, 0, 122, 123, 3, 22, 11, 0, 123, 129, 1, 0, 0, 0, 124, 125, 10,
		2, 0, 0, 125, 126, 7, 2, 0, 0, 126, 128, 3, 22, 11, 0, 127, 124, 1, 0,
		0, 0, 128, 131, 1, 0, 0, 0, 129, 127, 1, 0, 0, 0, 129, 130, 1, 0, 0, 0,
		130, 21, 1, 0, 0, 0, 131, 129, 1, 0, 0, 0, 132, 133, 7, 1, 0, 0, 133, 140,
		3, 22, 11, 0, 134, 135, 5, 1, 0, 0, 135, 136, 3, 18, 9, 0, 136, 137, 5,
		2, 0, 0, 137, 140, 1, 0, 0, 0, 138, 140, 3, 24, 12, 0, 139, 132, 1, 0,
		0, 0, 139, 134, 1, 0, 0, 0, 139, 138, 1, 0, 0, 0, 140, 23, 1, 0, 0, 0,
		141, 146, 3, 26, 13, 0, 142, 146, 3, 34, 17, 0, 143, 146, 5, 23, 0, 0,
		144, 146, 5, 25, 0, 0, 145, 141, 1, 0, 0, 0, 145, 142, 1, 0, 0, 0, 145,
		143, 1, 0, 0, 0, 145, 144, 1, 0, 0, 0, 146, 25, 1, 0, 0, 0, 147, 148, 5,
		24, 0, 0, 148, 150, 5, 1, 0, 0, 149, 151, 3, 28, 14, 0, 150, 149, 1, 0,
		0, 0, 150, 151, 1, 0, 0, 0, 151, 152, 1, 0, 0, 0, 152, 153, 5, 2, 0, 0,
		153, 27, 1, 0, 0, 0, 154, 159, 3, 30, 15, 0, 155, 156, 5, 5, 0, 0, 156,
		158, 3, 30, 15, 0, 157, 155, 1, 0, 0, 0, 158, 161, 1, 0, 0, 0, 159, 157,
		1, 0, 0, 0, 159, 160, 1, 0, 0, 0, 160, 29, 1, 0, 0, 0, 161, 159, 1, 0,
		0, 0, 162, 164, 3, 32, 16, 0, 163, 162, 1, 0, 0, 0, 164, 165, 1, 0, 0,
		0, 165, 163, 1, 0, 0, 0, 165, 166, 1, 0, 0, 0, 166, 31, 1, 0, 0, 0, 167,
		195, 5, 24, 0, 0, 168, 195, 5, 25, 0, 0, 169, 195, 5, 23, 0, 0, 170, 195,
		5, 22, 0, 0, 171, 195, 5, 6, 0, 0, 172, 195, 5, 7, 0, 0, 173, 195, 5, 8,
		0, 0, 174, 195, 5, 9, 0, 0, 175, 195, 5, 10, 0, 0, 176, 195, 5, 11, 0,
		0, 177, 195, 5, 12, 0, 0, 178, 195, 5, 13, 0, 0, 179, 195, 5, 14, 0, 0,
		180, 195, 5, 15, 0, 0, 181, 195, 5, 16, 0, 0, 182, 195, 5, 17, 0, 0, 183,
		195, 5, 18, 0, 0, 184, 195, 5, 19, 0, 0, 185, 195, 5, 20, 0, 0, 186, 190,
		5, 1, 0, 0, 187, 189, 3, 32, 16, 0, 188, 187, 1, 0, 0, 0, 189, 192, 1,
		0, 0, 0, 190, 188, 1, 0, 0, 0, 190, 191, 1, 0, 0, 0, 191, 193, 1, 0, 0,
		0, 192, 190, 1, 0, 0, 0, 193, 195, 5, 2, 0, 0, 194, 167, 1, 0, 0, 0, 194,
		168, 1, 0, 0, 0, 194, 169, 1, 0, 0, 0, 194, 170, 1, 0, 0, 0, 194, 171,
		1, 0, 0, 0, 194, 172, 1, 0, 0, 0, 194, 173, 1, 0, 0, 0, 194, 174, 1, 0,
		0, 0, 194, 175, 1, 0, 0, 0, 194, 176, 1, 0, 0, 0, 194, 177, 1, 0, 0, 0,
		194, 178, 1, 0, 0, 0, 194, 179, 1, 0, 0, 0, 194, 180, 1, 0, 0, 0, 194,
		181, 1, 0, 0, 0, 194, 182, 1, 0, 0, 0, 194, 183, 1, 0, 0, 0, 194, 184,
		1, 0, 0, 0, 194, 185, 1, 0, 0, 0, 194, 186, 1, 0, 0, 0, 195, 33, 1, 0,
		0, 0, 196, 197, 5, 24, 0, 0, 197, 35, 1, 0, 0, 0, 20, 46, 53, 55, 59, 66,
		69, 77, 86, 93, 102, 106, 118, 129, 139, 145, 150, 159, 165, 190, 194,
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
	HavingExpressionParserLBRACK     = 3
	HavingExpressionParserRBRACK     = 4
	HavingExpressionParserCOMMA      = 5
	HavingExpressionParserEQUALS     = 6
	HavingExpressionParserNOT_EQUALS = 7
	HavingExpressionParserNEQ        = 8
	HavingExpressionParserLT         = 9
	HavingExpressionParserLE         = 10
	HavingExpressionParserGT         = 11
	HavingExpressionParserGE         = 12
	HavingExpressionParserPLUS       = 13
	HavingExpressionParserMINUS      = 14
	HavingExpressionParserSTAR       = 15
	HavingExpressionParserSLASH      = 16
	HavingExpressionParserPERCENT    = 17
	HavingExpressionParserNOT        = 18
	HavingExpressionParserAND        = 19
	HavingExpressionParserOR         = 20
	HavingExpressionParserIN         = 21
	HavingExpressionParserBOOL       = 22
	HavingExpressionParserNUMBER     = 23
	HavingExpressionParserIDENTIFIER = 24
	HavingExpressionParserSTRING     = 25
	HavingExpressionParserWS         = 26
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
	HavingExpressionParserRULE_signedNumber    = 8
	HavingExpressionParserRULE_operand         = 9
	HavingExpressionParserRULE_term            = 10
	HavingExpressionParserRULE_factor          = 11
	HavingExpressionParserRULE_atom            = 12
	HavingExpressionParserRULE_functionCall    = 13
	HavingExpressionParserRULE_functionArgList = 14
	HavingExpressionParserRULE_funcArg         = 15
	HavingExpressionParserRULE_funcArgToken    = 16
	HavingExpressionParserRULE_identifier      = 17
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
		p.SetState(36)
		p.Expression()
	}
	{
		p.SetState(37)
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
		p.SetState(39)
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
		p.SetState(41)
		p.AndExpression()
	}
	p.SetState(46)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserOR {
		{
			p.SetState(42)
			p.Match(HavingExpressionParserOR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(43)
			p.AndExpression()
		}

		p.SetState(48)
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
		p.SetState(49)
		p.Primary()
	}
	p.SetState(55)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&59531266) != 0 {
		p.SetState(53)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}

		switch p.GetTokenStream().LA(1) {
		case HavingExpressionParserAND:
			{
				p.SetState(50)
				p.Match(HavingExpressionParserAND)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}
			{
				p.SetState(51)
				p.Primary()
			}

		case HavingExpressionParserLPAREN, HavingExpressionParserPLUS, HavingExpressionParserMINUS, HavingExpressionParserNOT, HavingExpressionParserNUMBER, HavingExpressionParserIDENTIFIER, HavingExpressionParserSTRING:
			{
				p.SetState(52)
				p.Primary()
			}

		default:
			p.SetError(antlr.NewNoViableAltException(p, nil, nil, nil, nil, nil))
			goto errorExit
		}

		p.SetState(57)
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

	p.SetState(69)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 5, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		p.SetState(59)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(58)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(61)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(62)
			p.OrExpression()
		}
		{
			p.SetState(63)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		p.SetState(66)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(65)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(68)
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
	LBRACK() antlr.TerminalNode
	RBRACK() antlr.TerminalNode

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

func (s *ComparisonContext) LBRACK() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserLBRACK, 0)
}

func (s *ComparisonContext) RBRACK() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserRBRACK, 0)
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

	p.SetState(93)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 8, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(71)
			p.operand(0)
		}
		{
			p.SetState(72)
			p.CompOp()
		}
		{
			p.SetState(73)
			p.operand(0)
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(75)
			p.operand(0)
		}
		p.SetState(77)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(76)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(79)
			p.Match(HavingExpressionParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(80)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(81)
			p.InList()
		}
		{
			p.SetState(82)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(84)
			p.operand(0)
		}
		p.SetState(86)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		if _la == HavingExpressionParserNOT {
			{
				p.SetState(85)
				p.Match(HavingExpressionParserNOT)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}

		}
		{
			p.SetState(88)
			p.Match(HavingExpressionParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(89)
			p.Match(HavingExpressionParserLBRACK)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(90)
			p.InList()
		}
		{
			p.SetState(91)
			p.Match(HavingExpressionParserRBRACK)
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
		p.SetState(95)
		_la = p.GetTokenStream().LA(1)

		if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&8128) != 0) {
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
	AllSignedNumber() []ISignedNumberContext
	SignedNumber(i int) ISignedNumberContext
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

func (s *InListContext) AllSignedNumber() []ISignedNumberContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(ISignedNumberContext); ok {
			len++
		}
	}

	tst := make([]ISignedNumberContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(ISignedNumberContext); ok {
			tst[i] = t.(ISignedNumberContext)
			i++
		}
	}

	return tst
}

func (s *InListContext) SignedNumber(i int) ISignedNumberContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(ISignedNumberContext); ok {
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

	return t.(ISignedNumberContext)
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
		p.SetState(97)
		p.SignedNumber()
	}
	p.SetState(102)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserCOMMA {
		{
			p.SetState(98)
			p.Match(HavingExpressionParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(99)
			p.SignedNumber()
		}

		p.SetState(104)
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

// ISignedNumberContext is an interface to support dynamic dispatch.
type ISignedNumberContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	NUMBER() antlr.TerminalNode
	PLUS() antlr.TerminalNode
	MINUS() antlr.TerminalNode

	// IsSignedNumberContext differentiates from other interfaces.
	IsSignedNumberContext()
}

type SignedNumberContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptySignedNumberContext() *SignedNumberContext {
	var p = new(SignedNumberContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_signedNumber
	return p
}

func InitEmptySignedNumberContext(p *SignedNumberContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = HavingExpressionParserRULE_signedNumber
}

func (*SignedNumberContext) IsSignedNumberContext() {}

func NewSignedNumberContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *SignedNumberContext {
	var p = new(SignedNumberContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = HavingExpressionParserRULE_signedNumber

	return p
}

func (s *SignedNumberContext) GetParser() antlr.Parser { return s.parser }

func (s *SignedNumberContext) NUMBER() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserNUMBER, 0)
}

func (s *SignedNumberContext) PLUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserPLUS, 0)
}

func (s *SignedNumberContext) MINUS() antlr.TerminalNode {
	return s.GetToken(HavingExpressionParserMINUS, 0)
}

func (s *SignedNumberContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *SignedNumberContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *SignedNumberContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.EnterSignedNumber(s)
	}
}

func (s *SignedNumberContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(HavingExpressionListener); ok {
		listenerT.ExitSignedNumber(s)
	}
}

func (s *SignedNumberContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case HavingExpressionVisitor:
		return t.VisitSignedNumber(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *HavingExpressionParser) SignedNumber() (localctx ISignedNumberContext) {
	localctx = NewSignedNumberContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 16, HavingExpressionParserRULE_signedNumber)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	p.SetState(106)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	if _la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS {
		{
			p.SetState(105)
			_la = p.GetTokenStream().LA(1)

			if !(_la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}

	}
	{
		p.SetState(108)
		p.Match(HavingExpressionParserNUMBER)
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
	_startState := 18
	p.EnterRecursionRule(localctx, 18, HavingExpressionParserRULE_operand, _p)
	var _la int

	var _alt int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(111)
		p.term(0)
	}

	p.GetParserRuleContext().SetStop(p.GetTokenStream().LT(-1))
	p.SetState(118)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 11, p.GetParserRuleContext())
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
			p.SetState(113)

			if !(p.Precpred(p.GetParserRuleContext(), 2)) {
				p.SetError(antlr.NewFailedPredicateException(p, "p.Precpred(p.GetParserRuleContext(), 2)", ""))
				goto errorExit
			}
			{
				p.SetState(114)
				_la = p.GetTokenStream().LA(1)

				if !(_la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS) {
					p.GetErrorHandler().RecoverInline(p)
				} else {
					p.GetErrorHandler().ReportMatch(p)
					p.Consume()
				}
			}
			{
				p.SetState(115)
				p.term(0)
			}

		}
		p.SetState(120)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 11, p.GetParserRuleContext())
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
	_startState := 20
	p.EnterRecursionRule(localctx, 20, HavingExpressionParserRULE_term, _p)
	var _la int

	var _alt int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(122)
		p.Factor()
	}

	p.GetParserRuleContext().SetStop(p.GetTokenStream().LT(-1))
	p.SetState(129)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 12, p.GetParserRuleContext())
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
			p.SetState(124)

			if !(p.Precpred(p.GetParserRuleContext(), 2)) {
				p.SetError(antlr.NewFailedPredicateException(p, "p.Precpred(p.GetParserRuleContext(), 2)", ""))
				goto errorExit
			}
			{
				p.SetState(125)
				_la = p.GetTokenStream().LA(1)

				if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&229376) != 0) {
					p.GetErrorHandler().RecoverInline(p)
				} else {
					p.GetErrorHandler().ReportMatch(p)
					p.Consume()
				}
			}
			{
				p.SetState(126)
				p.Factor()
			}

		}
		p.SetState(131)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_alt = p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 12, p.GetParserRuleContext())
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
	p.EnterRule(localctx, 22, HavingExpressionParserRULE_factor)
	var _la int

	p.SetState(139)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetTokenStream().LA(1) {
	case HavingExpressionParserPLUS, HavingExpressionParserMINUS:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(132)
			_la = p.GetTokenStream().LA(1)

			if !(_la == HavingExpressionParserPLUS || _la == HavingExpressionParserMINUS) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}
		{
			p.SetState(133)
			p.Factor()
		}

	case HavingExpressionParserLPAREN:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(134)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(135)
			p.operand(0)
		}
		{
			p.SetState(136)
			p.Match(HavingExpressionParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNUMBER, HavingExpressionParserIDENTIFIER, HavingExpressionParserSTRING:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(138)
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
	p.EnterRule(localctx, 24, HavingExpressionParserRULE_atom)
	p.SetState(145)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 14, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(141)
			p.FunctionCall()
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(142)
			p.Identifier()
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(143)
			p.Match(HavingExpressionParserNUMBER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 4:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(144)
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
	p.EnterRule(localctx, 26, HavingExpressionParserRULE_functionCall)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(147)
		p.Match(HavingExpressionParserIDENTIFIER)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	{
		p.SetState(148)
		p.Match(HavingExpressionParserLPAREN)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	p.SetState(150)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	if (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&65011650) != 0 {
		{
			p.SetState(149)
			p.FunctionArgList()
		}

	}
	{
		p.SetState(152)
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
	p.EnterRule(localctx, 28, HavingExpressionParserRULE_functionArgList)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(154)
		p.FuncArg()
	}
	p.SetState(159)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == HavingExpressionParserCOMMA {
		{
			p.SetState(155)
			p.Match(HavingExpressionParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(156)
			p.FuncArg()
		}

		p.SetState(161)
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
	p.EnterRule(localctx, 30, HavingExpressionParserRULE_funcArg)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	p.SetState(163)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for ok := true; ok; ok = ((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&65011650) != 0) {
		{
			p.SetState(162)
			p.FuncArgToken()
		}

		p.SetState(165)
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
	p.EnterRule(localctx, 32, HavingExpressionParserRULE_funcArgToken)
	var _la int

	p.SetState(194)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetTokenStream().LA(1) {
	case HavingExpressionParserIDENTIFIER:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(167)
			p.Match(HavingExpressionParserIDENTIFIER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSTRING:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(168)
			p.Match(HavingExpressionParserSTRING)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNUMBER:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(169)
			p.Match(HavingExpressionParserNUMBER)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserBOOL:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(170)
			p.Match(HavingExpressionParserBOOL)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserEQUALS:
		p.EnterOuterAlt(localctx, 5)
		{
			p.SetState(171)
			p.Match(HavingExpressionParserEQUALS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNOT_EQUALS:
		p.EnterOuterAlt(localctx, 6)
		{
			p.SetState(172)
			p.Match(HavingExpressionParserNOT_EQUALS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNEQ:
		p.EnterOuterAlt(localctx, 7)
		{
			p.SetState(173)
			p.Match(HavingExpressionParserNEQ)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLT:
		p.EnterOuterAlt(localctx, 8)
		{
			p.SetState(174)
			p.Match(HavingExpressionParserLT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLE:
		p.EnterOuterAlt(localctx, 9)
		{
			p.SetState(175)
			p.Match(HavingExpressionParserLE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserGT:
		p.EnterOuterAlt(localctx, 10)
		{
			p.SetState(176)
			p.Match(HavingExpressionParserGT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserGE:
		p.EnterOuterAlt(localctx, 11)
		{
			p.SetState(177)
			p.Match(HavingExpressionParserGE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserPLUS:
		p.EnterOuterAlt(localctx, 12)
		{
			p.SetState(178)
			p.Match(HavingExpressionParserPLUS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserMINUS:
		p.EnterOuterAlt(localctx, 13)
		{
			p.SetState(179)
			p.Match(HavingExpressionParserMINUS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSTAR:
		p.EnterOuterAlt(localctx, 14)
		{
			p.SetState(180)
			p.Match(HavingExpressionParserSTAR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserSLASH:
		p.EnterOuterAlt(localctx, 15)
		{
			p.SetState(181)
			p.Match(HavingExpressionParserSLASH)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserPERCENT:
		p.EnterOuterAlt(localctx, 16)
		{
			p.SetState(182)
			p.Match(HavingExpressionParserPERCENT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserNOT:
		p.EnterOuterAlt(localctx, 17)
		{
			p.SetState(183)
			p.Match(HavingExpressionParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserAND:
		p.EnterOuterAlt(localctx, 18)
		{
			p.SetState(184)
			p.Match(HavingExpressionParserAND)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserOR:
		p.EnterOuterAlt(localctx, 19)
		{
			p.SetState(185)
			p.Match(HavingExpressionParserOR)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case HavingExpressionParserLPAREN:
		p.EnterOuterAlt(localctx, 20)
		{
			p.SetState(186)
			p.Match(HavingExpressionParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		p.SetState(190)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}
		_la = p.GetTokenStream().LA(1)

		for (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&65011650) != 0 {
			{
				p.SetState(187)
				p.FuncArgToken()
			}

			p.SetState(192)
			p.GetErrorHandler().Sync(p)
			if p.HasError() {
				goto errorExit
			}
			_la = p.GetTokenStream().LA(1)
		}
		{
			p.SetState(193)
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
	p.EnterRule(localctx, 34, HavingExpressionParserRULE_identifier)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(196)
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
	case 9:
		var t *OperandContext = nil
		if localctx != nil {
			t = localctx.(*OperandContext)
		}
		return p.Operand_Sempred(t, predIndex)

	case 10:
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
