// Code generated from grammar/FilterQuery.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser // FilterQuery

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

type FilterQueryParser struct {
	*antlr.BaseParser
}

var FilterQueryParserStaticData struct {
	once                   sync.Once
	serializedATN          []int32
	LiteralNames           []string
	SymbolicNames          []string
	RuleNames              []string
	PredictionContextCache *antlr.PredictionContextCache
	atn                    *antlr.ATN
	decisionToDFA          []*antlr.DFA
}

func filterqueryParserInit() {
	staticData := &FilterQueryParserStaticData
	staticData.LiteralNames = []string{
		"", "'('", "')'", "'['", "']'", "','", "", "'!='", "'<>'", "'<'", "'<='",
		"'>'", "'>='",
	}
	staticData.SymbolicNames = []string{
		"", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "EQUALS", "NOT_EQUALS",
		"NEQ", "LT", "LE", "GT", "GE", "LIKE", "NOT_LIKE", "ILIKE", "NOT_ILIKE",
		"BETWEEN", "EXISTS", "REGEXP", "CONTAINS", "IN", "NOT", "AND", "OR",
		"HAS", "HASANY", "HASALL", "HASNONE", "BOOL", "NUMBER", "QUOTED_TEXT",
		"KEY", "WS", "FREETEXT",
	}
	staticData.RuleNames = []string{
		"query", "expression", "orExpression", "andExpression", "unaryExpression",
		"primary", "comparison", "inClause", "notInClause", "valueList", "fullText",
		"functionCall", "functionParamList", "functionParam", "array", "value",
		"key",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 1, 34, 212, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7,
		4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2, 10, 7,
		10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15, 7, 15,
		2, 16, 7, 16, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 5, 2, 43,
		8, 2, 10, 2, 12, 2, 46, 9, 2, 1, 3, 1, 3, 1, 3, 1, 3, 5, 3, 52, 8, 3, 10,
		3, 12, 3, 55, 9, 3, 1, 4, 3, 4, 58, 8, 4, 1, 4, 1, 4, 1, 5, 1, 5, 1, 5,
		1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 3, 5, 70, 8, 5, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1,
		6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 3,
		6, 148, 8, 6, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1,
		7, 3, 7, 160, 8, 7, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1,
		8, 1, 8, 1, 8, 1, 8, 3, 8, 174, 8, 8, 1, 9, 1, 9, 1, 9, 5, 9, 179, 8, 9,
		10, 9, 12, 9, 182, 9, 9, 1, 10, 1, 10, 1, 11, 1, 11, 1, 11, 1, 11, 1, 11,
		1, 12, 1, 12, 1, 12, 5, 12, 194, 8, 12, 10, 12, 12, 12, 197, 9, 12, 1,
		13, 1, 13, 1, 13, 3, 13, 202, 8, 13, 1, 14, 1, 14, 1, 14, 1, 14, 1, 15,
		1, 15, 1, 16, 1, 16, 1, 16, 0, 0, 17, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18,
		20, 22, 24, 26, 28, 30, 32, 0, 6, 1, 0, 7, 8, 2, 0, 13, 13, 15, 15, 2,
		0, 14, 14, 16, 16, 2, 0, 31, 31, 34, 34, 1, 0, 25, 28, 1, 0, 29, 32, 225,
		0, 34, 1, 0, 0, 0, 2, 37, 1, 0, 0, 0, 4, 39, 1, 0, 0, 0, 6, 47, 1, 0, 0,
		0, 8, 57, 1, 0, 0, 0, 10, 69, 1, 0, 0, 0, 12, 147, 1, 0, 0, 0, 14, 159,
		1, 0, 0, 0, 16, 173, 1, 0, 0, 0, 18, 175, 1, 0, 0, 0, 20, 183, 1, 0, 0,
		0, 22, 185, 1, 0, 0, 0, 24, 190, 1, 0, 0, 0, 26, 201, 1, 0, 0, 0, 28, 203,
		1, 0, 0, 0, 30, 207, 1, 0, 0, 0, 32, 209, 1, 0, 0, 0, 34, 35, 3, 2, 1,
		0, 35, 36, 5, 0, 0, 1, 36, 1, 1, 0, 0, 0, 37, 38, 3, 4, 2, 0, 38, 3, 1,
		0, 0, 0, 39, 44, 3, 6, 3, 0, 40, 41, 5, 24, 0, 0, 41, 43, 3, 6, 3, 0, 42,
		40, 1, 0, 0, 0, 43, 46, 1, 0, 0, 0, 44, 42, 1, 0, 0, 0, 44, 45, 1, 0, 0,
		0, 45, 5, 1, 0, 0, 0, 46, 44, 1, 0, 0, 0, 47, 53, 3, 8, 4, 0, 48, 49, 5,
		23, 0, 0, 49, 52, 3, 8, 4, 0, 50, 52, 3, 8, 4, 0, 51, 48, 1, 0, 0, 0, 51,
		50, 1, 0, 0, 0, 52, 55, 1, 0, 0, 0, 53, 51, 1, 0, 0, 0, 53, 54, 1, 0, 0,
		0, 54, 7, 1, 0, 0, 0, 55, 53, 1, 0, 0, 0, 56, 58, 5, 22, 0, 0, 57, 56,
		1, 0, 0, 0, 57, 58, 1, 0, 0, 0, 58, 59, 1, 0, 0, 0, 59, 60, 3, 10, 5, 0,
		60, 9, 1, 0, 0, 0, 61, 62, 5, 1, 0, 0, 62, 63, 3, 4, 2, 0, 63, 64, 5, 2,
		0, 0, 64, 70, 1, 0, 0, 0, 65, 70, 3, 12, 6, 0, 66, 70, 3, 22, 11, 0, 67,
		70, 3, 20, 10, 0, 68, 70, 3, 32, 16, 0, 69, 61, 1, 0, 0, 0, 69, 65, 1,
		0, 0, 0, 69, 66, 1, 0, 0, 0, 69, 67, 1, 0, 0, 0, 69, 68, 1, 0, 0, 0, 70,
		11, 1, 0, 0, 0, 71, 72, 3, 32, 16, 0, 72, 73, 5, 6, 0, 0, 73, 74, 3, 30,
		15, 0, 74, 148, 1, 0, 0, 0, 75, 76, 3, 32, 16, 0, 76, 77, 7, 0, 0, 0, 77,
		78, 3, 30, 15, 0, 78, 148, 1, 0, 0, 0, 79, 80, 3, 32, 16, 0, 80, 81, 5,
		9, 0, 0, 81, 82, 3, 30, 15, 0, 82, 148, 1, 0, 0, 0, 83, 84, 3, 32, 16,
		0, 84, 85, 5, 10, 0, 0, 85, 86, 3, 30, 15, 0, 86, 148, 1, 0, 0, 0, 87,
		88, 3, 32, 16, 0, 88, 89, 5, 11, 0, 0, 89, 90, 3, 30, 15, 0, 90, 148, 1,
		0, 0, 0, 91, 92, 3, 32, 16, 0, 92, 93, 5, 12, 0, 0, 93, 94, 3, 30, 15,
		0, 94, 148, 1, 0, 0, 0, 95, 96, 3, 32, 16, 0, 96, 97, 7, 1, 0, 0, 97, 98,
		3, 30, 15, 0, 98, 148, 1, 0, 0, 0, 99, 100, 3, 32, 16, 0, 100, 101, 7,
		2, 0, 0, 101, 102, 3, 30, 15, 0, 102, 148, 1, 0, 0, 0, 103, 104, 3, 32,
		16, 0, 104, 105, 5, 17, 0, 0, 105, 106, 3, 30, 15, 0, 106, 107, 5, 23,
		0, 0, 107, 108, 3, 30, 15, 0, 108, 148, 1, 0, 0, 0, 109, 110, 3, 32, 16,
		0, 110, 111, 5, 22, 0, 0, 111, 112, 5, 17, 0, 0, 112, 113, 3, 30, 15, 0,
		113, 114, 5, 23, 0, 0, 114, 115, 3, 30, 15, 0, 115, 148, 1, 0, 0, 0, 116,
		117, 3, 32, 16, 0, 117, 118, 3, 14, 7, 0, 118, 148, 1, 0, 0, 0, 119, 120,
		3, 32, 16, 0, 120, 121, 3, 16, 8, 0, 121, 148, 1, 0, 0, 0, 122, 123, 3,
		32, 16, 0, 123, 124, 5, 18, 0, 0, 124, 148, 1, 0, 0, 0, 125, 126, 3, 32,
		16, 0, 126, 127, 5, 22, 0, 0, 127, 128, 5, 18, 0, 0, 128, 148, 1, 0, 0,
		0, 129, 130, 3, 32, 16, 0, 130, 131, 5, 19, 0, 0, 131, 132, 3, 30, 15,
		0, 132, 148, 1, 0, 0, 0, 133, 134, 3, 32, 16, 0, 134, 135, 5, 22, 0, 0,
		135, 136, 5, 19, 0, 0, 136, 137, 3, 30, 15, 0, 137, 148, 1, 0, 0, 0, 138,
		139, 3, 32, 16, 0, 139, 140, 5, 20, 0, 0, 140, 141, 3, 30, 15, 0, 141,
		148, 1, 0, 0, 0, 142, 143, 3, 32, 16, 0, 143, 144, 5, 22, 0, 0, 144, 145,
		5, 20, 0, 0, 145, 146, 3, 30, 15, 0, 146, 148, 1, 0, 0, 0, 147, 71, 1,
		0, 0, 0, 147, 75, 1, 0, 0, 0, 147, 79, 1, 0, 0, 0, 147, 83, 1, 0, 0, 0,
		147, 87, 1, 0, 0, 0, 147, 91, 1, 0, 0, 0, 147, 95, 1, 0, 0, 0, 147, 99,
		1, 0, 0, 0, 147, 103, 1, 0, 0, 0, 147, 109, 1, 0, 0, 0, 147, 116, 1, 0,
		0, 0, 147, 119, 1, 0, 0, 0, 147, 122, 1, 0, 0, 0, 147, 125, 1, 0, 0, 0,
		147, 129, 1, 0, 0, 0, 147, 133, 1, 0, 0, 0, 147, 138, 1, 0, 0, 0, 147,
		142, 1, 0, 0, 0, 148, 13, 1, 0, 0, 0, 149, 150, 5, 21, 0, 0, 150, 151,
		5, 1, 0, 0, 151, 152, 3, 18, 9, 0, 152, 153, 5, 2, 0, 0, 153, 160, 1, 0,
		0, 0, 154, 155, 5, 21, 0, 0, 155, 156, 5, 3, 0, 0, 156, 157, 3, 18, 9,
		0, 157, 158, 5, 4, 0, 0, 158, 160, 1, 0, 0, 0, 159, 149, 1, 0, 0, 0, 159,
		154, 1, 0, 0, 0, 160, 15, 1, 0, 0, 0, 161, 162, 5, 22, 0, 0, 162, 163,
		5, 21, 0, 0, 163, 164, 5, 1, 0, 0, 164, 165, 3, 18, 9, 0, 165, 166, 5,
		2, 0, 0, 166, 174, 1, 0, 0, 0, 167, 168, 5, 22, 0, 0, 168, 169, 5, 21,
		0, 0, 169, 170, 5, 3, 0, 0, 170, 171, 3, 18, 9, 0, 171, 172, 5, 4, 0, 0,
		172, 174, 1, 0, 0, 0, 173, 161, 1, 0, 0, 0, 173, 167, 1, 0, 0, 0, 174,
		17, 1, 0, 0, 0, 175, 180, 3, 30, 15, 0, 176, 177, 5, 5, 0, 0, 177, 179,
		3, 30, 15, 0, 178, 176, 1, 0, 0, 0, 179, 182, 1, 0, 0, 0, 180, 178, 1,
		0, 0, 0, 180, 181, 1, 0, 0, 0, 181, 19, 1, 0, 0, 0, 182, 180, 1, 0, 0,
		0, 183, 184, 7, 3, 0, 0, 184, 21, 1, 0, 0, 0, 185, 186, 7, 4, 0, 0, 186,
		187, 5, 1, 0, 0, 187, 188, 3, 24, 12, 0, 188, 189, 5, 2, 0, 0, 189, 23,
		1, 0, 0, 0, 190, 195, 3, 26, 13, 0, 191, 192, 5, 5, 0, 0, 192, 194, 3,
		26, 13, 0, 193, 191, 1, 0, 0, 0, 194, 197, 1, 0, 0, 0, 195, 193, 1, 0,
		0, 0, 195, 196, 1, 0, 0, 0, 196, 25, 1, 0, 0, 0, 197, 195, 1, 0, 0, 0,
		198, 202, 3, 32, 16, 0, 199, 202, 3, 30, 15, 0, 200, 202, 3, 28, 14, 0,
		201, 198, 1, 0, 0, 0, 201, 199, 1, 0, 0, 0, 201, 200, 1, 0, 0, 0, 202,
		27, 1, 0, 0, 0, 203, 204, 5, 3, 0, 0, 204, 205, 3, 18, 9, 0, 205, 206,
		5, 4, 0, 0, 206, 29, 1, 0, 0, 0, 207, 208, 7, 5, 0, 0, 208, 31, 1, 0, 0,
		0, 209, 210, 5, 32, 0, 0, 210, 33, 1, 0, 0, 0, 11, 44, 51, 53, 57, 69,
		147, 159, 173, 180, 195, 201,
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

// FilterQueryParserInit initializes any static state used to implement FilterQueryParser. By default the
// static state used to implement the parser is lazily initialized during the first call to
// NewFilterQueryParser(). You can call this function if you wish to initialize the static state ahead
// of time.
func FilterQueryParserInit() {
	staticData := &FilterQueryParserStaticData
	staticData.once.Do(filterqueryParserInit)
}

// NewFilterQueryParser produces a new parser instance for the optional input antlr.TokenStream.
func NewFilterQueryParser(input antlr.TokenStream) *FilterQueryParser {
	FilterQueryParserInit()
	this := new(FilterQueryParser)
	this.BaseParser = antlr.NewBaseParser(input)
	staticData := &FilterQueryParserStaticData
	this.Interpreter = antlr.NewParserATNSimulator(this, staticData.atn, staticData.decisionToDFA, staticData.PredictionContextCache)
	this.RuleNames = staticData.RuleNames
	this.LiteralNames = staticData.LiteralNames
	this.SymbolicNames = staticData.SymbolicNames
	this.GrammarFileName = "FilterQuery.g4"

	return this
}

// FilterQueryParser tokens.
const (
	FilterQueryParserEOF         = antlr.TokenEOF
	FilterQueryParserLPAREN      = 1
	FilterQueryParserRPAREN      = 2
	FilterQueryParserLBRACK      = 3
	FilterQueryParserRBRACK      = 4
	FilterQueryParserCOMMA       = 5
	FilterQueryParserEQUALS      = 6
	FilterQueryParserNOT_EQUALS  = 7
	FilterQueryParserNEQ         = 8
	FilterQueryParserLT          = 9
	FilterQueryParserLE          = 10
	FilterQueryParserGT          = 11
	FilterQueryParserGE          = 12
	FilterQueryParserLIKE        = 13
	FilterQueryParserNOT_LIKE    = 14
	FilterQueryParserILIKE       = 15
	FilterQueryParserNOT_ILIKE   = 16
	FilterQueryParserBETWEEN     = 17
	FilterQueryParserEXISTS      = 18
	FilterQueryParserREGEXP      = 19
	FilterQueryParserCONTAINS    = 20
	FilterQueryParserIN          = 21
	FilterQueryParserNOT         = 22
	FilterQueryParserAND         = 23
	FilterQueryParserOR          = 24
	FilterQueryParserHAS         = 25
	FilterQueryParserHASANY      = 26
	FilterQueryParserHASALL      = 27
	FilterQueryParserHASNONE     = 28
	FilterQueryParserBOOL        = 29
	FilterQueryParserNUMBER      = 30
	FilterQueryParserQUOTED_TEXT = 31
	FilterQueryParserKEY         = 32
	FilterQueryParserWS          = 33
	FilterQueryParserFREETEXT    = 34
)

// FilterQueryParser rules.
const (
	FilterQueryParserRULE_query             = 0
	FilterQueryParserRULE_expression        = 1
	FilterQueryParserRULE_orExpression      = 2
	FilterQueryParserRULE_andExpression     = 3
	FilterQueryParserRULE_unaryExpression   = 4
	FilterQueryParserRULE_primary           = 5
	FilterQueryParserRULE_comparison        = 6
	FilterQueryParserRULE_inClause          = 7
	FilterQueryParserRULE_notInClause       = 8
	FilterQueryParserRULE_valueList         = 9
	FilterQueryParserRULE_fullText          = 10
	FilterQueryParserRULE_functionCall      = 11
	FilterQueryParserRULE_functionParamList = 12
	FilterQueryParserRULE_functionParam     = 13
	FilterQueryParserRULE_array             = 14
	FilterQueryParserRULE_value             = 15
	FilterQueryParserRULE_key               = 16
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
	p.RuleIndex = FilterQueryParserRULE_query
	return p
}

func InitEmptyQueryContext(p *QueryContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_query
}

func (*QueryContext) IsQueryContext() {}

func NewQueryContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *QueryContext {
	var p = new(QueryContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_query

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
	return s.GetToken(FilterQueryParserEOF, 0)
}

func (s *QueryContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *QueryContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *QueryContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterQuery(s)
	}
}

func (s *QueryContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitQuery(s)
	}
}

func (s *QueryContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitQuery(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Query() (localctx IQueryContext) {
	localctx = NewQueryContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 0, FilterQueryParserRULE_query)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(34)
		p.Expression()
	}
	{
		p.SetState(35)
		p.Match(FilterQueryParserEOF)
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
	p.RuleIndex = FilterQueryParserRULE_expression
	return p
}

func InitEmptyExpressionContext(p *ExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_expression
}

func (*ExpressionContext) IsExpressionContext() {}

func NewExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ExpressionContext {
	var p = new(ExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_expression

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
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterExpression(s)
	}
}

func (s *ExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitExpression(s)
	}
}

func (s *ExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Expression() (localctx IExpressionContext) {
	localctx = NewExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 2, FilterQueryParserRULE_expression)
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
	p.RuleIndex = FilterQueryParserRULE_orExpression
	return p
}

func InitEmptyOrExpressionContext(p *OrExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_orExpression
}

func (*OrExpressionContext) IsOrExpressionContext() {}

func NewOrExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *OrExpressionContext {
	var p = new(OrExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_orExpression

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
	return s.GetTokens(FilterQueryParserOR)
}

func (s *OrExpressionContext) OR(i int) antlr.TerminalNode {
	return s.GetToken(FilterQueryParserOR, i)
}

func (s *OrExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *OrExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *OrExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterOrExpression(s)
	}
}

func (s *OrExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitOrExpression(s)
	}
}

