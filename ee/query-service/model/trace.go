package model

import (
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type SpanItem struct {
	TimeUnixNano uint64                  `json:"timestamp"`
	SpanID       string                  `json:"spanID"`
	TraceID      string                  `json:"traceID"`
	ServiceName  string                  `json:"serviceName"`
	Name         string                  `json:"name"`
	Kind         int32                   `json:"kind"`
	References   []basemodel.OtelSpanRef `json:"references,omitempty"`
	DurationNano int64                   `json:"durationNano"`
	TagKeys      []string                `json:"tagKeys"`
	TagValues    []string                `json:"tagValues"`
	Events       []string                `json:"event"`
	HasError     bool                    `json:"hasError"`
}

type Span struct {
	TimeUnixNano uint64            `json:"timestamp"`
	SpanID       string            `json:"spanID"`
	TraceID      string            `json:"traceID"`
	ParentID     string            `json:"parentID"`
	ParentSpan   *Span             `json:"parentSpan"`
	ServiceName  string            `json:"serviceName"`
	Name         string            `json:"name"`
	Kind         int32             `json:"kind"`
	DurationNano int64             `json:"durationNano"`
	TagMap       map[string]string `json:"tagMap"`
	Events       []string          `json:"event"`
	HasError     bool              `json:"hasError"`
	Children     []*Span           `json:"children"`
}

type GetSpansSubQueryDBResponse struct {
	SpanID  string `ch:"spanID"`
	TraceID string `ch:"traceID"`
}
