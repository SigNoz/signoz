package spantypes

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type FlamegraphSpan struct {
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId"`
	Timestamp    uint64            `json:"timestamp"`
	DurationNano uint64            `json:"durationNano"`
	HasError     bool              `json:"hasError"`
	Name         string            `json:"name"`
	Level        int64             `json:"level"`
	Events       []Event           `json:"event" required:"true" nullable:"false"`
	Attributes   map[string]any    `json:"attributes,omitempty"`
	Resource     map[string]string `json:"resource,omitempty"`
	Children     []*FlamegraphSpan `json:"-"` // internal tree use only
}

// FlamegraphLevel groups span IDs at a single level within the selected window.
type FlamegraphLevel struct {
	Level   int64
	SpanIDs []string
}

type PostableFlamegraph struct {
	SelectedSpanID string                             `json:"selectedSpanId"`
	SelectFields   []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`
}

// GettableFlamegraphTrace is the response for the v3 flamegraph API.
type GettableFlamegraphTrace struct {
	Spans                [][]*FlamegraphSpan `json:"spans" required:"true" nullable:"false"`
	StartTimestampMillis int64               `json:"startTimestampMillis" required:"true"`
	EndTimestampMillis   int64               `json:"endTimestampMillis" required:"true"`
	HasMore              bool                `json:"hasMore" required:"true"`
}

func NewGettableFlamegraphTrace(spans [][]*FlamegraphSpan, startMs, endMs int64, hasMore bool) *GettableFlamegraphTrace {
	return &GettableFlamegraphTrace{
		Spans:                spans,
		StartTimestampMillis: startMs,
		EndTimestampMillis:   endMs,
		HasMore:              hasMore,
	}
}

func NewFlamegraphSpanFromStorable(s *StorableSpan, level int64, selectFields []telemetrytypes.TelemetryFieldKey) *FlamegraphSpan {
	span := &FlamegraphSpan{
		SpanID:       s.SpanID,
		ParentSpanID: s.ParentSpanID,
		Timestamp:    uint64(s.StartTime.UnixNano()),
		DurationNano: s.DurationNano,
		HasError:     s.HasError,
		Name:         s.Name,
		Level:        level,
		Events:       s.UnmarshalledEvents(),
	}
	if len(selectFields) == 0 {
		return span
	}
	for _, field := range selectFields {
		switch field.FieldContext {
		case telemetrytypes.FieldContextResource:
			if v, ok := s.ResourcesString[field.Name]; ok && v != "" {
				if span.Resource == nil {
					span.Resource = make(map[string]string)
				}
				span.Resource[field.Name] = v
			}
		case telemetrytypes.FieldContextAttribute:
			if v := s.AttributeValue(field.Name); v != nil {
				if span.Attributes == nil {
					span.Attributes = make(map[string]any)
				}
				span.Attributes[field.Name] = v
			}
		}
	}
	return span
}

func NewMissingParentFlamegraphSpan(node *FlamegraphSpan) *FlamegraphSpan {
	return &FlamegraphSpan{
		SpanID:       node.ParentSpanID,
		Name:         "Missing Span",
		Timestamp:    node.Timestamp,
		DurationNano: node.DurationNano,
		Events:       []Event{},
		References:   []OtelSpanRef{},
		Children:     []*FlamegraphSpan{node},
	}
}

// FlamegraphWindowSpanIDs collects all span IDs from a level window into a flat slice.
func FlamegraphWindowSpanIDs(window []FlamegraphLevel) []string {
	total := 0
	for _, lvl := range window {
		total += len(lvl.SpanIDs)
	}
	ids := make([]string, 0, total)
	for _, lvl := range window {
		ids = append(ids, lvl.SpanIDs...)
	}
	return ids
}