func (s *OrExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitOrExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) OrExpression() (localctx IOrExpressionContext) {
	localctx = NewOrExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 4, FilterQueryParserRULE_orExpression)
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

	for _la == FilterQueryParserOR {
		{
			p.SetState(40)
			p.Match(FilterQueryParserOR)
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
	AllUnaryExpression() []IUnaryExpressionContext
	UnaryExpression(i int) IUnaryExpressionContext
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
	p.RuleIndex = FilterQueryParserRULE_andExpression
	return p
}

func InitEmptyAndExpressionContext(p *AndExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_andExpression
}

func (*AndExpressionContext) IsAndExpressionContext() {}

func NewAndExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *AndExpressionContext {
	var p = new(AndExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_andExpression

	return p
}

func (s *AndExpressionContext) GetParser() antlr.Parser { return s.parser }

func (s *AndExpressionContext) AllUnaryExpression() []IUnaryExpressionContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IUnaryExpressionContext); ok {
			len++
		}
	}

	tst := make([]IUnaryExpressionContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IUnaryExpressionContext); ok {
			tst[i] = t.(IUnaryExpressionContext)
			i++
		}
	}

	return tst
}

func (s *AndExpressionContext) UnaryExpression(i int) IUnaryExpressionContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IUnaryExpressionContext); ok {
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

	return t.(IUnaryExpressionContext)
}

