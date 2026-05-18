package spantypes

import (
	"reflect"
	"testing"
)

func TestParseEvents(t *testing.T) {
	got := ParseEvents([]string{
		`{"name":"ok","timeUnixNano":1}`,
		`not-json`,
		`{"name":"second","timeUnixNano":2,"attributeMap":{"k":"v"}}`,
	})
	want := []Event{
		{Name: "ok", TimeUnixNano: 1},
		{Name: "second", TimeUnixNano: 2, Attributes: map[string]any{"k": "v"}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v, want %#v", got, want)
	}
}

func TestParseEvents_NotASlice(t *testing.T) {
	if got := ParseEvents("nope"); len(got) != 0 {
		t.Fatalf("expected empty events for non-slice input, got %#v", got)
	}
}

func TestParseLinks(t *testing.T) {
	got := ParseLinks(`[{"traceId":"abc","spanId":"123","refType":"CHILD_OF"},{"traceId":"def","spanId":"456"}]`)
	want := []Link{
		{TraceID: "abc", SpanID: "123"},
		{TraceID: "def", SpanID: "456"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v, want %#v", got, want)
	}
}

func TestParseLinks_MalformedYieldsEmpty(t *testing.T) {
	if got := ParseLinks("not-json"); len(got) != 0 {
		t.Fatalf("expected empty links for malformed input, got %#v", got)
	}
	if got := ParseLinks(""); len(got) != 0 {
		t.Fatalf("expected empty links for empty input, got %#v", got)
	}
}
