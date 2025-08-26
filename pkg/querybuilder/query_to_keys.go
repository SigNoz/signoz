package querybuilder

import (
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
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
func QueryStringToKeysSelectors(query string) []*telemetrytypes.FieldKeySelector {
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(query))
	keys := []*telemetrytypes.FieldKeySelector{}
	for {
		tok := lexer.NextToken()
		if tok.GetTokenType() == antlr.TokenEOF {
			break
		}

		if tok.GetTokenType() == grammar.FilterQueryLexerKEY {
			key := telemetrytypes.GetFieldKeyFromKeyText(tok.GetText())
			keys = append(keys, &telemetrytypes.FieldKeySelector{
				Name:          key.Name,
				Signal:        key.Signal,
				FieldContext:  key.FieldContext,
				FieldDataType: key.FieldDataType,
			})

			if key.FieldContext == telemetrytypes.FieldContextLog ||
				key.FieldContext == telemetrytypes.FieldContextSpan ||
				key.FieldContext == telemetrytypes.FieldContextMetric ||
				key.FieldContext == telemetrytypes.FieldContextTrace {
				// span.kind in metrics or metric.max_count in span etc.. should get the search on span.kind
				// see note in where_clause_visitor.go in VisitKey(...)
				keys = append(keys, &telemetrytypes.FieldKeySelector{
					Name:          key.FieldContext.StringValue() + "." + key.Name,
					Signal:        key.Signal,
					FieldContext:  telemetrytypes.FieldContextAttribute, // do not keep the original context because this is attribute
					FieldDataType: key.FieldDataType,
				})
			}
		}
	}

	return keys
}
