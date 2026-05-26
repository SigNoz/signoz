package spantypes

import (
	"maps"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type FlamegraphSpan struct {
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId"`
	Timestamp    uint64            `json:"timestamp"`
	DurationNano uint64            `json:"durationNano"`
	HasError     bool              `json:"hasError"`
	ServiceName  string            `json:"serviceName"`
	Name         string            `json:"name"`
	Level        int64             `json:"level"`
	Events       []Event           `json:"event"`
	Attributes   map[string]any    `json:"attributes,omitempty"`
	Resource     map[string]string `json:"resource,omitempty"`
	Children     []*FlamegraphSpan `json:"-"` // internal tree use only
}

// FlamegraphWindowLevel groups span IDs at a single level within the selected window.
type FlamegraphWindowLevel struct {
	Level   int64
	SpanIDs []string
}

type PostableFlamegraph struct {
	SelectedSpanID string                             `json:"selectedSpanId"`
	Limit          uint                               `json:"limit"`
	SelectFields   []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`
}

// GettableFlamegraphTrace is the response for the v3 flamegraph API.
type GettableFlamegraphTrace struct {
	Spans                [][]*FlamegraphSpan `json:"spans"`
	StartTimestampMillis int64               `json:"startTimestampMillis"`
	EndTimestampMillis   int64               `json:"endTimestampMillis"`
	HasMore              bool                `json:"hasMore"`
}

func NewFlamegraphSpanFromStorable(s *StorableSpan, level int64) *FlamegraphSpan {
	resources := make(map[string]string, len(s.ResourcesString))
	maps.Copy(resources, s.ResourcesString)
	return &FlamegraphSpan{
		SpanID:       s.SpanID,
		ParentSpanID: s.ParentSpanID,
		Timestamp:    uint64(s.StartTime.UnixNano()),
		DurationNano: s.DurationNano,
		HasError:     s.HasError,
		ServiceName:  s.ServiceName,
		Name:         s.Name,
		Level:        level,
		Events:       s.UnmarshalledEvents(),
		Attributes:   s.Attributes(),
		Resource:     resources,
	}
}
