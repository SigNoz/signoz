package model

type SpanForTraceDetails struct {
	TimeUnixNano uint64                 `json:"timestamp"`
	SpanID       string                 `json:"spanID"`
	TraceID      string                 `json:"traceID"`
	ParentID     string                 `json:"parentID"`
	ParentSpan   *SpanForTraceDetails   `json:"parentSpan"`
	ServiceName  string                 `json:"serviceName"`
	Name         string                 `json:"name"`
	Kind         int32                  `json:"kind"`
	DurationNano int64                  `json:"durationNano"`
	TagMap       map[string]string      `json:"tagMap"`
	Events       []string               `json:"event"`
	HasError     bool                   `json:"hasError"`
	Children     []*SpanForTraceDetails `json:"children"`
}

type GetSpansSubQueryDBResponse struct {
	SpanID  string `ch:"spanID"`
	TraceID string `ch:"traceID"`
}
