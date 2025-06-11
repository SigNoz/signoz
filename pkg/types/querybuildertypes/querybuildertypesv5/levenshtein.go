package querybuildertypesv5

import (
	"strings"
)

func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Create a matrix to store distances
	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
	}

	// Initialize first column and row
	for i := 0; i <= len(s1); i++ {
		matrix[i][0] = i
	}
	for j := 0; j <= len(s2); j++ {
		matrix[0][j] = j
	}

	// Calculate distances
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 0
			if s1[i-1] != s2[j-1] {
				cost = 1
			}
			matrix[i][j] = min(
				matrix[i-1][j]+1,      // deletion
				matrix[i][j-1]+1,      // insertion
				matrix[i-1][j-1]+cost, // substitution
			)
		}
	}

	return matrix[len(s1)][len(s2)]
}

func findClosestMatch(target string, validOptions []string, maxDistance int) (string, bool) {
	if len(validOptions) == 0 {
		return "", false
	}

	bestMatch := ""
	bestDistance := maxDistance + 1

	// Convert target to lowercase for case-insensitive comparison
	targetLower := strings.ToLower(target)

	for _, option := range validOptions {
		// Case-insensitive comparison
		distance := levenshteinDistance(targetLower, strings.ToLower(option))
		if distance < bestDistance {
			bestDistance = distance
			bestMatch = option
		}
	}

	// Only return a match if it's within the threshold
	if bestDistance <= maxDistance {
		return bestMatch, true
	}

	return "", false
}

// min returns the minimum of three integers
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
