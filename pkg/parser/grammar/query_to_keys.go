package parser

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

func QueryStringToKeysSelectors(query string) ([]*telemetrytypes.FieldKeySelector, error) {
	lexer := NewFilterQueryLexer(antlr.NewInputStream(query))
	keys := []*telemetrytypes.FieldKeySelector{}
	for {
		tok := lexer.NextToken()
		if tok.GetTokenType() == antlr.TokenEOF {
			break
		}

		if tok.GetTokenType() == FilterQueryLexerKEY {
			key := telemetrytypes.GetFieldKeyFromKeyText(tok.GetText())
			keys = append(keys, &telemetrytypes.FieldKeySelector{
				Name:          key.Name,
				Signal:        key.Signal,
				FieldContext:  key.FieldContext,
				FieldDataType: key.FieldDataType,
			})
		}
	}

	return keys, nil
}
