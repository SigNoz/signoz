package querier

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestShouldRemoveMatcher(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		allVars  map[string]bool
		expected bool
	}{
		{
			name:     "$var pattern match",
			value:    "$host.name",
			allVars:  map[string]bool{"host.name": true},
			expected: true,
		},
		{
			name:     "{{var}} pattern match",
			value:    "{{host.name}}",
			allVars:  map[string]bool{"host.name": true},
			expected: true,
		},
		{
			name:     "[[var]] pattern match",
			value:    "[[host.name]]",
			allVars:  map[string]bool{"host.name": true},
			expected: true,
		},
		{
			name:     "variable not in allVars",
			value:    "$other.var",
			allVars:  map[string]bool{"host.name": true},
			expected: false,
		},
		{
			name:     "no variable pattern in value",
			value:    "host.name",
			allVars:  map[string]bool{"host.name": true},
			expected: false,
		},
		{
			name:     "variable in middle of string (not at start, won't match)",
			value:    "prefix$host.namesuffix",
			allVars:  map[string]bool{"host.name": true},
			expected: false, // TrimPrefix only works if $ is at the start
		},
		{
			name:     "empty allVars",
			value:    "$host.name",
			allVars:  map[string]bool{},
			expected: false,
		},
		{
			name:     "incomplete {{var}} pattern (missing closing, still matches)",
			value:    "{{host.name",
			allVars:  map[string]bool{"host.name": true},
			expected: true, // TrimPrefix removes {{, TrimSuffix does nothing, checks "host.name"
		},
		{
			name:     "mixed patterns (only first pattern at start matches)",
			value:    "$host.name{{env}}",
			allVars:  map[string]bool{"host.name": true},
			expected: false, // TrimPrefix removes $, checks "host.name{{env}}" which is not in allVars
		},
		{
			name:     "partial match should not match for {{var}}",
			value:    "{{host.name.suffix}}",
			allVars:  map[string]bool{"host.name": true},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			remover := &allVarRemover{allVars: tt.allVars}
			result := remover.shouldRemoveMatcher(tt.value)
			assert.Equal(t, tt.expected, result, "shouldRemoveMatcher(%q) with allVars=%v", tt.value, tt.allVars)
		})
	}
}
