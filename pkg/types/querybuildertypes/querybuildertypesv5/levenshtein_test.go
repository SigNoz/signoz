package querybuildertypesv5

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		s1       string
		s2       string
		expected int
	}{
		{"", "", 0},
		{"a", "", 1},
		{"", "a", 1},
		{"a", "a", 0},
		{"abc", "abc", 0},
		{"kitten", "sitting", 3},
		{"saturday", "sunday", 3},
		{"expires", "expires_in", 3},
		{"start", "end", 5},                    // s->e, t->n, a->d, r->"", t->""
		{"schemaVersion", "schema_version", 2}, // V->_ and ""->_
	}

	for _, tt := range tests {
		t.Run(tt.s1+"_"+tt.s2, func(t *testing.T) {
			result := levenshteinDistance(tt.s1, tt.s2)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFindClosestMatch(t *testing.T) {
	tests := []struct {
		name          string
		target        string
		validOptions  []string
		maxDistance   int
		expectedMatch string
		expectedFound bool
	}{
		{
			name:          "exact match",
			target:        "start",
			validOptions:  []string{"start", "end", "limit"},
			maxDistance:   3,
			expectedMatch: "start",
			expectedFound: true,
		},
		{
			name:          "close match",
			target:        "strt",
			validOptions:  []string{"start", "end", "limit"},
			maxDistance:   3,
			expectedMatch: "start",
			expectedFound: true,
		},
		{
			name:          "case insensitive match",
			target:        "START",
			validOptions:  []string{"start", "end", "limit"},
			maxDistance:   3,
			expectedMatch: "start",
			expectedFound: true,
		},
		{
			name:          "no match within distance",
			target:        "completely_different",
			validOptions:  []string{"start", "end", "limit"},
			maxDistance:   3,
			expectedMatch: "",
			expectedFound: false,
		},
		{
			name:          "expires to expires_in",
			target:        "expires",
			validOptions:  []string{"expires_in", "start", "end"},
			maxDistance:   3,
			expectedMatch: "expires_in",
			expectedFound: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			match, found := findClosestMatch(tt.target, tt.validOptions, tt.maxDistance)
			assert.Equal(t, tt.expectedFound, found)
			if tt.expectedFound {
				assert.Equal(t, tt.expectedMatch, match)
			}
		})
	}
}

func TestQueryRangeRequestUnmarshalWithSuggestions(t *testing.T) {
	tests := []struct {
		name        string
		jsonData    string
		expectedErr string
	}{
		{
			name: "valid request",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				}
			}`,
			expectedErr: "",
		},
		{
			name: "typo in start field",
			jsonData: `{
				"schemaVersion": "v5",
				"strt": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				}
			}`,
			expectedErr: `unknown field "strt"`,
		},
		{
			name: "typo in schemaVersion",
			jsonData: `{
				"schemaVerson": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				}
			}`,
			expectedErr: `unknown field "schemaVerson"`,
		},
		{
			name: "requestype instead of requestType",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestype": "timeseries",
				"compositeQuery": {
					"queries": []
				}
			}`,
			expectedErr: `unknown field "requestype"`,
		},
		{
			name: "composite_query instead of compositeQuery",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"composite_query": {
					"queries": []
				}
			}`,
			expectedErr: `unknown field "composite_query"`,
		},
		{
			name: "no_cache instead of noCache",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				},
				"no_cache": true
			}`,
			expectedErr: `unknown field "no_cache"`,
		},
		{
			name: "format_options instead of formatOptions",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				},
				"format_options": {}
			}`,
			expectedErr: `unknown field "format_options"`,
		},
		{
			name: "completely unknown field with no good suggestion",
			jsonData: `{
				"schemaVersion": "v5",
				"completely_unknown_field_xyz": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				}
			}`,
			expectedErr: `unknown field "completely_unknown_field_xyz"`,
		},
		{
			name: "common mistake: limit instead of variables",
			jsonData: `{
				"schemaVersion": "v5",
				"start": 1000,
				"end": 2000,
				"requestType": "timeseries",
				"compositeQuery": {
					"queries": []
				},
				"limit": 100
			}`,
			expectedErr: `unknown field "limit"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req QueryRangeRequest
			err := json.Unmarshal([]byte(tt.jsonData), &req)

			if tt.expectedErr == "" {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedErr)
			}
		})
	}
}

func TestGetJSONFieldNames(t *testing.T) {
	type TestStruct struct {
		Field1 string `json:"field1"`
		Field2 int    `json:"field2,omitempty"`
		Field3 bool   `json:"-"`
		Field4 string `json:""`
		Field5 string // no json tag
	}

	fields := getJSONFieldNames(&TestStruct{})
	expected := []string{"field1", "field2"}

	assert.ElementsMatch(t, expected, fields)
}

func TestUnmarshalJSONWithSuggestions(t *testing.T) {
	type TestRequest struct {
		SchemaVersion string `json:"schemaVersion"`
		Start         int64  `json:"start"`
		End           int64  `json:"end"`
		Limit         int    `json:"limit,omitempty"`
	}

	tests := []struct {
		name        string
		jsonData    string
		expectedErr string
	}{
		{
			name: "valid JSON",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1000,
				"end": 2000
			}`,
			expectedErr: "",
		},
		{
			name: "typo in field name",
			jsonData: `{
				"schemaVerson": "v1",
				"start": 1000,
				"end": 2000
			}`,
			expectedErr: `unknown field "schemaVerson"`,
		},
		{
			name: "multiple typos - only first is reported",
			jsonData: `{
				"strt": 1000,
				"ed": 2000
			}`,
			expectedErr: `unknown field "strt"`,
		},
		{
			name: "case sensitivity",
			jsonData: `{
				"schema_version": "v1",
				"start": 1000,
				"end": 2000
			}`,
			expectedErr: `unknown field "schema_version"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req TestRequest
			err := UnmarshalJSONWithSuggestions([]byte(tt.jsonData), &req)

			if tt.expectedErr == "" {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				// Clean up the error message for comparison
				errMsg := strings.ReplaceAll(err.Error(), "\n", " ")
				assert.Contains(t, errMsg, tt.expectedErr)
			}
		})
	}
}
