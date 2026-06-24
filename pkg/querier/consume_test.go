package querier

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/spantypes"
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
