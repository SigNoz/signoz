package spantypes

import "encoding/json"

type Event struct {
	Name         string         `json:"name"`
	TimeUnixNano uint64         `json:"timeUnixNano"`
	Attributes   map[string]any `json:"attributes,omitempty"`
}

// Link is the response shape for a span link.
// The refType field is intentionally not decoded; it's a Jaeger-era
// concept that OTel doesn't model, so we drop it on the way out.
type Link struct {
	TraceID string `json:"traceId,omitempty"`
	SpanID  string `json:"spanId,omitempty"`
}

// dbEvent matches the JSON object stored in the ClickHouse `events`
// Array(String) column.
type dbEvent struct {
	Name         string         `json:"name"`
	TimeUnixNano uint64         `json:"timeUnixNano"`
	AttributeMap map[string]any `json:"attributeMap"`
}

// ParseEvents column (Array(String) of JSON-encoded events) into a slice of Event values.
// Malformed entries are skipped
func ParseEvents(raw any) []Event {
	strs, ok := raw.([]string)
	if !ok {
		return []Event{}
	}
	events := make([]Event, 0, len(strs))
	for _, s := range strs {
		var e dbEvent
		if err := json.Unmarshal([]byte(s), &e); err != nil {
			continue
		}
		events = append(events, Event{
			Name:         e.Name,
			TimeUnixNano: e.TimeUnixNano,
			Attributes:   e.AttributeMap,
		})
	}
	return events
}

func ParseLinks(raw any) []Link {
	s, ok := raw.(string)
	if !ok || s == "" {
		return []Link{}
	}
	var links []Link
	if err := json.Unmarshal([]byte(s), &links); err != nil {
		return []Link{}
	}
	return links
}
