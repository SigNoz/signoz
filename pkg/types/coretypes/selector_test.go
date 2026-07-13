package coretypes

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTelemetryResourceSelectorRegex(t *testing.T) {
	valid := []string{
		"*",
		"a",
		"checkout-service",
		"signoz agent",
		"frontend/us-east-1",
		"abcdef0123456789abcdef0123456789",
		strings.Repeat("a", 255),
	}
	for _, value := range valid {
		_, err := TypeTelemetryResource.Selector(value)
		assert.NoError(t, err, "expected %q to be a valid telemetry selector", value)
	}

	invalid := []string{
		"",
		" ",
		" leading-space",
		"trailing-space ",
		strings.Repeat("a", 256),
	}
	for _, value := range invalid {
		_, err := TypeTelemetryResource.Selector(value)
		assert.Error(t, err, "expected %q to be rejected as a telemetry selector", value)
	}
}

func TestTelemetrySelectorSegment(t *testing.T) {
	segment := TelemetrySelectorSegment("checkout-service")
	assert.Len(t, segment, 32)
	assert.Equal(t, segment, TelemetrySelectorSegment("checkout-service"))
	assert.NotEqual(t, segment, TelemetrySelectorSegment("checkout-service2"))
}
