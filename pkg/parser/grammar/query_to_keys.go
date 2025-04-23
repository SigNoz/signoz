package parser

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// QueryStringToKeysSelectors converts a query string to a list of field key selectors
//
//	e.g. "service.name="query-service" AND http.status_code=200 AND resource.k8s.namespace.name="application"" -> []*telemetrytypes.FieldKeySelector{
//		{
//			Name: "service.name",
//			FieldContext: telemetrytypes.FieldContextUnspecified,
//			FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
//		},
//		{
//			Name: "http.status_code",
//			FieldContext: telemetrytypes.FieldContextUnspecified,
//			FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
//		},
//		{
//			Name: "resource.k8s.namespace.name",
//			FieldContext: telemetrytypes.FieldContextResource,
//			FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
//		},
//	}
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
