package parser

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
)

func TestQueryToKeys(t *testing.T) {

	testCases := []struct {
		query        string
		expectedKeys []types.FieldKeySelector
	}{
		{
			query: `service.name="redis"`,
			expectedKeys: []types.FieldKeySelector{
				{
					Name: "service.name",
				},
			},
		},
		{
			query: `service.name="redis" AND http.status_code=200`,
			expectedKeys: []types.FieldKeySelector{
				{
					Name: "service.name",
				},
				{
					Name: "http.status_code",
				},
			},
		},
	}

	for _, testCase := range testCases {
		keys, err := QueryStringToKeysSelectors(testCase.query)
		if err != nil {
			t.Fatalf("Error: %v", err)
		}
		if len(keys) != len(testCase.expectedKeys) {
			t.Fatalf("Expected %d keys, got %d", len(testCase.expectedKeys), len(keys))
		}
		for i, key := range keys {
			if key.Name != testCase.expectedKeys[i].Name {
				t.Fatalf("Expected key %v, got %v", testCase.expectedKeys[i], key)
			}
		}
	}
}
