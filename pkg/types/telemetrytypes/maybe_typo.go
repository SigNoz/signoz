package telemetrytypes

import (
	"fmt"
	"strings"
)

const (
	typoSuggestionThreshold = 0.75
)

// levenshteinDistance calculates the edit distance between two strings
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

// similarity returns a value between 0 and 1, where 1 means perfect match
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// SuggestCorrection checks if there are any column names similar to the input
// and returns a suggestion if there's at least 75% similarity
func SuggestCorrection(input string, knownFieldKeys []string) (string, bool) {

	var bestMatch string
	bestSimilarity := 0.0

	for _, columnName := range knownFieldKeys {
		sim := similarity(input, columnName)
		if sim > bestSimilarity && sim >= typoSuggestionThreshold {
			bestSimilarity = sim
			bestMatch = columnName
		}
	}

	if bestSimilarity >= typoSuggestionThreshold {
		return fmt.Sprintf("did you mean: '%s'?", bestMatch), true
	}

	return "", false
}
