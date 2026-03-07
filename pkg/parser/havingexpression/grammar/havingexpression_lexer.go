// Code generated from grammar/HavingExpression.g4 by ANTLR 4.13.2. DO NOT EDIT.

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

type HavingExpressionLexer struct {
	*antlr.BaseLexer
	channelNames []string
	modeNames    []string
	// TODO: EOF string
}

var HavingExpressionLexerLexerStaticData struct {
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

func havingexpressionlexerLexerInit() {
	staticData := &HavingExpressionLexerLexerStaticData
	staticData.ChannelNames = []string{
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN",
	}
	staticData.ModeNames = []string{
		"DEFAULT_MODE",
	}
	staticData.LiteralNames = []string{
		"", "'('", "')'", "','", "", "'!='", "'<>'", "'<'", "'<='", "'>'", "'>='",
		"'+'", "'-'", "'*'", "'/'", "'%'",
	}
	staticData.SymbolicNames = []string{
		"", "LPAREN", "RPAREN", "COMMA", "EQUALS", "NOT_EQUALS", "NEQ", "LT",
		"LE", "GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT", "NOT",
		"AND", "OR", "BOOL", "NUMBER", "IDENTIFIER", "WS",
	}
	staticData.RuleNames = []string{
		"LPAREN", "RPAREN", "COMMA", "EQUALS", "NOT_EQUALS", "NEQ", "LT", "LE",
		"GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT", "NOT", "AND",
		"OR", "BOOL", "SIGN", "NUMBER", "IDENTIFIER", "WS", "DIGIT",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 0, 22, 189, 6, -1, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2,
		4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2,
		10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15,
		7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19, 2, 20, 7,
		20, 2, 21, 7, 21, 2, 22, 7, 22, 2, 23, 7, 23, 1, 0, 1, 0, 1, 1, 1, 1, 1,
		2, 1, 2, 1, 3, 1, 3, 1, 3, 3, 3, 59, 8, 3, 1, 4, 1, 4, 1, 4, 1, 5, 1, 5,
		1, 5, 1, 6, 1, 6, 1, 7, 1, 7, 1, 7, 1, 8, 1, 8, 1, 9, 1, 9, 1, 9, 1, 10,
		1, 10, 1, 11, 1, 11, 1, 12, 1, 12, 1, 13, 1, 13, 1, 14, 1, 14, 1, 15, 1,
		15, 1, 15, 1, 15, 1, 16, 1, 16, 1, 16, 1, 16, 1, 17, 1, 17, 1, 17, 1, 18,
		1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 3, 18, 107, 8,
		18, 1, 19, 1, 19, 1, 20, 3, 20, 112, 8, 20, 1, 20, 4, 20, 115, 8, 20, 11,
		20, 12, 20, 116, 1, 20, 1, 20, 5, 20, 121, 8, 20, 10, 20, 12, 20, 124,
		9, 20, 3, 20, 126, 8, 20, 1, 20, 1, 20, 3, 20, 130, 8, 20, 1, 20, 4, 20,
		133, 8, 20, 11, 20, 12, 20, 134, 3, 20, 137, 8, 20, 1, 20, 3, 20, 140,
		8, 20, 1, 20, 1, 20, 4, 20, 144, 8, 20, 11, 20, 12, 20, 145, 1, 20, 1,
		20, 3, 20, 150, 8, 20, 1, 20, 4, 20, 153, 8, 20, 11, 20, 12, 20, 154, 3,
		20, 157, 8, 20, 3, 20, 159, 8, 20, 1, 21, 1, 21, 5, 21, 163, 8, 21, 10,
		21, 12, 21, 166, 9, 21, 1, 21, 1, 21, 1, 21, 5, 21, 171, 8, 21, 10, 21,
		12, 21, 174, 9, 21, 5, 21, 176, 8, 21, 10, 21, 12, 21, 179, 9, 21, 1, 22,
		4, 22, 182, 8, 22, 11, 22, 12, 22, 183, 1, 22, 1, 22, 1, 23, 1, 23, 0,
		0, 24, 1, 1, 3, 2, 5, 3, 7, 4, 9, 5, 11, 6, 13, 7, 15, 8, 17, 9, 19, 10,
		21, 11, 23, 12, 25, 13, 27, 14, 29, 15, 31, 16, 33, 17, 35, 18, 37, 19,
		39, 0, 41, 20, 43, 21, 45, 22, 47, 0, 1, 0, 16, 2, 0, 78, 78, 110, 110,
		2, 0, 79, 79, 111, 111, 2, 0, 84, 84, 116, 116, 2, 0, 65, 65, 97, 97, 2,
		0, 68, 68, 100, 100, 2, 0, 82, 82, 114, 114, 2, 0, 85, 85, 117, 117, 2,
		0, 69, 69, 101, 101, 2, 0, 70, 70, 102, 102, 2, 0, 76, 76, 108, 108, 2,
		0, 83, 83, 115, 115, 2, 0, 43, 43, 45, 45, 3, 0, 65, 90, 95, 95, 97, 122,
		4, 0, 48, 57, 65, 90, 95, 95, 97, 122, 3, 0, 9, 10, 13, 13, 32, 32, 1,
		0, 48, 57, 205, 0, 1, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0,
		7, 1, 0, 0, 0, 0, 9, 1, 0, 0, 0, 0, 11, 1, 0, 0, 0, 0, 13, 1, 0, 0, 0,
		0, 15, 1, 0, 0, 0, 0, 17, 1, 0, 0, 0, 0, 19, 1, 0, 0, 0, 0, 21, 1, 0, 0,
		0, 0, 23, 1, 0, 0, 0, 0, 25, 1, 0, 0, 0, 0, 27, 1, 0, 0, 0, 0, 29, 1, 0,
		0, 0, 0, 31, 1, 0, 0, 0, 0, 33, 1, 0, 0, 0, 0, 35, 1, 0, 0, 0, 0, 37, 1,
		0, 0, 0, 0, 41, 1, 0, 0, 0, 0, 43, 1, 0, 0, 0, 0, 45, 1, 0, 0, 0, 1, 49,
		1, 0, 0, 0, 3, 51, 1, 0, 0, 0, 5, 53, 1, 0, 0, 0, 7, 58, 1, 0, 0, 0, 9,
		60, 1, 0, 0, 0, 11, 63, 1, 0, 0, 0, 13, 66, 1, 0, 0, 0, 15, 68, 1, 0, 0,
		0, 17, 71, 1, 0, 0, 0, 19, 73, 1, 0, 0, 0, 21, 76, 1, 0, 0, 0, 23, 78,
		1, 0, 0, 0, 25, 80, 1, 0, 0, 0, 27, 82, 1, 0, 0, 0, 29, 84, 1, 0, 0, 0,
		31, 86, 1, 0, 0, 0, 33, 90, 1, 0, 0, 0, 35, 94, 1, 0, 0, 0, 37, 106, 1,
		0, 0, 0, 39, 108, 1, 0, 0, 0, 41, 158, 1, 0, 0, 0, 43, 160, 1, 0, 0, 0,
		45, 181, 1, 0, 0, 0, 47, 187, 1, 0, 0, 0, 49, 50, 5, 40, 0, 0, 50, 2, 1,
		0, 0, 0, 51, 52, 5, 41, 0, 0, 52, 4, 1, 0, 0, 0, 53, 54, 5, 44, 0, 0, 54,
		6, 1, 0, 0, 0, 55, 59, 5, 61, 0, 0, 56, 57, 5, 61, 0, 0, 57, 59, 5, 61,
		0, 0, 58, 55, 1, 0, 0, 0, 58, 56, 1, 0, 0, 0, 59, 8, 1, 0, 0, 0, 60, 61,
		5, 33, 0, 0, 61, 62, 5, 61, 0, 0, 62, 10, 1, 0, 0, 0, 63, 64, 5, 60, 0,
		0, 64, 65, 5, 62, 0, 0, 65, 12, 1, 0, 0, 0, 66, 67, 5, 60, 0, 0, 67, 14,
		1, 0, 0, 0, 68, 69, 5, 60, 0, 0, 69, 70, 5, 61, 0, 0, 70, 16, 1, 0, 0,
		0, 71, 72, 5, 62, 0, 0, 72, 18, 1, 0, 0, 0, 73, 74, 5, 62, 0, 0, 74, 75,
		5, 61, 0, 0, 75, 20, 1, 0, 0, 0, 76, 77, 5, 43, 0, 0, 77, 22, 1, 0, 0,
		0, 78, 79, 5, 45, 0, 0, 79, 24, 1, 0, 0, 0, 80, 81, 5, 42, 0, 0, 81, 26,
		1, 0, 0, 0, 82, 83, 5, 47, 0, 0, 83, 28, 1, 0, 0, 0, 84, 85, 5, 37, 0,
		0, 85, 30, 1, 0, 0, 0, 86, 87, 7, 0, 0, 0, 87, 88, 7, 1, 0, 0, 88, 89,
		7, 2, 0, 0, 89, 32, 1, 0, 0, 0, 90, 91, 7, 3, 0, 0, 91, 92, 7, 0, 0, 0,
		92, 93, 7, 4, 0, 0, 93, 34, 1, 0, 0, 0, 94, 95, 7, 1, 0, 0, 95, 96, 7,
		5, 0, 0, 96, 36, 1, 0, 0, 0, 97, 98, 7, 2, 0, 0, 98, 99, 7, 5, 0, 0, 99,
		100, 7, 6, 0, 0, 100, 107, 7, 7, 0, 0, 101, 102, 7, 8, 0, 0, 102, 103,
		7, 3, 0, 0, 103, 104, 7, 9, 0, 0, 104, 105, 7, 10, 0, 0, 105, 107, 7, 7,
		0, 0, 106, 97, 1, 0, 0, 0, 106, 101, 1, 0, 0, 0, 107, 38, 1, 0, 0, 0, 108,
		109, 7, 11, 0, 0, 109, 40, 1, 0, 0, 0, 110, 112, 3, 39, 19, 0, 111, 110,
		1, 0, 0, 0, 111, 112, 1, 0, 0, 0, 112, 114, 1, 0, 0, 0, 113, 115, 3, 47,
		23, 0, 114, 113, 1, 0, 0, 0, 115, 116, 1, 0, 0, 0, 116, 114, 1, 0, 0, 0,
		116, 117, 1, 0, 0, 0, 117, 125, 1, 0, 0, 0, 118, 122, 5, 46, 0, 0, 119,
		121, 3, 47, 23, 0, 120, 119, 1, 0, 0, 0, 121, 124, 1, 0, 0, 0, 122, 120,
		1, 0, 0, 0, 122, 123, 1, 0, 0, 0, 123, 126, 1, 0, 0, 0, 124, 122, 1, 0,
		0, 0, 125, 118, 1, 0, 0, 0, 125, 126, 1, 0, 0, 0, 126, 136, 1, 0, 0, 0,
		127, 129, 7, 7, 0, 0, 128, 130, 3, 39, 19, 0, 129, 128, 1, 0, 0, 0, 129,
		130, 1, 0, 0, 0, 130, 132, 1, 0, 0, 0, 131, 133, 3, 47, 23, 0, 132, 131,
		1, 0, 0, 0, 133, 134, 1, 0, 0, 0, 134, 132, 1, 0, 0, 0, 134, 135, 1, 0,
		0, 0, 135, 137, 1, 0, 0, 0, 136, 127, 1, 0, 0, 0, 136, 137, 1, 0, 0, 0,
		137, 159, 1, 0, 0, 0, 138, 140, 3, 39, 19, 0, 139, 138, 1, 0, 0, 0, 139,
		140, 1, 0, 0, 0, 140, 141, 1, 0, 0, 0, 141, 143, 5, 46, 0, 0, 142, 144,
		3, 47, 23, 0, 143, 142, 1, 0, 0, 0, 144, 145, 1, 0, 0, 0, 145, 143, 1,
		0, 0, 0, 145, 146, 1, 0, 0, 0, 146, 156, 1, 0, 0, 0, 147, 149, 7, 7, 0,
		0, 148, 150, 3, 39, 19, 0, 149, 148, 1, 0, 0, 0, 149, 150, 1, 0, 0, 0,
		150, 152, 1, 0, 0, 0, 151, 153, 3, 47, 23, 0, 152, 151, 1, 0, 0, 0, 153,
		154, 1, 0, 0, 0, 154, 152, 1, 0, 0, 0, 154, 155, 1, 0, 0, 0, 155, 157,
		1, 0, 0, 0, 156, 147, 1, 0, 0, 0, 156, 157, 1, 0, 0, 0, 157, 159, 1, 0,
		0, 0, 158, 111, 1, 0, 0, 0, 158, 139, 1, 0, 0, 0, 159, 42, 1, 0, 0, 0,
		160, 164, 7, 12, 0, 0, 161, 163, 7, 13, 0, 0, 162, 161, 1, 0, 0, 0, 163,
		166, 1, 0, 0, 0, 164, 162, 1, 0, 0, 0, 164, 165, 1, 0, 0, 0, 165, 177,
		1, 0, 0, 0, 166, 164, 1, 0, 0, 0, 167, 168, 5, 46, 0, 0, 168, 172, 7, 12,
		0, 0, 169, 171, 7, 13, 0, 0, 170, 169, 1, 0, 0, 0, 171, 174, 1, 0, 0, 0,
		172, 170, 1, 0, 0, 0, 172, 173, 1, 0, 0, 0, 173, 176, 1, 0, 0, 0, 174,
		172, 1, 0, 0, 0, 175, 167, 1, 0, 0, 0, 176, 179, 1, 0, 0, 0, 177, 175,
		1, 0, 0, 0, 177, 178, 1, 0, 0, 0, 178, 44, 1, 0, 0, 0, 179, 177, 1, 0,
		0, 0, 180, 182, 7, 14, 0, 0, 181, 180, 1, 0, 0, 0, 182, 183, 1, 0, 0, 0,
		183, 181, 1, 0, 0, 0, 183, 184, 1, 0, 0, 0, 184, 185, 1, 0, 0, 0, 185,
		186, 6, 22, 0, 0, 186, 46, 1, 0, 0, 0, 187, 188, 7, 15, 0, 0, 188, 48,
		1, 0, 0, 0, 20, 0, 58, 106, 111, 116, 122, 125, 129, 134, 136, 139, 145,
		149, 154, 156, 158, 164, 172, 177, 183, 1, 6, 0, 0,
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

// HavingExpressionLexerInit initializes any static state used to implement HavingExpressionLexer. By default the
// static state used to implement the lexer is lazily initialized during the first call to
// NewHavingExpressionLexer(). You can call this function if you wish to initialize the static state ahead
// of time.
func HavingExpressionLexerInit() {
	staticData := &HavingExpressionLexerLexerStaticData
	staticData.once.Do(havingexpressionlexerLexerInit)
}

// NewHavingExpressionLexer produces a new lexer instance for the optional input antlr.CharStream.
func NewHavingExpressionLexer(input antlr.CharStream) *HavingExpressionLexer {
	HavingExpressionLexerInit()
	l := new(HavingExpressionLexer)
	l.BaseLexer = antlr.NewBaseLexer(input)
	staticData := &HavingExpressionLexerLexerStaticData
	l.Interpreter = antlr.NewLexerATNSimulator(l, staticData.atn, staticData.decisionToDFA, staticData.PredictionContextCache)
	l.channelNames = staticData.ChannelNames
	l.modeNames = staticData.ModeNames
	l.RuleNames = staticData.RuleNames
	l.LiteralNames = staticData.LiteralNames
	l.SymbolicNames = staticData.SymbolicNames
	l.GrammarFileName = "HavingExpression.g4"
	// TODO: l.EOF = antlr.TokenEOF

	return l
}

// HavingExpressionLexer tokens.
const (
	HavingExpressionLexerLPAREN     = 1
	HavingExpressionLexerRPAREN     = 2
	HavingExpressionLexerCOMMA      = 3
	HavingExpressionLexerEQUALS     = 4
	HavingExpressionLexerNOT_EQUALS = 5
	HavingExpressionLexerNEQ        = 6
	HavingExpressionLexerLT         = 7
	HavingExpressionLexerLE         = 8
	HavingExpressionLexerGT         = 9
	HavingExpressionLexerGE         = 10
	HavingExpressionLexerPLUS       = 11
	HavingExpressionLexerMINUS      = 12
	HavingExpressionLexerSTAR       = 13
	HavingExpressionLexerSLASH      = 14
	HavingExpressionLexerPERCENT    = 15
	HavingExpressionLexerNOT        = 16
	HavingExpressionLexerAND        = 17
	HavingExpressionLexerOR         = 18
	HavingExpressionLexerBOOL       = 19
	HavingExpressionLexerNUMBER     = 20
	HavingExpressionLexerIDENTIFIER = 21
	HavingExpressionLexerWS         = 22
)