func (s *AndExpressionContext) AllAND() []antlr.TerminalNode {
	return s.GetTokens(FilterQueryParserAND)
}

func (s *AndExpressionContext) AND(i int) antlr.TerminalNode {
	return s.GetToken(FilterQueryParserAND, i)
}

func (s *AndExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *AndExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *AndExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterAndExpression(s)
	}
}

func (s *AndExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitAndExpression(s)
	}
}

func (s *AndExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitAndExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) AndExpression() (localctx IAndExpressionContext) {
	localctx = NewAndExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 6, FilterQueryParserRULE_andExpression)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(47)
		p.UnaryExpression()
	}
	p.SetState(53)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for (int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&24138219522) != 0 {
		p.SetState(51)
		p.GetErrorHandler().Sync(p)
		if p.HasError() {
			goto errorExit
		}

		switch p.GetTokenStream().LA(1) {
		case FilterQueryParserAND:
			{
				p.SetState(48)
				p.Match(FilterQueryParserAND)
				if p.HasError() {
					// Recognition error - abort rule
					goto errorExit
				}
			}
			{
				p.SetState(49)
				p.UnaryExpression()
			}

		case FilterQueryParserLPAREN, FilterQueryParserNOT, FilterQueryParserHAS, FilterQueryParserHASANY, FilterQueryParserHASALL, FilterQueryParserHASNONE, FilterQueryParserQUOTED_TEXT, FilterQueryParserKEY, FilterQueryParserFREETEXT:
			{
				p.SetState(50)
				p.UnaryExpression()
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

// IUnaryExpressionContext is an interface to support dynamic dispatch.
type IUnaryExpressionContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Primary() IPrimaryContext
	NOT() antlr.TerminalNode

	// IsUnaryExpressionContext differentiates from other interfaces.
	IsUnaryExpressionContext()
}

type UnaryExpressionContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyUnaryExpressionContext() *UnaryExpressionContext {
	var p = new(UnaryExpressionContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_unaryExpression
	return p
}

func InitEmptyUnaryExpressionContext(p *UnaryExpressionContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_unaryExpression
}

func (*UnaryExpressionContext) IsUnaryExpressionContext() {}

func NewUnaryExpressionContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *UnaryExpressionContext {
	var p = new(UnaryExpressionContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_unaryExpression

	return p
}

func (s *UnaryExpressionContext) GetParser() antlr.Parser { return s.parser }

func (s *UnaryExpressionContext) Primary() IPrimaryContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IPrimaryContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IPrimaryContext)
}

func (s *UnaryExpressionContext) NOT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT, 0)
}

