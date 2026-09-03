package aitelemetryschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScopedExistingQuery(t *testing.T) {
	gate := "(gen_ai.request.model EXISTS OR gen_ai.tool.name EXISTS OR gen_ai.agent.name EXISTS)"

	testCases := []struct {
		name          string
		existingQuery string
		expected      string
		expectedErr   string
	}{
		{
			name:          "empty query returns the gate alone",
			existingQuery: "",
			expected:      gate,
		},
		{
			name:          "span filter is preserved under the gate",
			existingQuery: "service.name = 'checkout'",
			expected:      gate + " AND (service.name = 'checkout')",
		},
		{
			name:          "trace aggregate filter is stripped",
			existingQuery: "llm_call_count > 5",
			expected:      gate,
		},
		{
			name:          "mixed filter keeps only the span part",
			existingQuery: "llm_call_count > 5 AND gen_ai.request.model = 'gpt-4'",
			expected:      gate + " AND (gen_ai.request.model = 'gpt-4')",
		},
		{
			name:          "trace context filter is stripped",
			existingQuery: "trace.total_tokens > 100 AND service.name = 'checkout'",
			expected:      gate + " AND (service.name = 'checkout')",
		},
		{
			name:          "unparseable filter is dropped",
			existingQuery: "service.name = ",
			expected:      gate,
			expectedErr:   "syntax errors while parsing the filter expression",
		},
		{
			name:          "multiple span conditions survive as one AND chain",
			existingQuery: "service.name = 'checkout' AND gen_ai.request.model = 'gpt-4' AND llm_call_count > 5",
			expected:      gate + " AND (service.name = 'checkout' AND gen_ai.request.model = 'gpt-4')",
		},
		{
			name:          "span OR group is kept whole and parenthesized against the AND join",
			existingQuery: "service.name = 'a' OR service.name = 'b'",
			expected:      gate + " AND ((service.name = 'a' OR service.name = 'b'))",
		},
		{
			name:          "parenthesized span OR group ANDed with an aggregate keeps only the group",
			existingQuery: "(service.name = 'a' OR service.name = 'b') AND llm_call_count > 5",
			expected:      gate + " AND ((service.name = 'a' OR service.name = 'b'))",
		},
		{
			name:          "OR group of trace aggregates is stripped whole",
			existingQuery: "llm_call_count > 5 OR total_tokens > 100",
			expected:      gate,
		},
		{
			name:          "OR mixing aggregate and span atoms drops the whole filter",
			existingQuery: "llm_call_count > 5 OR service.name = 'checkout'",
			expected:      gate,
			expectedErr:   "trace-level and span-level filters cannot be combined within an OR/NOT group",
		},
		{
			name:          "parenthesized AND group is split, not routed whole",
			existingQuery: "(llm_call_count > 5 AND service.name = 'checkout') AND gen_ai.request.model = 'gpt-4'",
			expected:      gate + " AND (service.name = 'checkout' AND gen_ai.request.model = 'gpt-4')",
		},
		{
			name:          "NOT over an aggregate group is stripped",
			existingQuery: "NOT (llm_call_count > 5) AND service.name = 'checkout'",
			expected:      gate + " AND (service.name = 'checkout')",
		},
		{
			name:          "NOT over a span group is kept",
			existingQuery: "NOT (service.name = 'checkout')",
			expected:      gate + " AND (NOT (service.name = 'checkout'))",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			scoped, err := ScopedExistingQuery(testCase.existingQuery)
			if testCase.expectedErr != "" {
				assert.ErrorContains(t, err, testCase.expectedErr)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, testCase.expected, scoped)
		})
	}
}
