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
			wantErrMsg: `unknown field "function" in query spec`,
			wantAdditionalHints: []string{
				"did you mean: 'functions'?",
			},
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
			wantErrMsg: `unknown field "filters" in query spec`,
			wantAdditionalHints: []string{
				"did you mean: 'filter'?",
			},
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
			wantErrMsg: `unknown field "compositeQueries"`,
			wantAdditionalHints: []string{
				"did you mean: 'compositeQuery'?",
			},
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
			wantAdditionalHints: []string{
				"Valid fields are:",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req QueryRangeRequest
			err := json.Unmarshal([]byte(tt.jsonData), &req)

			require.Error(t, err)

			// Check main error message
			assert.Contains(t, err.Error(), tt.wantErrMsg)

			// Check if it's an error from our package using Unwrapb
			_, _, _, _, _, additionals := errors.Unwrapb(err)

			// Check additional hints if we have any
			if len(additionals) > 0 {
				for _, hint := range tt.wantAdditionalHints {
					found := false
					for _, additional := range additionals {
						if strings.Contains(additional, hint) {
							found = true
							break
						}
					}
					assert.True(t, found, "Expected to find hint '%s' in additionals: %v", hint, additionals)
				}
			}
		})
	}
}