func (s *UnaryExpressionContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *UnaryExpressionContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *UnaryExpressionContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterUnaryExpression(s)
	}
}

func (s *UnaryExpressionContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitUnaryExpression(s)
	}
}

func (s *UnaryExpressionContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitUnaryExpression(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) UnaryExpression() (localctx IUnaryExpressionContext) {
	localctx = NewUnaryExpressionContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 8, FilterQueryParserRULE_unaryExpression)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	p.SetState(57)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	if _la == FilterQueryParserNOT {
		{
			p.SetState(56)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	}
	{
		p.SetState(59)
		p.Primary()
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
	Comparison() IComparisonContext
	FunctionCall() IFunctionCallContext
	FullText() IFullTextContext
	Key() IKeyContext

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
	p.RuleIndex = FilterQueryParserRULE_primary
	return p
}

func InitEmptyPrimaryContext(p *PrimaryContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_primary
}

func (*PrimaryContext) IsPrimaryContext() {}

func NewPrimaryContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *PrimaryContext {
	var p = new(PrimaryContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_primary

	return p
}

func (s *PrimaryContext) GetParser() antlr.Parser { return s.parser }

func (s *PrimaryContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLPAREN, 0)
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
	return s.GetToken(FilterQueryParserRPAREN, 0)
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

func (s *PrimaryContext) FunctionCall() IFunctionCallContext {
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

func (s *PrimaryContext) FullText() IFullTextContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFullTextContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFullTextContext)
}

func (s *PrimaryContext) Key() IKeyContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IKeyContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IKeyContext)
}

func (s *PrimaryContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *PrimaryContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *PrimaryContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterPrimary(s)
	}
}

func (s *PrimaryContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitPrimary(s)
	}
}

func (s *PrimaryContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitPrimary(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Primary() (localctx IPrimaryContext) {
	localctx = NewPrimaryContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 10, FilterQueryParserRULE_primary)
	p.SetState(69)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 4, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(61)
			p.Match(FilterQueryParserLPAREN)
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
			p.Match(FilterQueryParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(65)
			p.Comparison()
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(66)
			p.FunctionCall()
		}

	case 4:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(67)
			p.FullText()
		}

	case 5:
		p.EnterOuterAlt(localctx, 5)
		{
			p.SetState(68)
			p.Key()
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
	Key() IKeyContext
	EQUALS() antlr.TerminalNode
	AllValue() []IValueContext
	Value(i int) IValueContext
	NOT_EQUALS() antlr.TerminalNode
	NEQ() antlr.TerminalNode
	LT() antlr.TerminalNode
	LE() antlr.TerminalNode
	GT() antlr.TerminalNode
	GE() antlr.TerminalNode
	LIKE() antlr.TerminalNode
	ILIKE() antlr.TerminalNode
	NOT_LIKE() antlr.TerminalNode
	NOT_ILIKE() antlr.TerminalNode
	BETWEEN() antlr.TerminalNode
	AND() antlr.TerminalNode
	NOT() antlr.TerminalNode
	InClause() IInClauseContext
	NotInClause() INotInClauseContext
	EXISTS() antlr.TerminalNode
	REGEXP() antlr.TerminalNode
	CONTAINS() antlr.TerminalNode

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
	p.RuleIndex = FilterQueryParserRULE_comparison
	return p
}

func InitEmptyComparisonContext(p *ComparisonContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_comparison
}

func (*ComparisonContext) IsComparisonContext() {}

func NewComparisonContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ComparisonContext {
	var p = new(ComparisonContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_comparison

	return p
}

func (s *ComparisonContext) GetParser() antlr.Parser { return s.parser }

func (s *ComparisonContext) Key() IKeyContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IKeyContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IKeyContext)
}

func (s *ComparisonContext) EQUALS() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserEQUALS, 0)
}

func (s *ComparisonContext) AllValue() []IValueContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IValueContext); ok {
			len++
		}
	}

	tst := make([]IValueContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IValueContext); ok {
			tst[i] = t.(IValueContext)
			i++
		}
	}

	return tst
}

