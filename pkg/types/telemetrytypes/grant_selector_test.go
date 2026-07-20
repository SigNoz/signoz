package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCanonicalizeTelemetryGrantSelector(t *testing.T) {
	valid := map[string]string{
		"*":                                   "*",
		"builder_query":                       "builder_query/*",
		"builder_query/*":                     "builder_query/*",
		"promql":                              "promql/*",
		"clickhouse_sql":                      "clickhouse_sql/*",
		"builder_query/service.name/*":        "builder_query/service.name/*",
		"builder_query/service.name/checkout": "builder_query/service.name/checkout",
		"builder_query/resource.service.name/checkout": "builder_query/service.name/checkout",
		"builder_query/service.name/check out":         "builder_query/service.name/check out",
		"builder_query/service.name/a/b":               "builder_query/service.name/a/b",
	}
	for input, expected := range valid {
		canonical, err := CanonicalizeTelemetryGrantSelector(input)
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
	}
	for _, input := range invalid {
		_, err := CanonicalizeTelemetryGrantSelector(input)
		assert.Error(t, err, "input %q", input)
	}
}

func TestCanonicalTelemetryGrantKey(t *testing.T) {
	for _, keyText := range []string{"service.name", "resource.service.name"} {
		key, ok := CanonicalTelemetryGrantKey(keyText)
		assert.True(t, ok, keyText)
		assert.Equal(t, "service.name", key)
	}

	for _, keyText := range []string{"deployment.environment", "attribute.service.name", "body.service.name"} {
		_, ok := CanonicalTelemetryGrantKey(keyText)
		assert.False(t, ok, keyText)
	}
}
