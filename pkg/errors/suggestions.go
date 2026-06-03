package errors

import "strings"

// DidYouMean formats a single closest-match correction as a suggestion string
// suitable for WithSuggestions, e.g. DidYouMean("lambda") -> "did you mean: `lambda`".
func DidYouMean(match string) string {
	return "did you mean: `" + match + "`"
}

// ValidReferences formats a set of valid values as a backtick-delimited
// suggestion string suitable for WithSuggestions, e.g.
// ValidReferences("a", "b") -> "valid references: `a`, `b`".
func ValidReferences(values ...string) string {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = "`" + v + "`"
	}
	return "valid references: " + strings.Join(quoted, ", ")
}