func (s *ComparisonContext) Value(i int) IValueContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueContext); ok {
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

	return t.(IValueContext)
}

func (s *ComparisonContext) NOT_EQUALS() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT_EQUALS, 0)
}

func (s *ComparisonContext) NEQ() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNEQ, 0)
}

func (s *ComparisonContext) LT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLT, 0)
}

func (s *ComparisonContext) LE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLE, 0)
}

func (s *ComparisonContext) GT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserGT, 0)
}

func (s *ComparisonContext) GE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserGE, 0)
}

func (s *ComparisonContext) LIKE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLIKE, 0)
}

func (s *ComparisonContext) ILIKE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserILIKE, 0)
}

func (s *ComparisonContext) NOT_LIKE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT_LIKE, 0)
}

func (s *ComparisonContext) NOT_ILIKE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT_ILIKE, 0)
}

func (s *ComparisonContext) BETWEEN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserBETWEEN, 0)
}

func (s *ComparisonContext) AND() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserAND, 0)
}

func (s *ComparisonContext) NOT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT, 0)
}

func (s *ComparisonContext) InClause() IInClauseContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IInClauseContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IInClauseContext)
}

func (s *ComparisonContext) NotInClause() INotInClauseContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(INotInClauseContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(INotInClauseContext)
}

func (s *ComparisonContext) EXISTS() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserEXISTS, 0)
}

func (s *ComparisonContext) REGEXP() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserREGEXP, 0)
}

func (s *ComparisonContext) CONTAINS() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserCONTAINS, 0)
}

func (s *ComparisonContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ComparisonContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ComparisonContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterComparison(s)
	}
}

func (s *ComparisonContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitComparison(s)
	}
}

func (s *ComparisonContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitComparison(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Comparison() (localctx IComparisonContext) {
	localctx = NewComparisonContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 12, FilterQueryParserRULE_comparison)
	var _la int

	p.SetState(147)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 5, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(71)
			p.Key()
		}
		{
			p.SetState(72)
			p.Match(FilterQueryParserEQUALS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(73)
			p.Value()
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(75)
			p.Key()
		}
		{
			p.SetState(76)
			_la = p.GetTokenStream().LA(1)

			if !(_la == FilterQueryParserNOT_EQUALS || _la == FilterQueryParserNEQ) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}
		{
			p.SetState(77)
			p.Value()
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(79)
			p.Key()
		}
		{
			p.SetState(80)
			p.Match(FilterQueryParserLT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(81)
			p.Value()
		}

	case 4:
		p.EnterOuterAlt(localctx, 4)
		{
			p.SetState(83)
			p.Key()
		}
		{
			p.SetState(84)
			p.Match(FilterQueryParserLE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(85)
			p.Value()
		}

	case 5:
		p.EnterOuterAlt(localctx, 5)
		{
			p.SetState(87)
			p.Key()
		}
		{
			p.SetState(88)
			p.Match(FilterQueryParserGT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(89)
			p.Value()
		}

	case 6:
		p.EnterOuterAlt(localctx, 6)
		{
			p.SetState(91)
			p.Key()
		}
		{
			p.SetState(92)
			p.Match(FilterQueryParserGE)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(93)
			p.Value()
		}

	case 7:
		p.EnterOuterAlt(localctx, 7)
		{
			p.SetState(95)
			p.Key()
		}
		{
			p.SetState(96)
			_la = p.GetTokenStream().LA(1)

			if !(_la == FilterQueryParserLIKE || _la == FilterQueryParserILIKE) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}
		{
			p.SetState(97)
			p.Value()
		}

	case 8:
		p.EnterOuterAlt(localctx, 8)
		{
			p.SetState(99)
			p.Key()
		}
		{
			p.SetState(100)
			_la = p.GetTokenStream().LA(1)

			if !(_la == FilterQueryParserNOT_LIKE || _la == FilterQueryParserNOT_ILIKE) {
				p.GetErrorHandler().RecoverInline(p)
			} else {
				p.GetErrorHandler().ReportMatch(p)
				p.Consume()
			}
		}
		{
			p.SetState(101)
			p.Value()
		}

	case 9:
		p.EnterOuterAlt(localctx, 9)
		{
			p.SetState(103)
			p.Key()
		}
		{
			p.SetState(104)
			p.Match(FilterQueryParserBETWEEN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(105)
			p.Value()
		}
		{
			p.SetState(106)
			p.Match(FilterQueryParserAND)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(107)
			p.Value()
		}

	case 10:
		p.EnterOuterAlt(localctx, 10)
		{
			p.SetState(109)
			p.Key()
		}
		{
			p.SetState(110)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(111)
			p.Match(FilterQueryParserBETWEEN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(112)
			p.Value()
		}
		{
			p.SetState(113)
			p.Match(FilterQueryParserAND)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(114)
			p.Value()
		}

	case 11:
		p.EnterOuterAlt(localctx, 11)
		{
			p.SetState(116)
			p.Key()
		}
		{
			p.SetState(117)
			p.InClause()
		}

	case 12:
		p.EnterOuterAlt(localctx, 12)
		{
			p.SetState(119)
			p.Key()
		}
		{
			p.SetState(120)
			p.NotInClause()
		}

	case 13:
		p.EnterOuterAlt(localctx, 13)
		{
			p.SetState(122)
			p.Key()
		}
		{
			p.SetState(123)
			p.Match(FilterQueryParserEXISTS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 14:
		p.EnterOuterAlt(localctx, 14)
		{
			p.SetState(125)
			p.Key()
		}
		{
			p.SetState(126)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(127)
			p.Match(FilterQueryParserEXISTS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 15:
		p.EnterOuterAlt(localctx, 15)
		{
			p.SetState(129)
			p.Key()
		}
		{
			p.SetState(130)
			p.Match(FilterQueryParserREGEXP)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(131)
			p.Value()
		}

	case 16:
		p.EnterOuterAlt(localctx, 16)
		{
			p.SetState(133)
			p.Key()
		}
		{
			p.SetState(134)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(135)
			p.Match(FilterQueryParserREGEXP)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(136)
			p.Value()
		}

	case 17:
		p.EnterOuterAlt(localctx, 17)
		{
			p.SetState(138)
			p.Key()
		}
		{
			p.SetState(139)
			p.Match(FilterQueryParserCONTAINS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(140)
			p.Value()
		}

	case 18:
		p.EnterOuterAlt(localctx, 18)
		{
			p.SetState(142)
			p.Key()
		}
		{
			p.SetState(143)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(144)
			p.Match(FilterQueryParserCONTAINS)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(145)
			p.Value()
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

// IInClauseContext is an interface to support dynamic dispatch.
type IInClauseContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	IN() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	ValueList() IValueListContext
	RPAREN() antlr.TerminalNode
	LBRACK() antlr.TerminalNode
	RBRACK() antlr.TerminalNode

	// IsInClauseContext differentiates from other interfaces.
	IsInClauseContext()
}

type InClauseContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyInClauseContext() *InClauseContext {
	var p = new(InClauseContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_inClause
	return p
}

func InitEmptyInClauseContext(p *InClauseContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_inClause
}

func (*InClauseContext) IsInClauseContext() {}

func NewInClauseContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *InClauseContext {
	var p = new(InClauseContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_inClause

	return p
}

func (s *InClauseContext) GetParser() antlr.Parser { return s.parser }

func (s *InClauseContext) IN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserIN, 0)
}

func (s *InClauseContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLPAREN, 0)
}

func (s *InClauseContext) ValueList() IValueListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IValueListContext)
}

func (s *InClauseContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRPAREN, 0)
}

func (s *InClauseContext) LBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLBRACK, 0)
}

func (s *InClauseContext) RBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRBRACK, 0)
}

func (s *InClauseContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *InClauseContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *InClauseContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterInClause(s)
	}
}

func (s *InClauseContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitInClause(s)
	}
}

func (s *InClauseContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitInClause(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) InClause() (localctx IInClauseContext) {
	localctx = NewInClauseContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 14, FilterQueryParserRULE_inClause)
	p.SetState(159)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 6, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(149)
			p.Match(FilterQueryParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(150)
			p.Match(FilterQueryParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(151)
			p.ValueList()
		}
		{
			p.SetState(152)
			p.Match(FilterQueryParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(154)
			p.Match(FilterQueryParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(155)
			p.Match(FilterQueryParserLBRACK)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(156)
			p.ValueList()
		}
		{
			p.SetState(157)
			p.Match(FilterQueryParserRBRACK)
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

// INotInClauseContext is an interface to support dynamic dispatch.
type INotInClauseContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	NOT() antlr.TerminalNode
	IN() antlr.TerminalNode
	LPAREN() antlr.TerminalNode
	ValueList() IValueListContext
	RPAREN() antlr.TerminalNode
	LBRACK() antlr.TerminalNode
	RBRACK() antlr.TerminalNode

	// IsNotInClauseContext differentiates from other interfaces.
	IsNotInClauseContext()
}

type NotInClauseContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyNotInClauseContext() *NotInClauseContext {
	var p = new(NotInClauseContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_notInClause
	return p
}

func InitEmptyNotInClauseContext(p *NotInClauseContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_notInClause
}

func (*NotInClauseContext) IsNotInClauseContext() {}

func NewNotInClauseContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *NotInClauseContext {
	var p = new(NotInClauseContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_notInClause

	return p
}

func (s *NotInClauseContext) GetParser() antlr.Parser { return s.parser }

func (s *NotInClauseContext) NOT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNOT, 0)
}

func (s *NotInClauseContext) IN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserIN, 0)
}

func (s *NotInClauseContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLPAREN, 0)
}

func (s *NotInClauseContext) ValueList() IValueListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IValueListContext)
}

func (s *NotInClauseContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRPAREN, 0)
}

