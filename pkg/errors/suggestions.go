package errors

import (
	"fmt"
	"strings"
)

const (
	typoSuggestionThreshold = 0.75
	// maxValidReferences caps how many valid references are listed so
	// high-cardinality sets (e.g. telemetry field keys) don't dump the entire
	// set into the error.
	maxValidReferences = 20
)

// SuggestionsOnLevenshteinDistance returns a "did you mean" correction (only
// when a close match at least typoSuggestionThreshold similar exists) followed
// by the valid-references list.
func SuggestionsOnLevenshteinDistance(invalidInput string, validInputs []string) []string {
	suggestions := make([]string, 0, 2)

	if match, ok := ClosestLevenshteinMatch(invalidInput, validInputs); ok {
		suggestions = append(suggestions, didYouMean(match))
	}

	return append(suggestions, ValidReferences(validInputs...))
}

// ClosestLevenshteinMatch returns the candidate most similar to input that is at least
// typoSuggestionThreshold similar, or false when nothing is close enough.
func ClosestLevenshteinMatch(input string, candidates []string) (string, bool) {
	var bestMatch string
	bestSimilarity := 0.0

	for _, candidate := range candidates {
		sim := similarity(input, candidate)

		if sim > bestSimilarity && sim >= typoSuggestionThreshold {
			bestSimilarity = sim
			bestMatch = candidate
		}
	}

	if bestSimilarity >= typoSuggestionThreshold {
		return bestMatch, true
	}

	return "", false
}

// SuggestionFromFunc formats the string produce returns as a one-element
// "did you mean: `x`" slice, or nil when it returns the empty string (so callers
// with their own matching strategy compose into a suggestions list cleanly).
func SuggestionFromFunc(produce func() string) []string {
	s := produce()
	if s == "" {
		return nil
	}

	return []string{didYouMean(s)}
}

// ValidReferences formats values as "valid references: `a`, `b`", capped at
// maxValidReferences with a "(+N more)" suffix. Each value is rendered as its
// own string, an Enum() element's StringValue(), or fmt.Sprint as a fallback.
func ValidReferences[T any](values ...T) string {
	refs := make([]string, 0, len(values))
	for _, v := range values {
		switch t := any(v).(type) {
		case string:
			refs = append(refs, t)
		case interface{ StringValue() string }:
			refs = append(refs, t.StringValue())
		default:
			refs = append(refs, fmt.Sprint(t))
		}
	}

	truncated := 0
	if len(refs) > maxValidReferences {
		truncated = len(refs) - maxValidReferences
		refs = refs[:maxValidReferences]
	}

	quoted := make([]string, len(refs))
	for i, r := range refs {
		quoted[i] = "`" + r + "`"
	}

	out := "valid references: " + strings.Join(quoted, ", ")
	if truncated > 0 {
		out += fmt.Sprintf(" (+%d more)", truncated)
	}

	return out
}

func levenshteinDistance(s1, s2 string) int {
	s1 = strings.ToLower(s1)
	s2 = strings.ToLower(s2)

	if len(s1) == 0 {
		return len(s2)
	}

	if len(s2) == 0 {
		return len(s1)
	}

	v0 := make([]int, len(s2)+1)
	v1 := make([]int, len(s2)+1)

	for i := 0; i <= len(s2); i++ {
		v0[i] = i
	}

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

		for j := 0; j <= len(s2); j++ {
			v0[j] = v1[j]
		}
	}

	return v1[len(s2)]
}

func similarity(s1, s2 string) float64 {
	maxLen := max(len(s1), len(s2))
	if maxLen == 0 {
		return 1.0
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

// didYouMean formats a correction as "did you mean: `x`".
func didYouMean(match string) string {
	return "did you mean: `" + match + "`"
}
