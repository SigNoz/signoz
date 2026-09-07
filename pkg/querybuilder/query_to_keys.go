package querybuilder

import (
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
	"strconv"
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

			// todo(tushar): consider reverting changes done to this method in below PR to avoid scope specific checks
			// https://github.com/SigNoz/signoz/issues/11374
			if key.FieldContext == telemetrytypes.FieldContextScope {
				keys = append(keys, &telemetrytypes.FieldKeySelector{
					Name:          key.FieldContext.StringValue() + "." + key.Name,
					Signal:        key.Signal,
					FieldContext:  telemetrytypes.FieldContextUnspecified, // this allows 'scope.' prefix for keys with other context as well
					FieldDataType: key.FieldDataType,
				})
			}
		}
	}

	return keys
}

// EqualityTerm is one `key = value` term of a filter expression.
type EqualityTerm struct {
	Key   *telemetrytypes.TelemetryFieldKey
	Value string
}

// QueryStringEqualityTerms returns the `key = value` terms of a filter
// expression that is a conjunction: every term must hold for a row to match.
// ok is false when the expression contains OR or NOT, since a term may then
// be optional.
func QueryStringEqualityTerms(query string) (terms []EqualityTerm, ok bool) {
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(query))
	var lastKey *telemetrytypes.TelemetryFieldKey
	equalsSeen := false
	for {
		tok := lexer.NextToken()
		if tok.GetTokenType() == antlr.TokenEOF {
			break
		}
		switch tok.GetTokenType() {
		case grammar.FilterQueryLexerWS:
			continue
		case grammar.FilterQueryLexerOR, grammar.FilterQueryLexerNOT, grammar.FilterQueryLexerNOT_EQUALS, grammar.FilterQueryLexerNEQ:
			return nil, false
		case grammar.FilterQueryLexerKEY:
			key := telemetrytypes.GetFieldKeyFromKeyText(tok.GetText())
			lastKey = &key
			equalsSeen = false
		case grammar.FilterQueryLexerEQUALS:
			equalsSeen = lastKey != nil
		case grammar.FilterQueryLexerQUOTED_TEXT, grammar.FilterQueryLexerNUMBER, grammar.FilterQueryLexerBOOL:
			if equalsSeen && lastKey != nil {
				terms = append(terms, EqualityTerm{Key: lastKey, Value: literalText(tok.GetTokenType(), tok.GetText())})
			}
			lastKey = nil
			equalsSeen = false
		default:
			lastKey = nil
			equalsSeen = false
		}
	}
	return terms, true
}

// literalText returns a literal as the where-clause visitor reads it: quoted
// text with its quotes and escapes removed, a number in its decimal form.
func literalText(tokenType int, text string) string {
	switch tokenType {
	case grammar.FilterQueryLexerQUOTED_TEXT:
		return trimQuotes(text)
	case grammar.FilterQueryLexerNUMBER:
		if f, err := strconv.ParseFloat(text, 64); err == nil {
			return strconv.FormatFloat(f, 'f', -1, 64)
		}
	}
	return text
}
