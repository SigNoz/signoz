package sqlmigration

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRemoveUnsupportedQuickFilterEntries(t *testing.T) {
	testCases := []struct {
		name     string
		filter   string
		expected string
		changed  bool
		ok       bool
	}{
		{
			name:     "UnsupportedFields_Removed_RestKeptVerbatim",
			filter:   `[{"name":"service.name","fieldContext":"resource","fieldDataType":"string"},{"name":"trace_id","fieldContext":"span","fieldDataType":"string"},{"name":"http_url","fieldContext":"span","fieldDataType":"string","description":"url"},{"name":"gen_ai.usage.input_tokens","fieldContext":"attribute","fieldDataType":"number"}]`,
			expected: `[{"name":"service.name","fieldContext":"resource","fieldDataType":"string"},{"name":"http_url","fieldContext":"span","fieldDataType":"string","description":"url"}]`,
			changed:  true,
			ok:       true,
		},
		{
			name:     "OnlyUnsupportedFields_EmptyList",
			filter:   `[{"name":"span_id","fieldContext":"log","fieldDataType":"string"}]`,
			expected: `[]`,
			changed:  true,
			ok:       true,
		},
		{
			name:    "SupportedFields_Unchanged",
			filter:  `[{"name":"service.name","fieldContext":"resource","fieldDataType":"string"}]`,
			changed: false,
			ok:      true,
		},
		{
			name:    "EmptyList_Unchanged",
			filter:  `[]`,
			changed: false,
			ok:      true,
		},
		{
			name:    "InvalidJSON_NotOk",
			filter:  `not-json`,
			changed: false,
			ok:      false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			filtered, changed, ok := removeUnsupportedQuickFilterEntries(testCase.filter)
			assert.Equal(t, testCase.ok, ok)
			assert.Equal(t, testCase.changed, changed)
			assert.Equal(t, testCase.expected, filtered)
		})
	}
}
