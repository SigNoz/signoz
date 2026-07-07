package coretypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTelemetryResourceSelectorRegex(t *testing.T) {
	segment := "abcdef0123456789abcdef0123456789"

	valid := []string{
		"*",
		"builder_query",
		"promql",
		"clickhouse_sql",
		"builder_trace_operator",
		"builder_sub_query",
		"builder_query/" + segment,
		"builder_query/*",
		"builder_query/" + segment + "/" + segment,
		"builder_query/" + segment + "/*",
	}
	for _, value := range valid {
		_, err := TypeTelemetryResource.Selector(value)
		assert.NoError(t, err, "expected %q to be a valid telemetry selector", value)
	}

	invalid := []string{
		"",
		"builder_formula",
		"builder_join",
		"trace_operator",
		"builder_query/abc",
		"builder_query/" + segment + "/" + segment + "/" + segment,
		"unknown_type/" + segment,
	}
	for _, value := range invalid {
		_, err := TypeTelemetryResource.Selector(value)
		assert.Error(t, err, "expected %q to be rejected as a telemetry selector", value)
	}
}
