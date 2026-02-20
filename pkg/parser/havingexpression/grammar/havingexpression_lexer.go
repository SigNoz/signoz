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
		"AND", "OR", "BOOL", "NUMBER", "QUOTED_TEXT", "IDENTIFIER", "WS",
	}
	staticData.RuleNames = []string{
		"LPAREN", "RPAREN", "COMMA", "EQUALS", "NOT_EQUALS", "NEQ", "LT", "LE",
		"GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT", "NOT", "AND",
		"OR", "BOOL", "SIGN", "NUMBER", "QUOTED_TEXT", "IDENTIFIER", "WS", "DIGIT",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 0, 23, 213, 6, -1, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2,
		4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2,
		10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15,
		7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19, 2, 20, 7,
		20, 2, 21, 7, 21, 2, 22, 7, 22, 2, 23, 7, 23, 2, 24, 7, 24, 1, 0, 1, 0,
		1, 1, 1, 1, 1, 2, 1, 2, 1, 3, 1, 3, 1, 3, 3, 3, 61, 8, 3, 1, 4, 1, 4, 1,
		4, 1, 5, 1, 5, 1, 5, 1, 6, 1, 6, 1, 7, 1, 7, 1, 7, 1, 8, 1, 8, 1, 9, 1,
		9, 1, 9, 1, 10, 1, 10, 1, 11, 1, 11, 1, 12, 1, 12, 1, 13, 1, 13, 1, 14,
		1, 14, 1, 15, 1, 15, 1, 15, 1, 15, 1, 16, 1, 16, 1, 16, 1, 16, 1, 17, 1,
		17, 1, 17, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18, 1, 18,
		3, 18, 109, 8, 18, 1, 19, 1, 19, 1, 20, 3, 20, 114, 8, 20, 1, 20, 4, 20,
		117, 8, 20, 11, 20, 12, 20, 118, 1, 20, 1, 20, 5, 20, 123, 8, 20, 10, 20,
		12, 20, 126, 9, 20, 3, 20, 128, 8, 20, 1, 20, 1, 20, 3, 20, 132, 8, 20,
		1, 20, 4, 20, 135, 8, 20, 11, 20, 12, 20, 136, 3, 20, 139, 8, 20, 1, 20,
		3, 20, 142, 8, 20, 1, 20, 1, 20, 4, 20, 146, 8, 20, 11, 20, 12, 20, 147,
		1, 20, 1, 20, 3, 20, 152, 8, 20, 1, 20, 4, 20, 155, 8, 20, 11, 20, 12,
		20, 156, 3, 20, 159, 8, 20, 3, 20, 161, 8, 20, 1, 21, 1, 21, 1, 21, 1,
		21, 5, 21, 167, 8, 21, 10, 21, 12, 21, 170, 9, 21, 1, 21, 1, 21, 1, 21,
		1, 21, 1, 21, 5, 21, 177, 8, 21, 10, 21, 12, 21, 180, 9, 21, 1, 21, 3,
		21, 183, 8, 21, 1, 22, 1, 22, 5, 22, 187, 8, 22, 10, 22, 12, 22, 190, 9,
		22, 1, 22, 1, 22, 1, 22, 5, 22, 195, 8, 22, 10, 22, 12, 22, 198, 9, 22,
		5, 22, 200, 8, 22, 10, 22, 12, 22, 203, 9, 22, 1, 23, 4, 23, 206, 8, 23,
		11, 23, 12, 23, 207, 1, 23, 1, 23, 1, 24, 1, 24, 0, 0, 25, 1, 1, 3, 2,
		5, 3, 7, 4, 9, 5, 11, 6, 13, 7, 15, 8, 17, 9, 19, 10, 21, 11, 23, 12, 25,
		13, 27, 14, 29, 15, 31, 16, 33, 17, 35, 18, 37, 19, 39, 0, 41, 20, 43,
		21, 45, 22, 47, 23, 49, 0, 1, 0, 18, 2, 0, 78, 78, 110, 110, 2, 0, 79,
		79, 111, 111, 2, 0, 84, 84, 116, 116, 2, 0, 65, 65, 97, 97, 2, 0, 68, 68,
		100, 100, 2, 0, 82, 82, 114, 114, 2, 0, 85, 85, 117, 117, 2, 0, 69, 69,
		101, 101, 2, 0, 70, 70, 102, 102, 2, 0, 76, 76, 108, 108, 2, 0, 83, 83,
		115, 115, 2, 0, 43, 43, 45, 45, 2, 0, 34, 34, 92, 92, 2, 0, 39, 39, 92,
		92, 3, 0, 65, 90, 95, 95, 97, 122, 4, 0, 48, 57, 65, 90, 95, 95, 97, 122,
		3, 0, 9, 10, 13, 13, 32, 32, 1, 0, 48, 57, 234, 0, 1, 1, 0, 0, 0, 0, 3,
		1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 9, 1, 0, 0, 0, 0, 11,
		1, 0, 0, 0, 0, 13, 1, 0, 0, 0, 0, 15, 1, 0, 0, 0, 0, 17, 1, 0, 0, 0, 0,
		19, 1, 0, 0, 0, 0, 21, 1, 0, 0, 0, 0, 23, 1, 0, 0, 0, 0, 25, 1, 0, 0, 0,
		0, 27, 1, 0, 0, 0, 0, 29, 1, 0, 0, 0, 0, 31, 1, 0, 0, 0, 0, 33, 1, 0, 0,
		0, 0, 35, 1, 0, 0, 0, 0, 37, 1, 0, 0, 0, 0, 41, 1, 0, 0, 0, 0, 43, 1, 0,
		0, 0, 0, 45, 1, 0, 0, 0, 0, 47, 1, 0, 0, 0, 1, 51, 1, 0, 0, 0, 3, 53, 1,
		0, 0, 0, 5, 55, 1, 0, 0, 0, 7, 60, 1, 0, 0, 0, 9, 62, 1, 0, 0, 0, 11, 65,
		1, 0, 0, 0, 13, 68, 1, 0, 0, 0, 15, 70, 1, 0, 0, 0, 17, 73, 1, 0, 0, 0,
		19, 75, 1, 0, 0, 0, 21, 78, 1, 0, 0, 0, 23, 80, 1, 0, 0, 0, 25, 82, 1,
		0, 0, 0, 27, 84, 1, 0, 0, 0, 29, 86, 1, 0, 0, 0, 31, 88, 1, 0, 0, 0, 33,
		92, 1, 0, 0, 0, 35, 96, 1, 0, 0, 0, 37, 108, 1, 0, 0, 0, 39, 110, 1, 0,
		0, 0, 41, 160, 1, 0, 0, 0, 43, 182, 1, 0, 0, 0, 45, 184, 1, 0, 0, 0, 47,
		205, 1, 0, 0, 0, 49, 211, 1, 0, 0, 0, 51, 52, 5, 40, 0, 0, 52, 2, 1, 0,
		0, 0, 53, 54, 5, 41, 0, 0, 54, 4, 1, 0, 0, 0, 55, 56, 5, 44, 0, 0, 56,
		6, 1, 0, 0, 0, 57, 61, 5, 61, 0, 0, 58, 59, 5, 61, 0, 0, 59, 61, 5, 61,
		0, 0, 60, 57, 1, 0, 0, 0, 60, 58, 1, 0, 0, 0, 61, 8, 1, 0, 0, 0, 62, 63,
		5, 33, 0, 0, 63, 64, 5, 61, 0, 0, 64, 10, 1, 0, 0, 0, 65, 66, 5, 60, 0,
		0, 66, 67, 5, 62, 0, 0, 67, 12, 1, 0, 0, 0, 68, 69, 5, 60, 0, 0, 69, 14,
		1, 0, 0, 0, 70, 71, 5, 60, 0, 0, 71, 72, 5, 61, 0, 0, 72, 16, 1, 0, 0,
		0, 73, 74, 5, 62, 0, 0, 74, 18, 1, 0, 0, 0, 75, 76, 5, 62, 0, 0, 76, 77,
		5, 61, 0, 0, 77, 20, 1, 0, 0, 0, 78, 79, 5, 43, 0, 0, 79, 22, 1, 0, 0,
		0, 80, 81, 5, 45, 0, 0, 81, 24, 1, 0, 0, 0, 82, 83, 5, 42, 0, 0, 83, 26,
		1, 0, 0, 0, 84, 85, 5, 47, 0, 0, 85, 28, 1, 0, 0, 0, 86, 87, 5, 37, 0,
		0, 87, 30, 1, 0, 0, 0, 88, 89, 7, 0, 0, 0, 89, 90, 7, 1, 0, 0, 90, 91,
		7, 2, 0, 0, 91, 32, 1, 0, 0, 0, 92, 93, 7, 3, 0, 0, 93, 94, 7, 0, 0, 0,
		94, 95, 7, 4, 0, 0, 95, 34, 1, 0, 0, 0, 96, 97, 7, 1, 0, 0, 97, 98, 7,
		5, 0, 0, 98, 36, 1, 0, 0, 0, 99, 100, 7, 2, 0, 0, 100, 101, 7, 5, 0, 0,
		101, 102, 7, 6, 0, 0, 102, 109, 7, 7, 0, 0, 103, 104, 7, 8, 0, 0, 104,
		105, 7, 3, 0, 0, 105, 106, 7, 9, 0, 0, 106, 107, 7, 10, 0, 0, 107, 109,
		7, 7, 0, 0, 108, 99, 1, 0, 0, 0, 108, 103, 1, 0, 0, 0, 109, 38, 1, 0, 0,
		0, 110, 111, 7, 11, 0, 0, 111, 40, 1, 0, 0, 0, 112, 114, 3, 39, 19, 0,
		113, 112, 1, 0, 0, 0, 113, 114, 1, 0, 0, 0, 114, 116, 1, 0, 0, 0, 115,
		117, 3, 49, 24, 0, 116, 115, 1, 0, 0, 0, 117, 118, 1, 0, 0, 0, 118, 116,
		1, 0, 0, 0, 118, 119, 1, 0, 0, 0, 119, 127, 1, 0, 0, 0, 120, 124, 5, 46,
		0, 0, 121, 123, 3, 49, 24, 0, 122, 121, 1, 0, 0, 0, 123, 126, 1, 0, 0,
		0, 124, 122, 1, 0, 0, 0, 124, 125, 1, 0, 0, 0, 125, 128, 1, 0, 0, 0, 126,
		124, 1, 0, 0, 0, 127, 120, 1, 0, 0, 0, 127, 128, 1, 0, 0, 0, 128, 138,
		1, 0, 0, 0, 129, 131, 7, 7, 0, 0, 130, 132, 3, 39, 19, 0, 131, 130, 1,
		0, 0, 0, 131, 132, 1, 0, 0, 0, 132, 134, 1, 0, 0, 0, 133, 135, 3, 49, 24,
		0, 134, 133, 1, 0, 0, 0, 135, 136, 1, 0, 0, 0, 136, 134, 1, 0, 0, 0, 136,
		137, 1, 0, 0, 0, 137, 139, 1, 0, 0, 0, 138, 129, 1, 0, 0, 0, 138, 139,
		1, 0, 0, 0, 139, 161, 1, 0, 0, 0, 140, 142, 3, 39, 19, 0, 141, 140, 1,
		0, 0, 0, 141, 142, 1, 0, 0, 0, 142, 143, 1, 0, 0, 0, 143, 145, 5, 46, 0,
		0, 144, 146, 3, 49, 24, 0, 145, 144, 1, 0, 0, 0, 146, 147, 1, 0, 0, 0,
		147, 145, 1, 0, 0, 0, 147, 148, 1, 0, 0, 0, 148, 158, 1, 0, 0, 0, 149,
		151, 7, 7, 0, 0, 150, 152, 3, 39, 19, 0, 151, 150, 1, 0, 0, 0, 151, 152,
		1, 0, 0, 0, 152, 154, 1, 0, 0, 0, 153, 155, 3, 49, 24, 0, 154, 153, 1,
		0, 0, 0, 155, 156, 1, 0, 0, 0, 156, 154, 1, 0, 0, 0, 156, 157, 1, 0, 0,
		0, 157, 159, 1, 0, 0, 0, 158, 149, 1, 0, 0, 0, 158, 159, 1, 0, 0, 0, 159,
		161, 1, 0, 0, 0, 160, 113, 1, 0, 0, 0, 160, 141, 1, 0, 0, 0, 161, 42, 1,
		0, 0, 0, 162, 168, 5, 34, 0, 0, 163, 167, 8, 12, 0, 0, 164, 165, 5, 92,
		0, 0, 165, 167, 9, 0, 0, 0, 166, 163, 1, 0, 0, 0, 166, 164, 1, 0, 0, 0,
		167, 170, 1, 0, 0, 0, 168, 166, 1, 0, 0, 0, 168, 169, 1, 0, 0, 0, 169,
		171, 1, 0, 0, 0, 170, 168, 1, 0, 0, 0, 171, 183, 5, 34, 0, 0, 172, 178,
		5, 39, 0, 0, 173, 177, 8, 13, 0, 0, 174, 175, 5, 92, 0, 0, 175, 177, 9,
		0, 0, 0, 176, 173, 1, 0, 0, 0, 176, 174, 1, 0, 0, 0, 177, 180, 1, 0, 0,
		0, 178, 176, 1, 0, 0, 0, 178, 179, 1, 0, 0, 0, 179, 181, 1, 0, 0, 0, 180,
		178, 1, 0, 0, 0, 181, 183, 5, 39, 0, 0, 182, 162, 1, 0, 0, 0, 182, 172,
		1, 0, 0, 0, 183, 44, 1, 0, 0, 0, 184, 188, 7, 14, 0, 0, 185, 187, 7, 15,
		0, 0, 186, 185, 1, 0, 0, 0, 187, 190, 1, 0, 0, 0, 188, 186, 1, 0, 0, 0,
		188, 189, 1, 0, 0, 0, 189, 201, 1, 0, 0, 0, 190, 188, 1, 0, 0, 0, 191,
		192, 5, 46, 0, 0, 192, 196, 7, 14, 0, 0, 193, 195, 7, 15, 0, 0, 194, 193,
		1, 0, 0, 0, 195, 198, 1, 0, 0, 0, 196, 194, 1, 0, 0, 0, 196, 197, 1, 0,
		0, 0, 197, 200, 1, 0, 0, 0, 198, 196, 1, 0, 0, 0, 199, 191, 1, 0, 0, 0,
		200, 203, 1, 0, 0, 0, 201, 199, 1, 0, 0, 0, 201, 202, 1, 0, 0, 0, 202,
		46, 1, 0, 0, 0, 203, 201, 1, 0, 0, 0, 204, 206, 7, 16, 0, 0, 205, 204,
		1, 0, 0, 0, 206, 207, 1, 0, 0, 0, 207, 205, 1, 0, 0, 0, 207, 208, 1, 0,
		0, 0, 208, 209, 1, 0, 0, 0, 209, 210, 6, 23, 0, 0, 210, 48, 1, 0, 0, 0,
		211, 212, 7, 17, 0, 0, 212, 50, 1, 0, 0, 0, 25, 0, 60, 108, 113, 118, 124,
		127, 131, 136, 138, 141, 147, 151, 156, 158, 160, 166, 168, 176, 178, 182,
		188, 196, 201, 207, 1, 6, 0, 0,
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
	HavingExpressionLexerLPAREN      = 1
	HavingExpressionLexerRPAREN      = 2
	HavingExpressionLexerCOMMA       = 3
	HavingExpressionLexerEQUALS      = 4
	HavingExpressionLexerNOT_EQUALS  = 5
	HavingExpressionLexerNEQ         = 6
	HavingExpressionLexerLT          = 7
	HavingExpressionLexerLE          = 8
	HavingExpressionLexerGT          = 9
	HavingExpressionLexerGE          = 10
	HavingExpressionLexerPLUS        = 11
	HavingExpressionLexerMINUS       = 12
	HavingExpressionLexerSTAR        = 13
	HavingExpressionLexerSLASH       = 14
	HavingExpressionLexerPERCENT     = 15
	HavingExpressionLexerNOT         = 16
	HavingExpressionLexerAND         = 17
	HavingExpressionLexerOR          = 18
	HavingExpressionLexerBOOL        = 19
	HavingExpressionLexerNUMBER      = 20
	HavingExpressionLexerQUOTED_TEXT = 21
	HavingExpressionLexerIDENTIFIER  = 22
	HavingExpressionLexerWS          = 23
)
