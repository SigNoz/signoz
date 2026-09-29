package querier

import (
	"reflect"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMergeSpanAttributeColumns_ParsesEventsAndLinks(t *testing.T) {
	data := map[string]any{
		"attributes_string": map[string]string{"http.method": "GET"},
		"attributes_number": map[string]float64{"http.status_code": 200},
		"attributes_bool":   map[string]bool{"is_root": true},
		"resources_string":  map[string]string{"service.name": "api"},
		"events": []string{
			`{"name":"request_received","timeUnixNano":1778489782759245000,"attributeMap":{"http.method":"GET","http.route":"/api/chat"}}`,
			`{"name":"cache_lookup","timeUnixNano":1778489782811697000,"attributeMap":{"cache.hit":"true","cache.key":"user:123:prompt"}}`,
		},
		"links": `[{"traceId":"abc","spanId":"123","refType":"CHILD_OF"},{"traceId":"def","spanId":"456","refType":"FOLLOWS_FROM"}]`,
	}

	mergeSpanAttributeColumns(data)

	attrs, ok := data["attributes"].(map[string]any)
	if !ok {
		t.Fatalf("expected attributes to be map[string]any, got %T", data["attributes"])
	}
	if attrs["http.method"] != "GET" || attrs["http.status_code"] != float64(200) || attrs["is_root"] != true {
		t.Fatalf("attributes not merged correctly: %#v", attrs)
	}

	res, ok := data["resource"].(map[string]string)
	if !ok || res["service.name"] != "api" {
		t.Fatalf("resource not set correctly: %#v", data["resource"])
	}

	for _, removed := range []string{"attributes_string", "attributes_number", "attributes_bool", "resources_string"} {
		if _, present := data[removed]; present {
			t.Fatalf("expected %s to be removed", removed)
		}
	}

	events, ok := data["events"].([]spantypes.EventV2)
	if !ok {
		t.Fatalf("expected events to be []spantypes.EventV2, got %T", data["events"])
	}
	wantEvents := []spantypes.EventV2{
		{
			Name:         "request_received",
			TimeUnixNano: 1778489782759245000,
			Attributes:   map[string]any{"http.method": "GET", "http.route": "/api/chat"},
			IsError:      false,
		},
		{
			Name:         "cache_lookup",
			TimeUnixNano: 1778489782811697000,
			Attributes:   map[string]any{"cache.hit": "true", "cache.key": "user:123:prompt"},
		},
	}
	if !reflect.DeepEqual(events, wantEvents) {
		t.Fatalf("events parsed incorrectly:\n got:  %#v\nwant: %#v", events, wantEvents)
	}

	links, ok := data["links"].([]spantypes.Link)
	if !ok {
		t.Fatalf("expected links to be []spantypes.Link, got %T", data["links"])
	}
	wantLinks := []spantypes.Link{
		{TraceID: "abc", SpanID: "123"},
		{TraceID: "def", SpanID: "456"},
	}
	if !reflect.DeepEqual(links, wantLinks) {
		t.Fatalf("links parsed incorrectly:\n got:  %#v\nwant: %#v", links, wantLinks)
	}
}

// unwrapVariant unwraps the driver's scan envelopes: a Dynamic column (a JSON path like
// body_v2.level) as chcol.Variant, and a whole JSON column as chcol.JSON flattened to its paths.
func TestUnwrapVariant(t *testing.T) {
	assert.Equal(t, "error", unwrapVariant(chcol.NewDynamicWithType("error", "String")))
	assert.Nil(t, unwrapVariant(chcol.Dynamic{}))
	assert.Equal(t, uint64(3), unwrapVariant(uint64(3)))

	// a JSON column is flattened to dotted paths, so a key stored as both a scalar and an object survives
	j := chcol.NewJSON()
	j.SetValueAtPath("db.function", "node_refresh")
	j.SetValueAtPath("db.function.arg_count", float64(2))
	assert.Equal(t, map[string]any{
		"db.function":           "node_refresh",
		"db.function.arg_count": float64(2),
	}, unwrapVariant(*j))
}

func TestMergeSpanAttributeColumns_EmptyEventsAndLinks(t *testing.T) {
	data := map[string]any{
		"events": []string{},
		"links":  "[]",
	}

	mergeSpanAttributeColumns(data)

	if events, ok := data["events"].([]spantypes.EventV2); !ok || len(events) != 0 {
		t.Fatalf("expected empty []spantypes.EventV2, got %#v", data["events"])
	}
	if links, ok := data["links"].([]spantypes.Link); !ok || len(links) != 0 {
		t.Fatalf("expected empty []spantypes.Link, got %#v", data["links"])
	}
}

// Arrays stay native leaves: the collector stringifies top-level arrays and explodes nested ones
// into indexed keys in the legacy maps; the JSON home keeps them whole and we do not mimic either.
func TestMergeSpanAttributeColumns_JSONColumn(t *testing.T) {
	testCases := []struct {
		name string
		data map[string]any
		want map[string]any
	}{
		{
			name: "JSONOnly_FlattensNestedPaths_PreservesTypes",
			data: map[string]any{
				"attributes": map[string]any{
					"http":      map[string]any{"route": "/api/pay", "retry": map[string]any{"count": float64(3)}},
					"cache.hit": true,
				},
			},
			want: map[string]any{"http.route": "/api/pay", "http.retry.count": float64(3), "cache.hit": true},
		},
		{
			name: "Straddle_MapsWinOnCollision_JSONFillsGaps",
			data: map[string]any{
				"attributes_string": map[string]string{"http.route": "/old", "only.map": "m"},
				"attributes_number": map[string]float64{"http.status": 500},
				"attributes":        map[string]any{"http": map[string]any{"route": "/new"}, "only.json": "j"},
			},
			want: map[string]any{"http.route": "/old", "only.map": "m", "http.status": float64(500), "only.json": "j"},
		},
		{
			name: "MapOnly_EmptyJSONDoc_KeepsMapValues",
			data: map[string]any{
				"attributes_string": map[string]string{"http.route": "/map"},
				"attributes_number": map[string]float64{"http.status": 200},
				"attributes_bool":   map[string]bool{"cache.hit": true},
				"attributes":        map[string]any{},
			},
			want: map[string]any{"http.route": "/map", "http.status": float64(200), "cache.hit": true},
		},
		{
			name: "MapOnly_NilJSON_BehavesAsAbsent",
			data: map[string]any{
				"attributes_string": map[string]string{"http.route": "/map"},
				"attributes":        map[string]any(nil),
			},
			want: map[string]any{"http.route": "/map"},
		},
		{
			name: "Arrays_StayLeafValues",
			data: map[string]any{
				"attributes": map[string]any{"http": map[string]any{"tags": []any{"a", "b"}, "codes": []any{float64(1), float64(2)}}},
			},
			want: map[string]any{"http.tags": []any{"a", "b"}, "http.codes": []any{float64(1), float64(2)}},
		},
		{
			name: "TopLevelArrayOfMaps_StaysNativeLeaf",
			data: map[string]any{
				"attributes": map[string]any{"key": []any{map[string]any{"a": float64(1)}, map[string]any{"b": float64(2)}}},
			},
			want: map[string]any{"key": []any{map[string]any{"a": float64(1)}, map[string]any{"b": float64(2)}}},
		},
		{
			name: "NestedArrayOfMaps_StaysNativeLeaf_NoIndexPaths",
			data: map[string]any{
				"attributes": map[string]any{"http": map[string]any{"items": []any{map[string]any{"a": float64(1)}}}},
			},
			want: map[string]any{"http.items": []any{map[string]any{"a": float64(1)}}},
		},
		{
			name: "DualWritten_NestedArray_IndexKeysAndJSONArrayCoexist",
			data: map[string]any{
				"attributes_number": map[string]float64{"http.items.0.a": 1},
				"attributes":        map[string]any{"http": map[string]any{"items": []any{map[string]any{"a": float64(1)}}}},
			},
			want: map[string]any{"http.items.0.a": float64(1), "http.items": []any{map[string]any{"a": float64(1)}}},
		},
		{
			name: "JSONNull_KeptAsNil",
			data: map[string]any{
				"attributes": map[string]any{"k": nil},
			},
			want: map[string]any{"k": nil},
		},
		{
			name: "KeyIsLeafValue_NotFlattened",
			data: map[string]any{
				"attributes": map[string]any{"http": "plaintext"},
			},
			want: map[string]any{"http": "plaintext"},
		},
		{
			name: "KeyIsParent_FlattensToDottedPath",
			data: map[string]any{
				"attributes": map[string]any{"http": map[string]any{"route": "/a"}},
			},
			want: map[string]any{"http.route": "/a"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mergeSpanAttributeColumns(testCase.data)

			attrs, ok := testCase.data["attributes"].(map[string]any)
			require.True(t, ok, "attributes should be map[string]any, got %T", testCase.data["attributes"])
			assert.Equal(t, testCase.want, attrs)
			for _, removed := range []string{"attributes_string", "attributes_number", "attributes_bool"} {
				_, present := testCase.data[removed]
				assert.False(t, present, "%s should be removed", removed)
			}
		})
	}
}
