package spantypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type FlamegraphSpan struct {
	SpanID       string            `json:"spanId" required:"true"`
	ParentSpanID string            `json:"parentSpanId" required:"true"`
	Timestamp    uint64            `json:"timestamp" required:"true"`
	DurationNano uint64            `json:"durationNano" required:"true"`
	HasError     bool              `json:"hasError" required:"true"`
	Name         string            `json:"name" required:"true"`
	Level        int64             `json:"level" required:"true"`
	Events       []Event           `json:"event" required:"true" nullable:"false"`
	Attributes   map[string]any    `json:"attributes" required:"true" nullable:"false"`
	Resource     map[string]string `json:"resource" required:"true" nullable:"false"`
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

func NewGettableFlamegraphTrace(spans [][]*FlamegraphSpan, start, end time.Time, hasMore bool) *GettableFlamegraphTrace {
	// convert timestamp to millisecond since client expect that
	for _, level := range spans {
		for _, span := range level {
			span.Timestamp /= 1_000_000
		}
	}
	return &GettableFlamegraphTrace{
		Spans:                spans,
		StartTimestampMillis: start.UnixMilli(),
		EndTimestampMillis:   end.UnixMilli(),
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
		Attributes:   make(map[string]any),
		Resource:     make(map[string]string),
	}
	if len(selectFields) == 0 {
		return span
	}
	for _, field := range selectFields {
		switch field.FieldContext {
		case telemetrytypes.FieldContextResource:
			if v, ok := s.ResourcesString[field.Name]; ok && v != "" {
				span.Resource[field.Name] = v
			}
		case telemetrytypes.FieldContextAttribute:
			if v := s.AttributeValue(field.Name); v != nil {
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
