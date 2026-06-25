package errors

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidReferences(t *testing.T) {
	// An empty set returns "" so callers don't surface a bare "valid references: ".
	assert.Equal(t, "", ValidReferences[string]())

	assert.Equal(t, "valid references: `a`, `b`", ValidReferences("a", "b"))
}

func TestSuggestionsOnLevenshteinDistance(t *testing.T) {
	// No valid inputs => no suggestions at all (no bare "valid references: ").
	assert.Empty(t, SuggestionsOnLevenshteinDistance("foo", nil))

	// Close match => did-you-mean plus the valid-references list.
	assert.Equal(t,
		[]string{"did you mean: `name`", "valid references: `name`, `color`"},
		SuggestionsOnLevenshteinDistance("nam", []string{"name", "color"}),
	)

	// No close match => valid-references list only.
	assert.Equal(t,
		[]string{"valid references: `name`, `color`"},
		SuggestionsOnLevenshteinDistance("zzzzz", []string{"name", "color"}),
	)
}
