package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestQueryToKeys(t *testing.T) {
	testCases := []struct {
		query        string
		expectedKeys []telemetrytypes.FieldKeySelector
	}{
		{
			query: `service.name="redis"`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `resource.service.name="redis"`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `service.name="redis" AND http.status_code=200`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
				{
					Name:          "http.status_code",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `has(payload.user_ids, 123)`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "payload.user_ids",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `body.user_ids[*] = 123`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "user_ids[*]",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			// A declared scope path keeps its compound name and addresses the scope field
			// only, so it yields a single scope-context selector (no `scope.`-prefixed
			// cross-context companion).
			query: `scope.version = '1.0.0'`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "scope.version",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextScope,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			// A scope attribute whose own name carries a `scope.` prefix. `scope.prefixed`
			// normalizes to {prefixed, scope}; the second selector re-adds the prefix so the
			// metadata fetch can target the attribute's exact key `scope.prefixed` rather than
			// relying on the broad `%prefixed%` match.
			query: `scope.prefixed = 'x'`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "prefixed",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextScope,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
				{
					Name:          "scope.prefixed",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
	}

	for _, testCase := range testCases {
		keys := QueryStringToKeysSelectors(testCase.query)
		if len(keys) != len(testCase.expectedKeys) {
			t.Fatalf("Expected %d keys, got %d", len(testCase.expectedKeys), len(keys))
		}
		for i, key := range keys {
			if key.Name != testCase.expectedKeys[i].Name {
				t.Fatalf("Expected key %v, got %v", testCase.expectedKeys[i], key)
			}
			if key.Signal != testCase.expectedKeys[i].Signal {
				t.Fatalf("Expected signal %v, got %v", testCase.expectedKeys[i].Signal, key.Signal)
			}
			if key.FieldContext != testCase.expectedKeys[i].FieldContext {
				t.Fatalf("Expected field context %v, got %v", testCase.expectedKeys[i].FieldContext, key.FieldContext)
			}
			if key.FieldDataType != testCase.expectedKeys[i].FieldDataType {
				t.Fatalf("Expected field data type %v, got %v", testCase.expectedKeys[i].FieldDataType, key.FieldDataType)
			}
		}
	}
}
