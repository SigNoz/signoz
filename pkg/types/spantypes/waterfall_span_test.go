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

	t.Run("map entries win over same-named json paths", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesJSON:   telemetrystoretypes.JSONValue{"http": map[string]any{"route": "/stale"}},
		}

		assert.Equal(t, "/a", span.Attributes()["http.route"])
	})

	t.Run("empty json document contributes nothing", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesJSON:   telemetrystoretypes.JSONValue{},
		}

		assert.Equal(t, map[string]any{"http.route": "/a"}, span.Attributes())
	})
}
