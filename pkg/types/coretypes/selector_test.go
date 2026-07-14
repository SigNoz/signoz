package coretypes

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
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

func TestTelemetryResourceObjectSelectors(t *testing.T) {
	orgID := valuer.GenerateUUID()
	prefix := "telemetryresource:organization/" + orgID.StringValue() + "/logs/"

	assert.Equal(t, prefix+"*", ResourceTelemetryResourceLogs.Object(orgID, "*"))
	assert.Equal(t, prefix+"promql/*", ResourceTelemetryResourceLogs.Object(orgID, "promql/*"))
	assert.Equal(t, prefix+"builder_query/*", ResourceTelemetryResourceLogs.Object(orgID, "builder_query/*"))
	assert.Equal(t, prefix+"builder_query/service.name/*", ResourceTelemetryResourceLogs.Object(orgID, "builder_query/service.name/*"))
	assert.Equal(t, prefix+"builder_query/service.name/"+TelemetrySelectorSegment("checkout"), ResourceTelemetryResourceLogs.Object(orgID, "builder_query/service.name/checkout"))
	assert.Equal(t, prefix+"builder_query/service.name/"+TelemetrySelectorSegment("a/b"), ResourceTelemetryResourceLogs.Object(orgID, "builder_query/service.name/a/b"))
	assert.Equal(t, prefix+TelemetrySelectorSegment("builder_query/unknown.key/checkout"), ResourceTelemetryResourceLogs.Object(orgID, "builder_query/unknown.key/checkout"))
	assert.Equal(t, prefix+TelemetrySelectorSegment("service.name = 'checkout'"), ResourceTelemetryResourceLogs.Object(orgID, "service.name = 'checkout'"))

	object := MustNewObjectFromString(prefix + "builder_query/service.name/" + TelemetrySelectorSegment("checkout"))
	assert.Equal(t, "builder_query/service.name/"+TelemetrySelectorSegment("checkout"), object.Selector.String())
	assert.Equal(t, KindLogs, object.Resource.Kind)
}
