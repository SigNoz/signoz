package filterquery

import (
	"fmt"

	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/antlr4-go/antlr/v4"
)

func Parse(query string) (antlr.ParseTree, *antlr.CommonTokenStream, *ErrorCollector) {
	collector := NewErrorCollector()
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(query))
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(collector)
	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(collector)
	return parser.Query(), tokens, collector
}

type ErrorCollector struct {
	*antlr.DefaultErrorListener
	Errors []string
}

func NewErrorCollector() *ErrorCollector {
	return &ErrorCollector{}
}

func (c *ErrorCollector) SyntaxError(_ antlr.Recognizer, _ any, line, column int, msg string, _ antlr.RecognitionException) {
	c.Errors = append(c.Errors, fmt.Sprintf("syntax error at %d:%d — %s", line, column, msg))
}
