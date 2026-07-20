package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTelemetryGrantSelector(t *testing.T) {
	valid := map[string]string{
		"*":                                   "*",
		"builder_query":                       "builder_query/*",
		"builder_query/*":                     "builder_query/*",
		"promql":                              "promql/*",
		"clickhouse_sql":                      "clickhouse_sql/*",
		"builder_query/service.name/*":        "builder_query/service.name/*",
		"builder_query/service.name/checkout": "builder_query/service.name/checkout",
		"builder_query/resource.service.name/checkout":                                        "builder_query/service.name/checkout",
		"builder_query/service.name/check out":                                                "builder_query/service.name/check out",
		"builder_query/service.name/a/b":                                                      "builder_query/service.name/a/b",
		"builder_query/signoz.workspace.key.id/019d9a99-f8f0-7e50-8bb3-995599fa1f76":          "builder_query/signoz.workspace.key.id/019d9a99-f8f0-7e50-8bb3-995599fa1f76",
		"builder_query/resource.signoz.workspace.key.id/019d9a99-f8f0-7e50-8bb3-995599fa1f76": "builder_query/signoz.workspace.key.id/019d9a99-f8f0-7e50-8bb3-995599fa1f76",
	}
	for input, expected := range valid {
		canonical, err := NewTelemetryGrantSelector(input)
		require.NoError(t, err, "input %q", input)
		assert.Equal(t, expected, canonical, "input %q", input)
	}

	invalid := []string{
		"",
		"checkout",
		"service.name = 'checkout'",
		"builder_trace_operator/service.name/checkout",
		"builder_query/deployment.environment/qa",
		"builder_query/service.name/",
		"builder_query/service.name/$svc",
		"*/service.name/checkout",
		"builder_query/service.name",
		"clickhouse_sql/service.name/signoz",
		"clickhouse_sql/service.name/*",
		"promql/service.name/signoz",
	}
	for _, input := range invalid {
		_, err := NewTelemetryGrantSelector(input)
		assert.Error(t, err, "input %q", input)
	}
}

func TestNewTelemetryGrantKey(t *testing.T) {
	valid := map[string]string{
		"service.name":                     "service.name",
		"resource.service.name":            "service.name",
		"signoz.workspace.key.id":          "signoz.workspace.key.id",
		"resource.signoz.workspace.key.id": "signoz.workspace.key.id",
	}
	for keyText, expected := range valid {
		key, ok := NewTelemetryGrantKey(keyText)
		assert.True(t, ok, keyText)
		assert.Equal(t, expected, key, keyText)
	}

	for _, keyText := range []string{"deployment.environment", "attribute.service.name", "body.service.name"} {
		_, ok := NewTelemetryGrantKey(keyText)
		assert.False(t, ok, keyText)
	}
}

func TestNewTelemetryGrantSelectors(t *testing.T) {
	ladders := map[string][]string{
		"*":                              {"*"},
		"builder_query/*":                {"builder_query/*", "*"},
		"promql/*":                       {"promql/*", "*"},
		"builder_query/service.name/*":   {"builder_query/service.name/*", "builder_query/*", "*"},
		"builder_query/service.name/a":   {"builder_query/service.name/a", "builder_query/service.name/*", "builder_query/*", "*"},
		"builder_query/service.name/a/b": {"builder_query/service.name/a/b", "builder_query/service.name/*", "builder_query/*", "*"},
	}
	for selector, expected := range ladders {
		assert.Equal(t, expected, NewTelemetryGrantSelectors(selector), "selector %q", selector)
	}
}
