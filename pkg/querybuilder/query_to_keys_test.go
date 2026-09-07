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
			query: `scope.version = '1.0.0'`,
			expectedKeys: []telemetrytypes.FieldKeySelector{
				{
					Name:          "version",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextScope,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
				{
					Name:          "scope.version",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
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

func TestQueryStringEqualityTerms(t *testing.T) {
	terms, ok := QueryStringEqualityTerms(`service.name = 'checkout' AND resource.k8s.namespace.name = "prod" AND http.status_code = 500 AND has_error = true`)
	if !ok {
		t.Fatalf("expected a conjunction to be accepted")
	}
	got := map[string]string{}
	contexts := map[string]telemetrytypes.FieldContext{}
	for _, term := range terms {
		got[term.Key.Name] = term.Value
		contexts[term.Key.Name] = term.Key.FieldContext
	}
	want := map[string]string{"service.name": "checkout", "k8s.namespace.name": "prod", "http.status_code": "500", "has_error": "true"}
	if len(got) != len(want) {
		t.Fatalf("expected %d terms, got %v", len(want), got)
	}
	for name, value := range want {
		if got[name] != value {
			t.Fatalf("expected %s = %q, got %q", name, value, got[name])
		}
	}
	if contexts["k8s.namespace.name"] != telemetrytypes.FieldContextResource {
		t.Fatalf("expected the resource prefix to set the context")
	}

	for _, query := range []string{
		`service.name = 'checkout' OR service.name = 'cart'`,
		`NOT service.name = 'checkout'`,
		`service.name != 'checkout'`,
	} {
		if _, ok := QueryStringEqualityTerms(query); ok {
			t.Fatalf("expected %q to be rejected", query)
		}
	}

	terms, ok = QueryStringEqualityTerms(`service.name IN ('a', 'b') AND http.route LIKE '/api%' AND env = 'prod'`)
	if !ok || len(terms) != 1 || terms[0].Key.Name != "env" {
		t.Fatalf("expected only the equality term, got %v ok=%v", terms, ok)
	}

	terms, ok = QueryStringEqualityTerms(`resource.owner = 'O\'Reilly' AND http.status_code = 5e2 AND ratio = 1.50`)
	if !ok || len(terms) != 3 {
		t.Fatalf("expected three terms, got %v ok=%v", terms, ok)
	}
	for _, want := range []struct{ name, value string }{{"owner", "O'Reilly"}, {"http.status_code", "500"}, {"ratio", "1.5"}} {
		found := false
		for _, term := range terms {
			if term.Key.Name == want.name {
				found = true
				if term.Value != want.value {
					t.Fatalf("expected %s = %q, got %q", want.name, want.value, term.Value)
				}
			}
		}
		if !found {
			t.Fatalf("expected a term for %s", want.name)
		}
	}
}
