package querybuildertypesv5

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryRangeRequest_UnmarshalJSON_ErrorMessages(t *testing.T) {
	tests := []struct {
		name                string
		jsonData            string
		wantErrMsg          string
		wantAdditionalHints []string
		wantSuggestions     []string
	}{
		{
			name: "unknown field 'function' in query spec",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1749290340000,
				"end": 1749293940000,
				"requestType": "scalar",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "logs",
							"aggregations": [{
								"expression": "count()",
								"alias": "spans_count"
							}],
							"function": [{
								"name": "absolute",
								"args": []
							}]
						}
					}]
				}
			}`,
			wantErrMsg:      `unknown field "function" in query spec`,
			wantSuggestions: []string{"did you mean: `functions`"},
		},
		{
			name: "unknown field 'filters' in query spec",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1749290340000,
				"end": 1749293940000,
				"requestType": "scalar",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "metrics",
							"aggregations": [{
								"metricName": "test"
							}],
							"filters": {
								"expression": "test = 1"
							}
						}
					}]
				}
			}`,
			wantErrMsg:      `unknown field "filters" in query spec`,
			wantSuggestions: []string{"did you mean: `filter`"},
		},
		{
			name: "unknown field at top level",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1749290340000,
				"end": 1749293940000,
				"requestType": "scalar",
				"compositeQueries": {
					"queries": []
				}
			}`,
			wantErrMsg:          `unknown field "compositeQueries"`,
			wantAdditionalHints: []string{"Valid fields are:"},
			wantSuggestions:     []string{"did you mean: `compositeQuery`"},
		},
		{
			name: "unknown field with no good suggestion",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1749290340000,
				"end": 1749293940000,
				"requestType": "scalar",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "metrics",
							"aggregations": [{
								"metricName": "test"
							}],
							"randomField": "value"
						}
					}]
				}
			}`,
			wantErrMsg: `unknown field "randomField" in query spec`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req QueryRangeRequest
			err := json.Unmarshal([]byte(tt.jsonData), &req)

			require.Error(t, err)

			// Check main error message
			assert.Contains(t, err.Error(), tt.wantErrMsg)

			// Inspect the structured error via its JSON representation.
			j := errors.AsJSON(err)

			// Check additional hints (the messages on the errors array) if we have any.
			if len(j.Errors) > 0 {
				for _, hint := range tt.wantAdditionalHints {
					found := false
					for _, e := range j.Errors {
						if strings.Contains(e.Message, hint) {
							found = true
							break
						}
					}
					assert.True(t, found, "Expected to find hint '%s' in additionals: %v", hint, j.Errors)
				}
			}

			// Typo suggestions are surfaced as structured (machine-consumable)
			// suggestions, not in the human-facing additional hints.
			if len(tt.wantSuggestions) > 0 {
				for _, want := range tt.wantSuggestions {
					assert.Contains(t, j.Suggestions, want, "Expected suggestion %q in %v", want, j.Suggestions)
				}
			}
		})
	}
}
