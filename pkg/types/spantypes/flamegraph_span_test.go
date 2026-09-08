package spantypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func attributeField(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{Name: name, FieldContext: telemetrytypes.FieldContextAttribute}
}

func resourceField(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{Name: name, FieldContext: telemetrytypes.FieldContextResource}
}

// The flamegraph selectFields read resolves attribute fields from the span's merged bag, which
// is built at most once per span no matter how many attribute fields are selected.
func TestNewFlamegraphSpanFromStorableSelectFields(t *testing.T) {
	t.Run("attribute fields resolve through the nested json document", func(t *testing.T) {
		span := &StorableSpan{
			SpanID: "s1",
			AttributesJSON: telemetrystoretypes.JSONValue{
				"http": map[string]any{"route": "/a", "retry": map[string]any{"count": float64(2)}},
			},
		}

		flat := NewFlamegraphSpanFromStorable(span, 0, []telemetrytypes.TelemetryFieldKey{
			attributeField("http.route"), attributeField("http.retry.count"),
			attributeField("http"), attributeField("missing"),
		})

		assert.Equal(t, map[string]any{"http.route": "/a", "http.retry.count": float64(2)}, flat.Attributes,
			"leaves resolve; a parent path and a missing key contribute nothing")
	})

	t.Run("attribute fields resolve from the legacy maps", func(t *testing.T) {
		span := &StorableSpan{
			SpanID:           "s1",
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesNumber: map[string]float64{"http.retry.count": 2},
		}

		flat := NewFlamegraphSpanFromStorable(span, 0, []telemetrytypes.TelemetryFieldKey{
			attributeField("http.route"), attributeField("http.retry.count"), attributeField("missing"),
		})

		assert.Equal(t, map[string]any{"http.route": "/a", "http.retry.count": float64(2)}, flat.Attributes)
	})

	t.Run("json null values are skipped", func(t *testing.T) {
		span := &StorableSpan{
			SpanID:         "s1",
			AttributesJSON: telemetrystoretypes.JSONValue{"k": nil},
		}

		flat := NewFlamegraphSpanFromStorable(span, 0, []telemetrytypes.TelemetryFieldKey{attributeField("k")})

		assert.Empty(t, flat.Attributes)
	})

	t.Run("resource fields come from resources_string, empties skipped", func(t *testing.T) {
		span := &StorableSpan{
			SpanID:          "s1",
			ResourcesString: map[string]string{"service.name": "api", "deployment.environment": ""},
		}

		flat := NewFlamegraphSpanFromStorable(span, 0, []telemetrytypes.TelemetryFieldKey{
			resourceField("service.name"), resourceField("deployment.environment"), resourceField("missing"),
		})

		assert.Equal(t, map[string]string{"service.name": "api"}, flat.Resource)
	})

	t.Run("no selectFields means empty bags", func(t *testing.T) {
		span := &StorableSpan{SpanID: "s1", AttributesString: map[string]string{"http.route": "/a"}}

		flat := NewFlamegraphSpanFromStorable(span, 0, nil)

		assert.Empty(t, flat.Attributes)
		assert.Empty(t, flat.Resource)
	})
}
