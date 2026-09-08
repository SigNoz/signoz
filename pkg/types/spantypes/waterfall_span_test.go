package spantypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/assert"
)

// The trace span reads suppress whichever attribute home is empty per row, so a StorableSpan
// carries its attributes in the legacy maps or in AttributesJSON, never duplicated. The merged
// bag must stay the flat dotted-key shape regardless.
func TestStorableSpanAttributesHomes(t *testing.T) {
	t.Run("map-only span reads from the legacy maps", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesNumber: map[string]float64{"http.retry.count": 2},
			AttributesBool:   map[string]bool{"http.cache.hit": true},
		}

		assert.Equal(t, map[string]any{
			"http.route":       "/a",
			"http.retry.count": float64(2),
			"http.cache.hit":   true,
		}, span.Attributes())
		assert.Equal(t, "/a", span.AttributeValue("http.route"))
		assert.Equal(t, float64(2), span.AttributeValue("http.retry.count"))
	})

	t.Run("json-only span flattens the nested document", func(t *testing.T) {
		span := &StorableSpan{
			AttributesJSON: telemetrystoretypes.JSONValue{
				"http":      map[string]any{"route": "/a", "retry": map[string]any{"count": float64(2)}},
				"cache.hit": true,
			},
		}

		assert.Equal(t, map[string]any{
			"http.route":       "/a",
			"http.retry.count": float64(2),
			"cache.hit":        true,
		}, span.Attributes())
	})

	t.Run("AttributeValue resolves dotted names through the nested document", func(t *testing.T) {
		span := &StorableSpan{
			AttributesJSON: telemetrystoretypes.JSONValue{
				"http": map[string]any{"route": "/a", "retry": map[string]any{"count": float64(2)}},
			},
		}

		assert.Equal(t, "/a", span.AttributeValue("http.route"))
		assert.Equal(t, float64(2), span.AttributeValue("http.retry.count"))
		assert.Nil(t, span.AttributeValue("http"), "a parent path is not a leaf value")
		assert.Nil(t, span.AttributeValue("missing"))
	})

	t.Run("json paths win over same-named map entries", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/stale"},
			AttributesJSON:   telemetrystoretypes.JSONValue{"http": map[string]any{"route": "/a"}},
		}

		assert.Equal(t, "/a", span.Attributes()["http.route"])
	})

	t.Run("empty json document contributes nothing", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesJSON:   telemetrystoretypes.JSONValue{},
		}

		assert.Equal(t, map[string]any{"http.route": "/a"}, span.Attributes())
		assert.Equal(t, "/a", span.AttributeValue("http.route"))
	})
}
