// Code generated from grammar/AggregationExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

package parser

import (
	"fmt"
	"github.com/antlr4-go/antlr/v4"
	"sync"
	"unicode"
)

// Suppress unused import error
var _ = fmt.Printf
var _ = sync.Once{}
var _ = unicode.IsLetter

type AggregationExpressionLexer struct {
	*antlr.BaseLexer
	channelNames []string
	modeNames    []string
	// TODO: EOF string
}

var AggregationExpressionLexerLexerStaticData struct {
	once                   sync.Once
	serializedATN          []int32
	ChannelNames           []string
	ModeNames              []string
	LiteralNames           []string
	SymbolicNames          []string
	RuleNames              []string
	PredictionContextCache *antlr.PredictionContextCache
	atn                    *antlr.ATN
	decisionToDFA          []*antlr.DFA
}

func aggregationexpressionlexerLexerInit() {
	staticData := &AggregationExpressionLexerLexerStaticData
	staticData.ChannelNames = []string{
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN",
	}
	staticData.ModeNames = []string{
		"DEFAULT_MODE",
	}
	staticData.LiteralNames = []string{
		"", "'('", "')'", "'['", "']'", "','", "'+'", "'-'", "'*'", "'/'", "'%'",
	}
	staticData.SymbolicNames = []string{
		"", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "PLUS", "MINUS",
		"STAR", "SLASH", "PERCENT", "OPERATOR", "NUMBER", "QUOTED_TEXT", "KEY",
		"WS", "OTHER",
	}
	staticData.RuleNames = []string{
		"LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "PLUS", "MINUS", "STAR",
		"SLASH", "PERCENT", "OPERATOR", "NUMBER", "QUOTED_TEXT", "SEGMENT",
		"EMPTY_BRACKS", "OLD_JSON_BRACKS", "KEY", "WS", "DIGIT", "OTHER",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 0, 16, 183, 6, -1, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2,
		4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2,
		10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15,
		7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19, 1, 0, 1,
		0, 1, 1, 1, 1, 1, 2, 1, 2, 1, 3, 1, 3, 1, 4, 1, 4, 1, 5, 1, 5, 1, 6, 1,
		6, 1, 7, 1, 7, 1, 8, 1, 8, 1, 9, 1, 9, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10,
		1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 3, 10, 75, 8, 10,
		1, 11, 4, 11, 78, 8, 11, 11, 11, 12, 11, 79, 1, 11, 1, 11, 5, 11, 84, 8,
		11, 10, 11, 12, 11, 87, 9, 11, 3, 11, 89, 8, 11, 1, 11, 1, 11, 3, 11, 93,
		8, 11, 1, 11, 4, 11, 96, 8, 11, 11, 11, 12, 11, 97, 3, 11, 100, 8, 11,
		1, 11, 1, 11, 4, 11, 104, 8, 11, 11, 11, 12, 11, 105, 1, 11, 1, 11, 3,
		11, 110, 8, 11, 1, 11, 4, 11, 113, 8, 11, 11, 11, 12, 11, 114, 3, 11, 117,
		8, 11, 3, 11, 119, 8, 11, 1, 12, 1, 12, 1, 12, 1, 12, 5, 12, 125, 8, 12,
		10, 12, 12, 12, 128, 9, 12, 1, 12, 1, 12, 1, 12, 1, 12, 1, 12, 5, 12, 135,
		8, 12, 10, 12, 12, 12, 138, 9, 12, 1, 12, 3, 12, 141, 8, 12, 1, 13, 1,
		13, 5, 13, 145, 8, 13, 10, 13, 12, 13, 148, 9, 13, 1, 14, 1, 14, 1, 14,
		1, 15, 1, 15, 1, 15, 1, 15, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1, 16, 1,
		16, 4, 16, 164, 8, 16, 11, 16, 12, 16, 165, 5, 16, 168, 8, 16, 10, 16,
		12, 16, 171, 9, 16, 1, 17, 4, 17, 174, 8, 17, 11, 17, 12, 17, 175, 1, 17,
		1, 17, 1, 18, 1, 18, 1, 19, 1, 19, 0, 0, 20, 1, 1, 3, 2, 5, 3, 7, 4, 9,
		5, 11, 6, 13, 7, 15, 8, 17, 9, 19, 10, 21, 11, 23, 12, 25, 13, 27, 0, 29,
		0, 31, 0, 33, 14, 35, 15, 37, 0, 39, 16, 1, 0, 8, 2, 0, 69, 69, 101, 101,
		2, 0, 43, 43, 45, 45, 2, 0, 34, 34, 92, 92, 2, 0, 39, 39, 92, 92, 4, 0,
		35, 36, 64, 90, 95, 95, 97, 123, 7, 0, 35, 36, 45, 45, 47, 58, 64, 90,
		95, 95, 97, 123, 125, 125, 3, 0, 9, 10, 13, 13, 32, 32, 1, 0, 48, 57, 208,
		0, 1, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 7, 1, 0, 0, 0,
		0, 9, 1, 0, 0, 0, 0, 11, 1, 0, 0, 0, 0, 13, 1, 0, 0, 0, 0, 15, 1, 0, 0,
		0, 0, 17, 1, 0, 0, 0, 0, 19, 1, 0, 0, 0, 0, 21, 1, 0, 0, 0, 0, 23, 1, 0,
		0, 0, 0, 25, 1, 0, 0, 0, 0, 33, 1, 0, 0, 0, 0, 35, 1, 0, 0, 0, 0, 39, 1,
		0, 0, 0, 1, 41, 1, 0, 0, 0, 3, 43, 1, 0, 0, 0, 5, 45, 1, 0, 0, 0, 7, 47,
		1, 0, 0, 0, 9, 49, 1, 0, 0, 0, 11, 51, 1, 0, 0, 0, 13, 53, 1, 0, 0, 0,
		15, 55, 1, 0, 0, 0, 17, 57, 1, 0, 0, 0, 19, 59, 1, 0, 0, 0, 21, 74, 1,
		0, 0, 0, 23, 118, 1, 0, 0, 0, 25, 140, 1, 0, 0, 0, 27, 142, 1, 0, 0, 0,
		29, 149, 1, 0, 0, 0, 31, 152, 1, 0, 0, 0, 33, 156, 1, 0, 0, 0, 35, 173,
		1, 0, 0, 0, 37, 179, 1, 0, 0, 0, 39, 181, 1, 0, 0, 0, 41, 42, 5, 40, 0,
		0, 42, 2, 1, 0, 0, 0, 43, 44, 5, 41, 0, 0, 44, 4, 1, 0, 0, 0, 45, 46, 5,
		91, 0, 0, 46, 6, 1, 0, 0, 0, 47, 48, 5, 93, 0, 0, 48, 8, 1, 0, 0, 0, 49,
		50, 5, 44, 0, 0, 50, 10, 1, 0, 0, 0, 51, 52, 5, 43, 0, 0, 52, 12, 1, 0,
		0, 0, 53, 54, 5, 45, 0, 0, 54, 14, 1, 0, 0, 0, 55, 56, 5, 42, 0, 0, 56,
		16, 1, 0, 0, 0, 57, 58, 5, 47, 0, 0, 58, 18, 1, 0, 0, 0, 59, 60, 5, 37,
		0, 0, 60, 20, 1, 0, 0, 0, 61, 75, 5, 61, 0, 0, 62, 63, 5, 61, 0, 0, 63,
		75, 5, 61, 0, 0, 64, 65, 5, 33, 0, 0, 65, 75, 5, 61, 0, 0, 66, 67, 5, 60,
		0, 0, 67, 75, 5, 62, 0, 0, 68, 75, 5, 60, 0, 0, 69, 70, 5, 60, 0, 0, 70,
		75, 5, 61, 0, 0, 71, 75, 5, 62, 0, 0, 72, 73, 5, 62, 0, 0, 73, 75, 5, 61,
		0, 0, 74, 61, 1, 0, 0, 0, 74, 62, 1, 0, 0, 0, 74, 64, 1, 0, 0, 0, 74, 66,
		1, 0, 0, 0, 74, 68, 1, 0, 0, 0, 74, 69, 1, 0, 0, 0, 74, 71, 1, 0, 0, 0,
		74, 72, 1, 0, 0, 0, 75, 22, 1, 0, 0, 0, 76, 78, 3, 37, 18, 0, 77, 76, 1,
		0, 0, 0, 78, 79, 1, 0, 0, 0, 79, 77, 1, 0, 0, 0, 79, 80, 1, 0, 0, 0, 80,
		88, 1, 0, 0, 0, 81, 85, 5, 46, 0, 0, 82, 84, 3, 37, 18, 0, 83, 82, 1, 0,
		0, 0, 84, 87, 1, 0, 0, 0, 85, 83, 1, 0, 0, 0, 85, 86, 1, 0, 0, 0, 86, 89,
		1, 0, 0, 0, 87, 85, 1, 0, 0, 0, 88, 81, 1, 0, 0, 0, 88, 89, 1, 0, 0, 0,
		89, 99, 1, 0, 0, 0, 90, 92, 7, 0, 0, 0, 91, 93, 7, 1, 0, 0, 92, 91, 1,
		0, 0, 0, 92, 93, 1, 0, 0, 0, 93, 95, 1, 0, 0, 0, 94, 96, 3, 37, 18, 0,
		95, 94, 1, 0, 0, 0, 96, 97, 1, 0, 0, 0, 97, 95, 1, 0, 0, 0, 97, 98, 1,
		0, 0, 0, 98, 100, 1, 0, 0, 0, 99, 90, 1, 0, 0, 0, 99, 100, 1, 0, 0, 0,
		100, 119, 1, 0, 0, 0, 101, 103, 5, 46, 0, 0, 102, 104, 3, 37, 18, 0, 103,
		102, 1, 0, 0, 0, 104, 105, 1, 0, 0, 0, 105, 103, 1, 0, 0, 0, 105, 106,
		1, 0, 0, 0, 106, 116, 1, 0, 0, 0, 107, 109, 7, 0, 0, 0, 108, 110, 7, 1,
		0, 0, 109, 108, 1, 0, 0, 0, 109, 110, 1, 0, 0, 0, 110, 112, 1, 0, 0, 0,
		111, 113, 3, 37, 18, 0, 112, 111, 1, 0, 0, 0, 113, 114, 1, 0, 0, 0, 114,
		112, 1, 0, 0, 0, 114, 115, 1, 0, 0, 0, 115, 117, 1, 0, 0, 0, 116, 107,
		1, 0, 0, 0, 116, 117, 1, 0, 0, 0, 117, 119, 1, 0, 0, 0, 118, 77, 1, 0,
		0, 0, 118, 101, 1, 0, 0, 0, 119, 24, 1, 0, 0, 0, 120, 126, 5, 34, 0, 0,
		121, 125, 8, 2, 0, 0, 122, 123, 5, 92, 0, 0, 123, 125, 9, 0, 0, 0, 124,
		121, 1, 0, 0, 0, 124, 122, 1, 0, 0, 0, 125, 128, 1, 0, 0, 0, 126, 124,
		1, 0, 0, 0, 126, 127, 1, 0, 0, 0, 127, 129, 1, 0, 0, 0, 128, 126, 1, 0,
		0, 0, 129, 141, 5, 34, 0, 0, 130, 136, 5, 39, 0, 0, 131, 135, 8, 3, 0,
		0, 132, 133, 5, 92, 0, 0, 133, 135, 9, 0, 0, 0, 134, 131, 1, 0, 0, 0, 134,
		132, 1, 0, 0, 0, 135, 138, 1, 0, 0, 0, 136, 134, 1, 0, 0, 0, 136, 137,
		1, 0, 0, 0, 137, 139, 1, 0, 0, 0, 138, 136, 1, 0, 0, 0, 139, 141, 5, 39,
		0, 0, 140, 120, 1, 0, 0, 0, 140, 130, 1, 0, 0, 0, 141, 26, 1, 0, 0, 0,
		142, 146, 7, 4, 0, 0, 143, 145, 7, 5, 0, 0, 144, 143, 1, 0, 0, 0, 145,
		148, 1, 0, 0, 0, 146, 144, 1, 0, 0, 0, 146, 147, 1, 0, 0, 0, 147, 28, 1,
		0, 0, 0, 148, 146, 1, 0, 0, 0, 149, 150, 5, 91, 0, 0, 150, 151, 5, 93,
		0, 0, 151, 30, 1, 0, 0, 0, 152, 153, 5, 91, 0, 0, 153, 154, 5, 42, 0, 0,
		154, 155, 5, 93, 0, 0, 155, 32, 1, 0, 0, 0, 156, 169, 3, 27, 13, 0, 157,
		158, 5, 46, 0, 0, 158, 168, 3, 27, 13, 0, 159, 168, 3, 29, 14, 0, 160,
		168, 3, 31, 15, 0, 161, 163, 5, 46, 0, 0, 162, 164, 3, 37, 18, 0, 163,
		162, 1, 0, 0, 0, 164, 165, 1, 0, 0, 0, 165, 163, 1, 0, 0, 0, 165, 166,
		1, 0, 0, 0, 166, 168, 1, 0, 0, 0, 167, 157, 1, 0, 0, 0, 167, 159, 1, 0,
		0, 0, 167, 160, 1, 0, 0, 0, 167, 161, 1, 0, 0, 0, 168, 171, 1, 0, 0, 0,
		169, 167, 1, 0, 0, 0, 169, 170, 1, 0, 0, 0, 170, 34, 1, 0, 0, 0, 171, 169,
		1, 0, 0, 0, 172, 174, 7, 6, 0, 0, 173, 172, 1, 0, 0, 0, 174, 175, 1, 0,
		0, 0, 175, 173, 1, 0, 0, 0, 175, 176, 1, 0, 0, 0, 176, 177, 1, 0, 0, 0,
		177, 178, 6, 17, 0, 0, 178, 36, 1, 0, 0, 0, 179, 180, 7, 7, 0, 0, 180,
		38, 1, 0, 0, 0, 181, 182, 9, 0, 0, 0, 182, 40, 1, 0, 0, 0, 23, 0, 74, 79,
		85, 88, 92, 97, 99, 105, 109, 114, 116, 118, 124, 126, 134, 136, 140, 146,
		165, 167, 169, 175, 1, 6, 0, 0,
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

// AggregationExpressionLexerInit initializes any static state used to implement AggregationExpressionLexer. By default the
// static state used to implement the lexer is lazily initialized during the first call to
// NewAggregationExpressionLexer(). You can call this function if you wish to initialize the static state ahead
// of time.
func AggregationExpressionLexerInit() {
	staticData := &AggregationExpressionLexerLexerStaticData
	staticData.once.Do(aggregationexpressionlexerLexerInit)
}

// NewAggregationExpressionLexer produces a new lexer instance for the optional input antlr.CharStream.
func NewAggregationExpressionLexer(input antlr.CharStream) *AggregationExpressionLexer {
	AggregationExpressionLexerInit()
	l := new(AggregationExpressionLexer)
	l.BaseLexer = antlr.NewBaseLexer(input)
	staticData := &AggregationExpressionLexerLexerStaticData
	l.Interpreter = antlr.NewLexerATNSimulator(l, staticData.atn, staticData.decisionToDFA, staticData.PredictionContextCache)
	l.channelNames = staticData.ChannelNames
	l.modeNames = staticData.ModeNames
	l.RuleNames = staticData.RuleNames
	l.LiteralNames = staticData.LiteralNames
	l.SymbolicNames = staticData.SymbolicNames
	l.GrammarFileName = "AggregationExpression.g4"
	// TODO: l.EOF = antlr.TokenEOF

	return l
}

// AggregationExpressionLexer tokens.
const (
	AggregationExpressionLexerLPAREN      = 1
	AggregationExpressionLexerRPAREN      = 2
	AggregationExpressionLexerLBRACK      = 3
	AggregationExpressionLexerRBRACK      = 4
	AggregationExpressionLexerCOMMA       = 5
	AggregationExpressionLexerPLUS        = 6
	AggregationExpressionLexerMINUS       = 7
	AggregationExpressionLexerSTAR        = 8
	AggregationExpressionLexerSLASH       = 9
	AggregationExpressionLexerPERCENT     = 10
	AggregationExpressionLexerOPERATOR    = 11
	AggregationExpressionLexerNUMBER      = 12
	AggregationExpressionLexerQUOTED_TEXT = 13
	AggregationExpressionLexerKEY         = 14
	AggregationExpressionLexerWS          = 15
	AggregationExpressionLexerOTHER       = 16
)
