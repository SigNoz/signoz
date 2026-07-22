package errors

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewValidReferences(t *testing.T) {
	// An empty set returns "" so callers don't surface a bare "valid <noun> are".
	assert.Equal(t, "", NewValidReferences[string](NounFields))

	// The noun phrases the list, e.g. "valid fields are", "valid keys are".
	assert.Equal(t, "valid fields are `a`, `b`", NewValidReferences(NounFields, "a", "b"))
	assert.Equal(t, "valid keys are `a`, `b`", NewValidReferences(NounKeys, "a", "b"))
}

func TestNewSuggestionsOnLevenshteinDistance(t *testing.T) {
	// No valid inputs => no suggestions at all (no bare "valid <noun> are").
	assert.Empty(t, NewSuggestionsOnLevenshteinDistance("foo", NounFields, nil))

	// Close match => did-you-mean plus the valid-references list.
	assert.Equal(t,
		[]string{"did you mean: `name`", "valid fields are `name`, `color`"},
		NewSuggestionsOnLevenshteinDistance("nam", NounFields, []string{"name", "color"}),
	)

	// No close match => valid-references list only.
	assert.Equal(t,
		[]string{"valid fields are `name`, `color`"},
		NewSuggestionsOnLevenshteinDistance("zzzzz", NounFields, []string{"name", "color"}),
	)
}
