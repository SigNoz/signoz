package spantypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
)

func makeAttributesJSON(paths map[string]any) chcol.JSON {
	j := chcol.NewJSON()
	for path, value := range paths {
		j.SetValueAtPath(path, value)
	}
	return *j
}

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

	t.Run("json-only span reads its flattened paths", func(t *testing.T) {
		span := &StorableSpan{
			AttributesJSON: makeAttributesJSON(map[string]any{
				"http.route":       "/a",
				"http.retry.count": float64(2),
				"cache.hit":        true,
			}),
		}

		assert.Equal(t, map[string]any{
			"http.route":       "/a",
			"http.retry.count": float64(2),
			"cache.hit":        true,
		}, span.Attributes())
	})

	t.Run("a scalar and an object under one key stay distinct paths", func(t *testing.T) {
		span := &StorableSpan{
			AttributesJSON: makeAttributesJSON(map[string]any{
				"db.function":           "node_refresh",
				"db.function.arg_count": float64(2),
			}),
		}

		assert.Equal(t, map[string]any{
			"db.function":           "node_refresh",
			"db.function.arg_count": float64(2),
		}, span.Attributes())
	})

	t.Run("map entries win over same-named json paths", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesJSON:   makeAttributesJSON(map[string]any{"http.route": "/stale"}),
		}

		assert.Equal(t, "/a", span.Attributes()["http.route"])
	})

	t.Run("empty json document contributes nothing", func(t *testing.T) {
		span := &StorableSpan{
			AttributesString: map[string]string{"http.route": "/a"},
			AttributesJSON:   makeAttributesJSON(nil),
		}

		assert.Equal(t, map[string]any{"http.route": "/a"}, span.Attributes())
	})
}
