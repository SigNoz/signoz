package errors

import (
	"fmt"
	"strings"
)

const (
	typoSuggestionThreshold = 0.75
	// maxValidReferences caps how many valid references are listed in a
	// suggestion so high-cardinality sets (e.g. telemetry field keys) don't
	// dump the entire set into the error.
	maxValidReferences = 20
)

// Suggestions returns suggestion strings for an invalid input: a
// "did you mean: `x`" closest-match correction (when one is at least 75%
// similar) and a backtick-delimited "valid references" list, capped at
// maxValidReferences.
func Suggestions(invalidInput string, validInputs []string) []string {

	suggestions := make([]string, 0, 2)

	if didYouMean, ok := DidYouMeanFrom(invalidInput, validInputs); ok {
		suggestions = append(suggestions, didYouMean)
	}

	suggestions = append(suggestions, ValidReferences(validInputs...))

	return suggestions
}

// DidYouMeanFrom returns a "did you mean: `x`" suggestion for the closest-match
// correction to invalidInput among validInputs (when one is at least 75% similar),
// and false when nothing is close enough. Use this — rather than Suggestions — when a
// "valid references" enumeration would be unhelpful, e.g. field-not-found errors whose
// candidate pool is only the fields the query already references plus intrinsics.
func DidYouMeanFrom(invalidInput string, validInputs []string) (string, bool) {

	var bestMatch string
	bestSimilarity := 0.0

	for _, validInput := range validInputs {
		sim := similarity(invalidInput, validInput)
		if sim > bestSimilarity && sim >= typoSuggestionThreshold {
			bestSimilarity = sim
			bestMatch = validInput
		}
	}

	if bestSimilarity >= typoSuggestionThreshold {
		return DidYouMean(bestMatch), true
	}

	return "", false
}

// DidYouMeanSuggestions returns a one-element "did you mean: `x`" slice for the closest
// match (or nil when none is close enough), suitable for WithSuggestions /
// WithSuggestiveAdditional. Unlike Suggestions it omits the "valid references" list — use
// it where that enumeration would be unhelpful (e.g. field-not-found on select/order/groupBy,
// whose candidate pool is only the query's referenced fields plus intrinsics).
func DidYouMeanSuggestions(invalidInput string, validInputs []string) []string {
	if didYouMean, ok := DidYouMeanFrom(invalidInput, validInputs); ok {
		return []string{didYouMean}
	}
	return nil
}

// DidYouMean formats a single closest-match correction as a suggestion string
// suitable for WithSuggestions, e.g. DidYouMean("lambda") -> "did you mean: `lambda`".
func DidYouMean(match string) string {
	return "did you mean: `" + match + "`"
}

// ValidReferences formats a set of valid values as a backtick-delimited
// "valid references: `a`, `b`" suggestion string, capped at maxValidReferences
// with a "(+N more)" indicator so high-cardinality sets stay bounded.
func ValidReferences(values ...string) string {
	refs := values
	truncated := 0
	if len(refs) > maxValidReferences {
		truncated = len(refs) - maxValidReferences
		refs = refs[:maxValidReferences]
	}
	quoted := make([]string, len(refs))
	for i, v := range refs {
		quoted[i] = "`" + v + "`"
	}
	out := "valid references: " + strings.Join(quoted, ", ")
	if truncated > 0 {
		out += fmt.Sprintf(" (+%d more)", truncated)
	}
	return out
}

// EnumReferences renders an Enum() value list (a []any whose elements expose a
// StringValue() string method) as a backtick-delimited "valid references"
// suggestion string via ValidReferences.
func EnumReferences(values []any) string {
	refs := make([]string, 0, len(values))
	for _, v := range values {
		if sv, ok := v.(interface{ StringValue() string }); ok {
			refs = append(refs, sv.StringValue())
		}
	}
	return ValidReferences(refs...)
}

// levenshteinDistance calculates the edit distance between two strings.
func levenshteinDistance(s1, s2 string) int {
	s1 = strings.ToLower(s1)
	s2 = strings.ToLower(s2)

	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Create two work vectors of integer distances
	v0 := make([]int, len(s2)+1)
	v1 := make([]int, len(s2)+1)

	// Initialize v0 (the previous row of distances)
	for i := 0; i <= len(s2); i++ {
		v0[i] = i
	}

	// Calculate each row in the matrix
	for i := range len(s1) {
		v1[0] = i + 1

		for j := range len(s2) {
			deletionCost := v0[j+1] + 1
			insertionCost := v1[j] + 1

			var substitutionCost int
			if s1[i] == s2[j] {
				substitutionCost = v0[j]
			} else {
				substitutionCost = v0[j] + 1
			}

			v1[j+1] = min(deletionCost, insertionCost, substitutionCost)
		}

		// Copy v1 to v0 for next iteration
		for j := 0; j <= len(s2); j++ {
			v0[j] = v1[j]
		}
	}

	return v1[len(s2)]
}

// similarity returns a value between 0 and 1, where 1 means perfect match.
func similarity(s1, s2 string) float64 {
	maxLen := max(len(s1), len(s2))
	if maxLen == 0 {
		return 1.0 // Both strings are empty
	}

	distance := levenshteinDistance(s1, s2)
	return 1.0 - float64(distance)/float64(maxLen)
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
