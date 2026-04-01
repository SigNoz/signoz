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
		"LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "EQUALS", "NOT_EQUALS",
		"NEQ", "LT", "LE", "GT", "GE", "PLUS", "MINUS", "STAR", "SLASH", "PERCENT",
		"NOT", "AND", "OR", "IN", "BOOL", "SIGN", "NUMBER", "IDENTIFIER", "STRING",
		"WS", "DIGIT",
	}
	staticData.PredictionContextCache = antlr.NewPredictionContextCache()
	staticData.serializedATN = []int32{
		4, 0, 26, 222, 6, -1, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2,
		4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2,
		10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15,
		7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19, 2, 20, 7,
		20, 2, 21, 7, 21, 2, 22, 7, 22, 2, 23, 7, 23, 2, 24, 7, 24, 2, 25, 7, 25,
		2, 26, 7, 26, 2, 27, 7, 27, 1, 0, 1, 0, 1, 1, 1, 1, 1, 2, 1, 2, 1, 3, 1,
		3, 1, 4, 1, 4, 1, 5, 1, 5, 1, 5, 3, 5, 71, 8, 5, 1, 6, 1, 6, 1, 6, 1, 7,
		1, 7, 1, 7, 1, 8, 1, 8, 1, 9, 1, 9, 1, 9, 1, 10, 1, 10, 1, 11, 1, 11, 1,
		11, 1, 12, 1, 12, 1, 13, 1, 13, 1, 14, 1, 14, 1, 15, 1, 15, 1, 16, 1, 16,
		1, 17, 1, 17, 1, 17, 1, 17, 1, 18, 1, 18, 1, 18, 1, 18, 1, 19, 1, 19, 1,
		19, 1, 20, 1, 20, 1, 20, 1, 21, 1, 21, 1, 21, 1, 21, 1, 21, 1, 21, 1, 21,
		1, 21, 1, 21, 3, 21, 122, 8, 21, 1, 22, 1, 22, 1, 23, 3, 23, 127, 8, 23,
		1, 23, 4, 23, 130, 8, 23, 11, 23, 12, 23, 131, 1, 23, 1, 23, 5, 23, 136,
		8, 23, 10, 23, 12, 23, 139, 9, 23, 3, 23, 141, 8, 23, 1, 23, 1, 23, 3,
		23, 145, 8, 23, 1, 23, 4, 23, 148, 8, 23, 11, 23, 12, 23, 149, 3, 23, 152,
		8, 23, 1, 23, 3, 23, 155, 8, 23, 1, 23, 1, 23, 4, 23, 159, 8, 23, 11, 23,
		12, 23, 160, 1, 23, 1, 23, 3, 23, 165, 8, 23, 1, 23, 4, 23, 168, 8, 23,
		11, 23, 12, 23, 169, 3, 23, 172, 8, 23, 3, 23, 174, 8, 23, 1, 24, 1, 24,
		5, 24, 178, 8, 24, 10, 24, 12, 24, 181, 9, 24, 1, 24, 1, 24, 1, 24, 5,
		24, 186, 8, 24, 10, 24, 12, 24, 189, 9, 24, 5, 24, 191, 8, 24, 10, 24,
		12, 24, 194, 9, 24, 1, 25, 1, 25, 5, 25, 198, 8, 25, 10, 25, 12, 25, 201,
		9, 25, 1, 25, 1, 25, 1, 25, 5, 25, 206, 8, 25, 10, 25, 12, 25, 209, 9,
		25, 1, 25, 3, 25, 212, 8, 25, 1, 26, 4, 26, 215, 8, 26, 11, 26, 12, 26,
		216, 1, 26, 1, 26, 1, 27, 1, 27, 0, 0, 28, 1, 1, 3, 2, 5, 3, 7, 4, 9, 5,
		11, 6, 13, 7, 15, 8, 17, 9, 19, 10, 21, 11, 23, 12, 25, 13, 27, 14, 29,
		15, 31, 16, 33, 17, 35, 18, 37, 19, 39, 20, 41, 21, 43, 22, 45, 0, 47,
		23, 49, 24, 51, 25, 53, 26, 55, 0, 1, 0, 19, 2, 0, 78, 78, 110, 110, 2,
		0, 79, 79, 111, 111, 2, 0, 84, 84, 116, 116, 2, 0, 65, 65, 97, 97, 2, 0,
		68, 68, 100, 100, 2, 0, 82, 82, 114, 114, 2, 0, 73, 73, 105, 105, 2, 0,
		85, 85, 117, 117, 2, 0, 69, 69, 101, 101, 2, 0, 70, 70, 102, 102, 2, 0,
		76, 76, 108, 108, 2, 0, 83, 83, 115, 115, 2, 0, 43, 43, 45, 45, 3, 0, 65,
		90, 95, 95, 97, 122, 4, 0, 48, 57, 65, 90, 95, 95, 97, 122, 1, 0, 39, 39,
		1, 0, 34, 34, 3, 0, 9, 10, 13, 13, 32, 32, 1, 0, 48, 57, 241, 0, 1, 1,
		0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 9, 1,
		0, 0, 0, 0, 11, 1, 0, 0, 0, 0, 13, 1, 0, 0, 0, 0, 15, 1, 0, 0, 0, 0, 17,
		1, 0, 0, 0, 0, 19, 1, 0, 0, 0, 0, 21, 1, 0, 0, 0, 0, 23, 1, 0, 0, 0, 0,
		25, 1, 0, 0, 0, 0, 27, 1, 0, 0, 0, 0, 29, 1, 0, 0, 0, 0, 31, 1, 0, 0, 0,
		0, 33, 1, 0, 0, 0, 0, 35, 1, 0, 0, 0, 0, 37, 1, 0, 0, 0, 0, 39, 1, 0, 0,
		0, 0, 41, 1, 0, 0, 0, 0, 43, 1, 0, 0, 0, 0, 47, 1, 0, 0, 0, 0, 49, 1, 0,
		0, 0, 0, 51, 1, 0, 0, 0, 0, 53, 1, 0, 0, 0, 1, 57, 1, 0, 0, 0, 3, 59, 1,
		0, 0, 0, 5, 61, 1, 0, 0, 0, 7, 63, 1, 0, 0, 0, 9, 65, 1, 0, 0, 0, 11, 70,
		1, 0, 0, 0, 13, 72, 1, 0, 0, 0, 15, 75, 1, 0, 0, 0, 17, 78, 1, 0, 0, 0,
		19, 80, 1, 0, 0, 0, 21, 83, 1, 0, 0, 0, 23, 85, 1, 0, 0, 0, 25, 88, 1,
		0, 0, 0, 27, 90, 1, 0, 0, 0, 29, 92, 1, 0, 0, 0, 31, 94, 1, 0, 0, 0, 33,
		96, 1, 0, 0, 0, 35, 98, 1, 0, 0, 0, 37, 102, 1, 0, 0, 0, 39, 106, 1, 0,
		0, 0, 41, 109, 1, 0, 0, 0, 43, 121, 1, 0, 0, 0, 45, 123, 1, 0, 0, 0, 47,
		173, 1, 0, 0, 0, 49, 175, 1, 0, 0, 0, 51, 211, 1, 0, 0, 0, 53, 214, 1,
		0, 0, 0, 55, 220, 1, 0, 0, 0, 57, 58, 5, 40, 0, 0, 58, 2, 1, 0, 0, 0, 59,
		60, 5, 41, 0, 0, 60, 4, 1, 0, 0, 0, 61, 62, 5, 91, 0, 0, 62, 6, 1, 0, 0,
		0, 63, 64, 5, 93, 0, 0, 64, 8, 1, 0, 0, 0, 65, 66, 5, 44, 0, 0, 66, 10,
		1, 0, 0, 0, 67, 71, 5, 61, 0, 0, 68, 69, 5, 61, 0, 0, 69, 71, 5, 61, 0,
		0, 70, 67, 1, 0, 0, 0, 70, 68, 1, 0, 0, 0, 71, 12, 1, 0, 0, 0, 72, 73,
		5, 33, 0, 0, 73, 74, 5, 61, 0, 0, 74, 14, 1, 0, 0, 0, 75, 76, 5, 60, 0,
		0, 76, 77, 5, 62, 0, 0, 77, 16, 1, 0, 0, 0, 78, 79, 5, 60, 0, 0, 79, 18,
		1, 0, 0, 0, 80, 81, 5, 60, 0, 0, 81, 82, 5, 61, 0, 0, 82, 20, 1, 0, 0,
		0, 83, 84, 5, 62, 0, 0, 84, 22, 1, 0, 0, 0, 85, 86, 5, 62, 0, 0, 86, 87,
		5, 61, 0, 0, 87, 24, 1, 0, 0, 0, 88, 89, 5, 43, 0, 0, 89, 26, 1, 0, 0,
		0, 90, 91, 5, 45, 0, 0, 91, 28, 1, 0, 0, 0, 92, 93, 5, 42, 0, 0, 93, 30,
		1, 0, 0, 0, 94, 95, 5, 47, 0, 0, 95, 32, 1, 0, 0, 0, 96, 97, 5, 37, 0,
		0, 97, 34, 1, 0, 0, 0, 98, 99, 7, 0, 0, 0, 99, 100, 7, 1, 0, 0, 100, 101,
		7, 2, 0, 0, 101, 36, 1, 0, 0, 0, 102, 103, 7, 3, 0, 0, 103, 104, 7, 0,
		0, 0, 104, 105, 7, 4, 0, 0, 105, 38, 1, 0, 0, 0, 106, 107, 7, 1, 0, 0,
		107, 108, 7, 5, 0, 0, 108, 40, 1, 0, 0, 0, 109, 110, 7, 6, 0, 0, 110, 111,
		7, 0, 0, 0, 111, 42, 1, 0, 0, 0, 112, 113, 7, 2, 0, 0, 113, 114, 7, 5,
		0, 0, 114, 115, 7, 7, 0, 0, 115, 122, 7, 8, 0, 0, 116, 117, 7, 9, 0, 0,
		117, 118, 7, 3, 0, 0, 118, 119, 7, 10, 0, 0, 119, 120, 7, 11, 0, 0, 120,
		122, 7, 8, 0, 0, 121, 112, 1, 0, 0, 0, 121, 116, 1, 0, 0, 0, 122, 44, 1,
		0, 0, 0, 123, 124, 7, 12, 0, 0, 124, 46, 1, 0, 0, 0, 125, 127, 3, 45, 22,
		0, 126, 125, 1, 0, 0, 0, 126, 127, 1, 0, 0, 0, 127, 129, 1, 0, 0, 0, 128,
		130, 3, 55, 27, 0, 129, 128, 1, 0, 0, 0, 130, 131, 1, 0, 0, 0, 131, 129,
		1, 0, 0, 0, 131, 132, 1, 0, 0, 0, 132, 140, 1, 0, 0, 0, 133, 137, 5, 46,
		0, 0, 134, 136, 3, 55, 27, 0, 135, 134, 1, 0, 0, 0, 136, 139, 1, 0, 0,
		0, 137, 135, 1, 0, 0, 0, 137, 138, 1, 0, 0, 0, 138, 141, 1, 0, 0, 0, 139,
		137, 1, 0, 0, 0, 140, 133, 1, 0, 0, 0, 140, 141, 1, 0, 0, 0, 141, 151,
		1, 0, 0, 0, 142, 144, 7, 8, 0, 0, 143, 145, 3, 45, 22, 0, 144, 143, 1,
		0, 0, 0, 144, 145, 1, 0, 0, 0, 145, 147, 1, 0, 0, 0, 146, 148, 3, 55, 27,
		0, 147, 146, 1, 0, 0, 0, 148, 149, 1, 0, 0, 0, 149, 147, 1, 0, 0, 0, 149,
		150, 1, 0, 0, 0, 150, 152, 1, 0, 0, 0, 151, 142, 1, 0, 0, 0, 151, 152,
		1, 0, 0, 0, 152, 174, 1, 0, 0, 0, 153, 155, 3, 45, 22, 0, 154, 153, 1,
		0, 0, 0, 154, 155, 1, 0, 0, 0, 155, 156, 1, 0, 0, 0, 156, 158, 5, 46, 0,
		0, 157, 159, 3, 55, 27, 0, 158, 157, 1, 0, 0, 0, 159, 160, 1, 0, 0, 0,
		160, 158, 1, 0, 0, 0, 160, 161, 1, 0, 0, 0, 161, 171, 1, 0, 0, 0, 162,
		164, 7, 8, 0, 0, 163, 165, 3, 45, 22, 0, 164, 163, 1, 0, 0, 0, 164, 165,
		1, 0, 0, 0, 165, 167, 1, 0, 0, 0, 166, 168, 3, 55, 27, 0, 167, 166, 1,
		0, 0, 0, 168, 169, 1, 0, 0, 0, 169, 167, 1, 0, 0, 0, 169, 170, 1, 0, 0,
		0, 170, 172, 1, 0, 0, 0, 171, 162, 1, 0, 0, 0, 171, 172, 1, 0, 0, 0, 172,
		174, 1, 0, 0, 0, 173, 126, 1, 0, 0, 0, 173, 154, 1, 0, 0, 0, 174, 48, 1,
		0, 0, 0, 175, 179, 7, 13, 0, 0, 176, 178, 7, 14, 0, 0, 177, 176, 1, 0,
		0, 0, 178, 181, 1, 0, 0, 0, 179, 177, 1, 0, 0, 0, 179, 180, 1, 0, 0, 0,
		180, 192, 1, 0, 0, 0, 181, 179, 1, 0, 0, 0, 182, 183, 5, 46, 0, 0, 183,
		187, 7, 13, 0, 0, 184, 186, 7, 14, 0, 0, 185, 184, 1, 0, 0, 0, 186, 189,
		1, 0, 0, 0, 187, 185, 1, 0, 0, 0, 187, 188, 1, 0, 0, 0, 188, 191, 1, 0,
		0, 0, 189, 187, 1, 0, 0, 0, 190, 182, 1, 0, 0, 0, 191, 194, 1, 0, 0, 0,
		192, 190, 1, 0, 0, 0, 192, 193, 1, 0, 0, 0, 193, 50, 1, 0, 0, 0, 194, 192,
		1, 0, 0, 0, 195, 199, 5, 39, 0, 0, 196, 198, 8, 15, 0, 0, 197, 196, 1,
		0, 0, 0, 198, 201, 1, 0, 0, 0, 199, 197, 1, 0, 0, 0, 199, 200, 1, 0, 0,
		0, 200, 202, 1, 0, 0, 0, 201, 199, 1, 0, 0, 0, 202, 212, 5, 39, 0, 0, 203,
		207, 5, 34, 0, 0, 204, 206, 8, 16, 0, 0, 205, 204, 1, 0, 0, 0, 206, 209,
		1, 0, 0, 0, 207, 205, 1, 0, 0, 0, 207, 208, 1, 0, 0, 0, 208, 210, 1, 0,
		0, 0, 209, 207, 1, 0, 0, 0, 210, 212, 5, 34, 0, 0, 211, 195, 1, 0, 0, 0,
		211, 203, 1, 0, 0, 0, 212, 52, 1, 0, 0, 0, 213, 215, 7, 17, 0, 0, 214,
		213, 1, 0, 0, 0, 215, 216, 1, 0, 0, 0, 216, 214, 1, 0, 0, 0, 216, 217,
		1, 0, 0, 0, 217, 218, 1, 0, 0, 0, 218, 219, 6, 26, 0, 0, 219, 54, 1, 0,
		0, 0, 220, 221, 7, 18, 0, 0, 221, 56, 1, 0, 0, 0, 23, 0, 70, 121, 126,
		131, 137, 140, 144, 149, 151, 154, 160, 164, 169, 171, 173, 179, 187, 192,
		199, 207, 211, 216, 1, 6, 0, 0,
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
	HavingExpressionLexerLBRACK     = 3
	HavingExpressionLexerRBRACK     = 4
	HavingExpressionLexerCOMMA      = 5
	HavingExpressionLexerEQUALS     = 6
	HavingExpressionLexerNOT_EQUALS = 7
	HavingExpressionLexerNEQ        = 8
	HavingExpressionLexerLT         = 9
	HavingExpressionLexerLE         = 10
	HavingExpressionLexerGT         = 11
	HavingExpressionLexerGE         = 12
	HavingExpressionLexerPLUS       = 13
	HavingExpressionLexerMINUS      = 14
	HavingExpressionLexerSTAR       = 15
	HavingExpressionLexerSLASH      = 16
	HavingExpressionLexerPERCENT    = 17
	HavingExpressionLexerNOT        = 18
	HavingExpressionLexerAND        = 19
	HavingExpressionLexerOR         = 20
	HavingExpressionLexerIN         = 21
	HavingExpressionLexerBOOL       = 22
	HavingExpressionLexerNUMBER     = 23
	HavingExpressionLexerIDENTIFIER = 24
	HavingExpressionLexerSTRING     = 25
	HavingExpressionLexerWS         = 26
)
