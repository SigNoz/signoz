package model

import "time"

type SpanItemV2 struct {
	TimeUnixNano      time.Time          `ch:"timestamp"`
	DurationNano      uint64             `ch:"duration_nano"`
	SpanID            string             `ch:"span_id"`
	TraceID           string             `ch:"trace_id"`
	HasError          bool               `ch:"has_error"`
	Kind              int8               `ch:"kind"`
	ServiceName       string             `ch:"resource_string_service$$name"`
	Name              string             `ch:"name"`
	References        string             `ch:"references"`
	Attributes_string map[string]string  `ch:"attributes_string"`
	Attributes_number map[string]float64 `ch:"attributes_number"`
	Attributes_bool   map[string]bool    `ch:"attributes_bool"`
	Resources_string  map[string]string  `ch:"resources_string"`
	Events            []string           `ch:"events"`
	StatusMessage     string             `ch:"status_message"`
	StatusCodeString  string             `ch:"status_code_string"`
	SpanKind          string             `ch:"kind_string"`
	ParentSpanId      string             `ch:"parent_span_id"`
}

type TraceSummary struct {
	TraceID  string    `ch:"trace_id"`
	Start    time.Time `ch:"start"`
	End      time.Time `ch:"end"`
	NumSpans uint64    `ch:"num_spans"`
}
