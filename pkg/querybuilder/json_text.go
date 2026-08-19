package querybuilder

import (
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// JSONEscapable reports whether a JSON encoder is free to rewrite r: `"` and `\` always, `/` by
// PHP, `<` `>` `&` by Go, non-printable ASCII by Python's ensure_ascii. JSON-encoded text holds
// the producer's own bytes, so a literal spanning one of these may not be there to find.
func JSONEscapable(r rune) bool {
	return r < 0x20 || r > 0x7e || strings.ContainsRune(`"\/<>&`, r)
}

// JSONTextRuns splits s at every byte an encoder may rewrite. JSON text that holds s contains
// each returned run verbatim, in order.
func JSONTextRuns(s string) []string {
	return strings.FieldsFunc(s, JSONEscapable)
}

// JSONComparisonLiterals returns the literals a comparison implies in the JSON text the compared
// value was decoded from. Only string comparisons qualify: a number is compared after parsing,
// which reads 1.23e2 as 123, so the digits of the filter value need not appear in the text at all.
func JSONComparisonLiterals(operator qbtypes.FilterOperator, value any) []string {
	str, ok := value.(string)
	if !ok {
		return nil
	}
	switch operator {
	case qbtypes.FilterOperatorEqual, qbtypes.FilterOperatorContains:
		return JSONTextRuns(str)
	case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike:
		// the pattern's own wildcards split runs like the escapable bytes do; `\` is one of
		// those, so pattern escapes dissolve with it (an escaped wildcard is merely not required)
		return strings.FieldsFunc(str, func(r rune) bool {
			return JSONEscapable(r) || r == '%' || r == '_'
		})
	}
	return nil
}