func (s *NotInClauseContext) LBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLBRACK, 0)
}

func (s *NotInClauseContext) RBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRBRACK, 0)
}

func (s *NotInClauseContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *NotInClauseContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *NotInClauseContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterNotInClause(s)
	}
}

func (s *NotInClauseContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitNotInClause(s)
	}
}

func (s *NotInClauseContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitNotInClause(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) NotInClause() (localctx INotInClauseContext) {
	localctx = NewNotInClauseContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 16, FilterQueryParserRULE_notInClause)
	p.SetState(173)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 7, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(161)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(162)
			p.Match(FilterQueryParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(163)
			p.Match(FilterQueryParserLPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(164)
			p.ValueList()
		}
		{
			p.SetState(165)
			p.Match(FilterQueryParserRPAREN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(167)
			p.Match(FilterQueryParserNOT)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(168)
			p.Match(FilterQueryParserIN)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(169)
			p.Match(FilterQueryParserLBRACK)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(170)
			p.ValueList()
		}
		{
			p.SetState(171)
			p.Match(FilterQueryParserRBRACK)
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

// IValueListContext is an interface to support dynamic dispatch.
type IValueListContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllValue() []IValueContext
	Value(i int) IValueContext
	AllCOMMA() []antlr.TerminalNode
	COMMA(i int) antlr.TerminalNode

	// IsValueListContext differentiates from other interfaces.
	IsValueListContext()
}

type ValueListContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyValueListContext() *ValueListContext {
	var p = new(ValueListContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_valueList
	return p
}

func InitEmptyValueListContext(p *ValueListContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_valueList
}

func (*ValueListContext) IsValueListContext() {}

func NewValueListContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ValueListContext {
	var p = new(ValueListContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_valueList

	return p
}

func (s *ValueListContext) GetParser() antlr.Parser { return s.parser }

func (s *ValueListContext) AllValue() []IValueContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IValueContext); ok {
			len++
		}
	}

	tst := make([]IValueContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IValueContext); ok {
			tst[i] = t.(IValueContext)
			i++
		}
	}

	return tst
}

func (s *ValueListContext) Value(i int) IValueContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueContext); ok {
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

	return t.(IValueContext)
}

func (s *ValueListContext) AllCOMMA() []antlr.TerminalNode {
	return s.GetTokens(FilterQueryParserCOMMA)
}

func (s *ValueListContext) COMMA(i int) antlr.TerminalNode {
	return s.GetToken(FilterQueryParserCOMMA, i)
}

func (s *ValueListContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ValueListContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ValueListContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterValueList(s)
	}
}

func (s *ValueListContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitValueList(s)
	}
}

func (s *ValueListContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitValueList(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) ValueList() (localctx IValueListContext) {
	localctx = NewValueListContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 18, FilterQueryParserRULE_valueList)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(175)
		p.Value()
	}
	p.SetState(180)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == FilterQueryParserCOMMA {
		{
			p.SetState(176)
			p.Match(FilterQueryParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(177)
			p.Value()
		}

		p.SetState(182)
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

// IFullTextContext is an interface to support dynamic dispatch.
type IFullTextContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	QUOTED_TEXT() antlr.TerminalNode
	FREETEXT() antlr.TerminalNode

	// IsFullTextContext differentiates from other interfaces.
	IsFullTextContext()
}

type FullTextContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFullTextContext() *FullTextContext {
	var p = new(FullTextContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_fullText
	return p
}

func InitEmptyFullTextContext(p *FullTextContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_fullText
}

func (*FullTextContext) IsFullTextContext() {}

func NewFullTextContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FullTextContext {
	var p = new(FullTextContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_fullText

	return p
}

func (s *FullTextContext) GetParser() antlr.Parser { return s.parser }

func (s *FullTextContext) QUOTED_TEXT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserQUOTED_TEXT, 0)
}

func (s *FullTextContext) FREETEXT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserFREETEXT, 0)
}

