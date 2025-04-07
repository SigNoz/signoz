package parser

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/antlr4-go/antlr/v4"
)

func QueryStringToKeysSelectors(query string) ([]types.FieldKeySelector, error) {
	lexer := NewFilterQueryLexer(antlr.NewInputStream(query))
	keys := []types.FieldKeySelector{}
	for {
		tok := lexer.NextToken()
		if tok.GetTokenType() == antlr.TokenEOF {
			break
		}

		if tok.GetTokenType() == FilterQueryLexerKEY {
			key := types.GetFieldKeyFromString(tok.GetText())
			keys = append(keys, types.FieldKeySelector{
				Name: key.Name,
			})
		}
	}

	return keys, nil
}
