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

// A span carries its attributes in the legacy maps or in AttributesJSON (never both); the merged
// bag is always the flat dotted-key shape, with maps winning over a same-named JSON path.
func TestStorableSpanAttributes(t *testing.T) {
	testCases := []struct {
		name string
		span *StorableSpan
		want map[string]any
	}{
		{
			name: "MapOnly_ReadsFromLegacyMaps",
			span: &StorableSpan{
				AttributesString: map[string]string{"http.route": "/a"},
				AttributesNumber: map[string]float64{"http.retry.count": 2},
				AttributesBool:   map[string]bool{"http.cache.hit": true},
			},
			want: map[string]any{"http.route": "/a", "http.retry.count": float64(2), "http.cache.hit": true},
		},
		{
			name: "JSONOnly_ReadsFlattenedPaths",
			span: &StorableSpan{
				AttributesJSON: makeAttributesJSON(map[string]any{"http.route": "/b", "http.retry.count": float64(2), "cache.hit": true}),
			},
			want: map[string]any{"http.route": "/b", "http.retry.count": float64(2), "cache.hit": true},
		},
		{
			name: "ScalarAndObjectKey_StaysDistinctPaths",
			span: &StorableSpan{
				AttributesJSON: makeAttributesJSON(map[string]any{"db.function": "node_refresh", "db.function.arg_count": float64(2)}),
			},
			want: map[string]any{"db.function": "node_refresh", "db.function.arg_count": float64(2)},
		},
		{
			name: "MapEntry_WinsOverSameNamedJSONPath",
			span: &StorableSpan{
				AttributesString: map[string]string{"http.route": "/a"},
				AttributesJSON:   makeAttributesJSON(map[string]any{"http.route": "/stale"}),
			},
			want: map[string]any{"http.route": "/a"},
		},
		{
			name: "EmptyJSON_ContributesNothing",
			span: &StorableSpan{
				AttributesString: map[string]string{"http.route": "/a"},
				AttributesJSON:   makeAttributesJSON(nil),
			},
			want: map[string]any{"http.route": "/a"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.span.Attributes())
		})
	}
}