func (s *FullTextContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FullTextContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FullTextContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterFullText(s)
	}
}

func (s *FullTextContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitFullText(s)
	}
}

func (s *FullTextContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitFullText(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) FullText() (localctx IFullTextContext) {
	localctx = NewFullTextContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 20, FilterQueryParserRULE_fullText)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(183)
		_la = p.GetTokenStream().LA(1)

		if !(_la == FilterQueryParserQUOTED_TEXT || _la == FilterQueryParserFREETEXT) {
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

// IFunctionCallContext is an interface to support dynamic dispatch.
type IFunctionCallContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	LPAREN() antlr.TerminalNode
	FunctionParamList() IFunctionParamListContext
	RPAREN() antlr.TerminalNode
	HAS() antlr.TerminalNode
	HASANY() antlr.TerminalNode
	HASALL() antlr.TerminalNode
	HASNONE() antlr.TerminalNode

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
	p.RuleIndex = FilterQueryParserRULE_functionCall
	return p
}

func InitEmptyFunctionCallContext(p *FunctionCallContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_functionCall
}

func (*FunctionCallContext) IsFunctionCallContext() {}

func NewFunctionCallContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FunctionCallContext {
	var p = new(FunctionCallContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_functionCall

	return p
}

func (s *FunctionCallContext) GetParser() antlr.Parser { return s.parser }

func (s *FunctionCallContext) LPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLPAREN, 0)
}

func (s *FunctionCallContext) FunctionParamList() IFunctionParamListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFunctionParamListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IFunctionParamListContext)
}

func (s *FunctionCallContext) RPAREN() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRPAREN, 0)
}

func (s *FunctionCallContext) HAS() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserHAS, 0)
}

func (s *FunctionCallContext) HASANY() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserHASANY, 0)
}

func (s *FunctionCallContext) HASALL() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserHASALL, 0)
}

func (s *FunctionCallContext) HASNONE() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserHASNONE, 0)
}

func (s *FunctionCallContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FunctionCallContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FunctionCallContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterFunctionCall(s)
	}
}

func (s *FunctionCallContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitFunctionCall(s)
	}
}

func (s *FunctionCallContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitFunctionCall(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) FunctionCall() (localctx IFunctionCallContext) {
	localctx = NewFunctionCallContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 22, FilterQueryParserRULE_functionCall)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(185)
		_la = p.GetTokenStream().LA(1)

		if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&503316480) != 0) {
			p.GetErrorHandler().RecoverInline(p)
		} else {
			p.GetErrorHandler().ReportMatch(p)
			p.Consume()
		}
	}
	{
		p.SetState(186)
		p.Match(FilterQueryParserLPAREN)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	{
		p.SetState(187)
		p.FunctionParamList()
	}
	{
		p.SetState(188)
		p.Match(FilterQueryParserRPAREN)
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

// IFunctionParamListContext is an interface to support dynamic dispatch.
type IFunctionParamListContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	AllFunctionParam() []IFunctionParamContext
	FunctionParam(i int) IFunctionParamContext
	AllCOMMA() []antlr.TerminalNode
	COMMA(i int) antlr.TerminalNode

	// IsFunctionParamListContext differentiates from other interfaces.
	IsFunctionParamListContext()
}

type FunctionParamListContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFunctionParamListContext() *FunctionParamListContext {
	var p = new(FunctionParamListContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_functionParamList
	return p
}

func InitEmptyFunctionParamListContext(p *FunctionParamListContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_functionParamList
}

func (*FunctionParamListContext) IsFunctionParamListContext() {}

func NewFunctionParamListContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FunctionParamListContext {
	var p = new(FunctionParamListContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_functionParamList

	return p
}

func (s *FunctionParamListContext) GetParser() antlr.Parser { return s.parser }

func (s *FunctionParamListContext) AllFunctionParam() []IFunctionParamContext {
	children := s.GetChildren()
	len := 0
	for _, ctx := range children {
		if _, ok := ctx.(IFunctionParamContext); ok {
			len++
		}
	}

	tst := make([]IFunctionParamContext, len)
	i := 0
	for _, ctx := range children {
		if t, ok := ctx.(IFunctionParamContext); ok {
			tst[i] = t.(IFunctionParamContext)
			i++
		}
	}

	return tst
}

func (s *FunctionParamListContext) FunctionParam(i int) IFunctionParamContext {
	var t antlr.RuleContext
	j := 0
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IFunctionParamContext); ok {
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

	return t.(IFunctionParamContext)
}

func (s *FunctionParamListContext) AllCOMMA() []antlr.TerminalNode {
	return s.GetTokens(FilterQueryParserCOMMA)
}

func (s *FunctionParamListContext) COMMA(i int) antlr.TerminalNode {
	return s.GetToken(FilterQueryParserCOMMA, i)
}

func (s *FunctionParamListContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FunctionParamListContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FunctionParamListContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterFunctionParamList(s)
	}
}

func (s *FunctionParamListContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitFunctionParamList(s)
	}
}

func (s *FunctionParamListContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitFunctionParamList(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) FunctionParamList() (localctx IFunctionParamListContext) {
	localctx = NewFunctionParamListContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 24, FilterQueryParserRULE_functionParamList)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(190)
		p.FunctionParam()
	}
	p.SetState(195)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}
	_la = p.GetTokenStream().LA(1)

	for _la == FilterQueryParserCOMMA {
		{
			p.SetState(191)
			p.Match(FilterQueryParserCOMMA)
			if p.HasError() {
				// Recognition error - abort rule
				goto errorExit
			}
		}
		{
			p.SetState(192)
			p.FunctionParam()
		}

		p.SetState(197)
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

// IFunctionParamContext is an interface to support dynamic dispatch.
type IFunctionParamContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	Key() IKeyContext
	Value() IValueContext
	Array() IArrayContext

	// IsFunctionParamContext differentiates from other interfaces.
	IsFunctionParamContext()
}

type FunctionParamContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyFunctionParamContext() *FunctionParamContext {
	var p = new(FunctionParamContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_functionParam
	return p
}

func InitEmptyFunctionParamContext(p *FunctionParamContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_functionParam
}

func (*FunctionParamContext) IsFunctionParamContext() {}

func NewFunctionParamContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *FunctionParamContext {
	var p = new(FunctionParamContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_functionParam

	return p
}

func (s *FunctionParamContext) GetParser() antlr.Parser { return s.parser }

func (s *FunctionParamContext) Key() IKeyContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IKeyContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IKeyContext)
}

func (s *FunctionParamContext) Value() IValueContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IValueContext)
}

func (s *FunctionParamContext) Array() IArrayContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IArrayContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IArrayContext)
}

