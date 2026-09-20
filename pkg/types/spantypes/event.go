package spantypes

import (
	"encoding/json"
	"strconv"
	"strings"
)

// The Event struct has the data exactly store in the db, while EventV2 is more of what we want to send to client.
type EventV2 struct {
	Name         string         `json:"name"`
	TimeUnixNano uint64         `json:"timeUnixNano"`
	Attributes   map[string]any `json:"attributes,omitempty"`
	IsError      bool           `json:"isError,omitempty"`
}

// Link is the response shape for a span link.
// The refType field is intentionally not decoded; it's a Jaeger-era
// concept that OTel doesn't model, so we drop it on the way out.
type Link struct {
	TraceID string `json:"traceId,omitempty"`
	SpanID  string `json:"spanId,omitempty"`
}

// ParseEvents accepts ClickHouse's Array(String) and SQL JSON-array storage.
// Malformed entries are skipped.
func ParseEvents(raw any) []EventV2 {
	var strs []string
	switch value := raw.(type) {
	case []string:
		strs = value
	case string:
		var items []json.RawMessage
		if json.Unmarshal([]byte(value), &items) != nil {
			return []EventV2{}
		}
		for _, item := range items {
			strs = append(strs, string(item))
		}
	default:
		return []EventV2{}
	}
	events := make([]EventV2, 0, len(strs))
	for _, s := range strs {
		var e struct {
			Name              string          `json:"name"`
			TimeUnixNano      json.RawMessage `json:"timeUnixNano"`
			TimestampUnixNano json.RawMessage `json:"timestamp_unix_nano"`
			AttributeMap      map[string]any  `json:"attributeMap"`
			Attributes        map[string]any  `json:"attributes"`
		}
		if err := json.Unmarshal([]byte(s), &e); err != nil {
			continue
		}
		timestamp := e.TimeUnixNano
		if len(timestamp) == 0 {
			timestamp = e.TimestampUnixNano
		}
		var nano uint64
		if len(timestamp) != 0 {
			var err error
			nano, err = strconv.ParseUint(strings.Trim(string(timestamp), `"`), 10, 64)
			if err != nil {
				continue
			}
		}
		attributes := e.AttributeMap
		if attributes == nil {
			attributes = e.Attributes
		}
		events = append(events, EventV2{
			Name:         e.Name,
			TimeUnixNano: nano,
			Attributes:   attributes,
			IsError:      false,
		})
	}
	return events
}

func ParseLinks(raw any) []Link {
	s, ok := raw.(string)
	if !ok || s == "" {
		return []Link{}
	}
	var stored []struct {
		Link
		TraceIDSnake string `json:"trace_id"`
		SpanIDSnake  string `json:"span_id"`
	}
	if err := json.Unmarshal([]byte(s), &stored); err != nil {
		return []Link{}
	}
	links := make([]Link, 0, len(stored))
	for _, item := range stored {
		link := item.Link
		if link.TraceID == "" {
			link.TraceID = item.TraceIDSnake
		}
		if link.SpanID == "" {
			link.SpanID = item.SpanIDSnake
		}
		links = append(links, link)
	}
	return links
}
