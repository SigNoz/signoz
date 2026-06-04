package spantypes

import "encoding/json"

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

// ParseEvents column (Array(String) of JSON-encoded events) into a slice of Event values.
// Malformed entries are skipped.
func ParseEvents(raw any) []EventV2 {
	strs, ok := raw.([]string)
	if !ok {
		return []EventV2{}
	}
	events := make([]EventV2, 0, len(strs))
	for _, s := range strs {
		var e Event
		if err := json.Unmarshal([]byte(s), &e); err != nil {
			continue
		}
		events = append(events, EventV2{
			Name:         e.Name,
			TimeUnixNano: e.TimeUnixNano,
			Attributes:   e.AttributeMap,
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
	var links []Link
	if err := json.Unmarshal([]byte(s), &links); err != nil {
		return []Link{}
	}
	return links
}