func (s *FunctionParamContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *FunctionParamContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *FunctionParamContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterFunctionParam(s)
	}
}

func (s *FunctionParamContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitFunctionParam(s)
	}
}

func (s *FunctionParamContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitFunctionParam(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) FunctionParam() (localctx IFunctionParamContext) {
	localctx = NewFunctionParamContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 26, FilterQueryParserRULE_functionParam)
	p.SetState(201)
	p.GetErrorHandler().Sync(p)
	if p.HasError() {
		goto errorExit
	}

	switch p.GetInterpreter().AdaptivePredict(p.BaseParser, p.GetTokenStream(), 10, p.GetParserRuleContext()) {
	case 1:
		p.EnterOuterAlt(localctx, 1)
		{
			p.SetState(198)
			p.Key()
		}

	case 2:
		p.EnterOuterAlt(localctx, 2)
		{
			p.SetState(199)
			p.Value()
		}

	case 3:
		p.EnterOuterAlt(localctx, 3)
		{
			p.SetState(200)
			p.Array()
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

// IArrayContext is an interface to support dynamic dispatch.
type IArrayContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	LBRACK() antlr.TerminalNode
	ValueList() IValueListContext
	RBRACK() antlr.TerminalNode

	// IsArrayContext differentiates from other interfaces.
	IsArrayContext()
}

type ArrayContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyArrayContext() *ArrayContext {
	var p = new(ArrayContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_array
	return p
}

func InitEmptyArrayContext(p *ArrayContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_array
}

func (*ArrayContext) IsArrayContext() {}

func NewArrayContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ArrayContext {
	var p = new(ArrayContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_array

	return p
}

func (s *ArrayContext) GetParser() antlr.Parser { return s.parser }

func (s *ArrayContext) LBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserLBRACK, 0)
}

func (s *ArrayContext) ValueList() IValueListContext {
	var t antlr.RuleContext
	for _, ctx := range s.GetChildren() {
		if _, ok := ctx.(IValueListContext); ok {
			t = ctx.(antlr.RuleContext)
			break
		}
	}

	if t == nil {
		return nil
	}

	return t.(IValueListContext)
}

func (s *ArrayContext) RBRACK() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserRBRACK, 0)
}

func (s *ArrayContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ArrayContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ArrayContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterArray(s)
	}
}

func (s *ArrayContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitArray(s)
	}
}

func (s *ArrayContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitArray(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Array() (localctx IArrayContext) {
	localctx = NewArrayContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 28, FilterQueryParserRULE_array)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(203)
		p.Match(FilterQueryParserLBRACK)
		if p.HasError() {
			// Recognition error - abort rule
			goto errorExit
		}
	}
	{
		p.SetState(204)
		p.ValueList()
	}
	{
		p.SetState(205)
		p.Match(FilterQueryParserRBRACK)
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

// IValueContext is an interface to support dynamic dispatch.
type IValueContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	QUOTED_TEXT() antlr.TerminalNode
	NUMBER() antlr.TerminalNode
	BOOL() antlr.TerminalNode
	KEY() antlr.TerminalNode

	// IsValueContext differentiates from other interfaces.
	IsValueContext()
}

type ValueContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyValueContext() *ValueContext {
	var p = new(ValueContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_value
	return p
}

func InitEmptyValueContext(p *ValueContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_value
}

func (*ValueContext) IsValueContext() {}

func NewValueContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *ValueContext {
	var p = new(ValueContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_value

	return p
}

func (s *ValueContext) GetParser() antlr.Parser { return s.parser }

func (s *ValueContext) QUOTED_TEXT() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserQUOTED_TEXT, 0)
}

func (s *ValueContext) NUMBER() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserNUMBER, 0)
}

func (s *ValueContext) BOOL() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserBOOL, 0)
}

func (s *ValueContext) KEY() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserKEY, 0)
}

func (s *ValueContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *ValueContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *ValueContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterValue(s)
	}
}

func (s *ValueContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitValue(s)
	}
}

func (s *ValueContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitValue(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Value() (localctx IValueContext) {
	localctx = NewValueContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 30, FilterQueryParserRULE_value)
	var _la int

	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(207)
		_la = p.GetTokenStream().LA(1)

		if !((int64(_la) & ^0x3f) == 0 && ((int64(1)<<_la)&8053063680) != 0) {
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

// IKeyContext is an interface to support dynamic dispatch.
type IKeyContext interface {
	antlr.ParserRuleContext

	// GetParser returns the parser.
	GetParser() antlr.Parser

	// Getter signatures
	KEY() antlr.TerminalNode

	// IsKeyContext differentiates from other interfaces.
	IsKeyContext()
}

type KeyContext struct {
	antlr.BaseParserRuleContext
	parser antlr.Parser
}

func NewEmptyKeyContext() *KeyContext {
	var p = new(KeyContext)
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_key
	return p
}

func InitEmptyKeyContext(p *KeyContext) {
	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, nil, -1)
	p.RuleIndex = FilterQueryParserRULE_key
}

func (*KeyContext) IsKeyContext() {}

func NewKeyContext(parser antlr.Parser, parent antlr.ParserRuleContext, invokingState int) *KeyContext {
	var p = new(KeyContext)

	antlr.InitBaseParserRuleContext(&p.BaseParserRuleContext, parent, invokingState)

	p.parser = parser
	p.RuleIndex = FilterQueryParserRULE_key

	return p
}

func (s *KeyContext) GetParser() antlr.Parser { return s.parser }

func (s *KeyContext) KEY() antlr.TerminalNode {
	return s.GetToken(FilterQueryParserKEY, 0)
}

func (s *KeyContext) GetRuleContext() antlr.RuleContext {
	return s
}

func (s *KeyContext) ToStringTree(ruleNames []string, recog antlr.Recognizer) string {
	return antlr.TreesStringTree(s, ruleNames, recog)
}

func (s *KeyContext) EnterRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.EnterKey(s)
	}
}

func (s *KeyContext) ExitRule(listener antlr.ParseTreeListener) {
	if listenerT, ok := listener.(FilterQueryListener); ok {
		listenerT.ExitKey(s)
	}
}

func (s *KeyContext) Accept(visitor antlr.ParseTreeVisitor) interface{} {
	switch t := visitor.(type) {
	case FilterQueryVisitor:
		return t.VisitKey(s)

	default:
		return t.VisitChildren(s)
	}
}

func (p *FilterQueryParser) Key() (localctx IKeyContext) {
	localctx = NewKeyContext(p, p.GetParserRuleContext(), p.GetState())
	p.EnterRule(localctx, 32, FilterQueryParserRULE_key)
	p.EnterOuterAlt(localctx, 1)
	{
		p.SetState(209)
		p.Match(FilterQueryParserKEY)
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
