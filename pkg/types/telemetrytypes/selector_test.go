package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTelemetryGrantSelector(t *testing.T) {
	valid := map[string]string{
		"*":               "*",
		"builder_query":   "builder_query/*",
		"builder_query/*": "builder_query/*",
		"promql":          "promql/*",
		"clickhouse_sql":  "clickhouse_sql/*",
		"builder_query/signoz.workspace.key.id/*":              "builder_query/signoz.workspace.key.id/*",
		"builder_query/signoz.workspace.key.id/key-a":          "builder_query/signoz.workspace.key.id/key-a",
		"builder_query/resource.signoz.workspace.key.id/key-a": "builder_query/signoz.workspace.key.id/key-a",
		"builder_query/signoz.workspace.key.id/key a":          "builder_query/signoz.workspace.key.id/key a",
		"builder_query/signoz.workspace.key.id/a/b":            "builder_query/signoz.workspace.key.id/a/b",
		"builder_query/service.name/frontend":                  "builder_query/service.name/frontend",
		"builder_query/resource.service.name/frontend":         "builder_query/service.name/frontend",
		"builder_query/service.name/*":                         "builder_query/service.name/*",
		"builder_query/deployment.environment/prod":            "builder_query/deployment.environment/prod",
		"builder_query/deployment.environment.name/prod":       "builder_query/deployment.environment.name/prod",
		"builder_query/resource.deployment.environment/prod":   "builder_query/deployment.environment/prod",
	}
	for input, expected := range valid {
		canonical, err := NewTelemetryGrantSelector(input)
		require.NoError(t, err, "input %q", input)
		assert.Equal(t, expected, canonical, "input %q", input)
	}

	invalid := []string{
		"",
		"key-a",
		"signoz.workspace.key.id = 'key-a'",
		"builder_trace_operator/signoz.workspace.key.id/key-a",
		"builder_query/attribute.service.name/frontend",
		"builder_query/host.name/frontend",
		"builder_query/signoz.workspace.key.id/",
		"builder_query/signoz.workspace.key.id/$svc",
		"*/signoz.workspace.key.id/key-a",
		"builder_query/signoz.workspace.key.id",
		"clickhouse_sql/signoz.workspace.key.id/key-a",
		"clickhouse_sql/signoz.workspace.key.id/*",
		"promql/signoz.workspace.key.id/key-a",
	}
	for _, input := range invalid {
		_, err := NewTelemetryGrantSelector(input)
		assert.Error(t, err, "input %q", input)
	}
}

func TestNewTelemetryGrantKey(t *testing.T) {
	valid := map[string]string{
		"signoz.workspace.key.id":              "signoz.workspace.key.id",
		"resource.signoz.workspace.key.id":     "signoz.workspace.key.id",
		"service.name":                         "service.name",
		"resource.service.name":                "service.name",
		"deployment.environment":               "deployment.environment",
		"deployment.environment.name":          "deployment.environment.name",
		"resource.deployment.environment.name": "deployment.environment.name",
	}
	for keyText, expected := range valid {
		key, ok := NewTelemetryGrantKey(keyText)
		assert.True(t, ok, keyText)
		assert.Equal(t, expected, key, keyText)
	}

	for _, keyText := range []string{"host.name", "attribute.signoz.workspace.key.id", "attribute.service.name", "body.signoz.workspace.key.id"} {
		_, ok := NewTelemetryGrantKey(keyText)
		assert.False(t, ok, keyText)
	}
}

func TestNewTelemetryGrantSelectors(t *testing.T) {
	ladders := map[string][]string{
		"*":               {"*"},
		"builder_query/*": {"builder_query/*", "*"},
		"promql/*":        {"promql/*", "*"},
		"builder_query/signoz.workspace.key.id/*":   {"builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"},
		"builder_query/signoz.workspace.key.id/a":   {"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"},
		"builder_query/signoz.workspace.key.id/a/b": {"builder_query/signoz.workspace.key.id/a/b", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"},
	}
	for selector, expected := range ladders {
		assert.Equal(t, expected, NewTelemetryGrantSelectors(selector), "selector %q", selector)
	}
}
