package tracedetailtypes

import (
	"encoding/json"
	"maps"
	"time"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

// WaterfallRequest is the request body for the v3 waterfall API.
type WaterfallRequest struct {
	SelectedSpanID              string   `json:"selectedSpanId"`
	IsSelectedSpanIDUnCollapsed bool     `json:"isSelectedSpanIDUnCollapsed"`
	UncollapsedSpans            []string `json:"uncollapsedSpans"`
	Limit                       uint     `json:"limit"`
}

// WaterfallResponse is the response for the v3 waterfall API.
type WaterfallResponse struct {
	StartTimestampMillis          uint64            `json:"startTimestampMillis"`
	EndTimestampMillis            uint64            `json:"endTimestampMillis"`
	DurationNano                  uint64            `json:"durationNano"`
	RootServiceName               string            `json:"rootServiceName"`
	RootServiceEntryPoint         string            `json:"rootServiceEntryPoint"`
	TotalSpansCount               uint64            `json:"totalSpansCount"`
	TotalErrorSpansCount          uint64            `json:"totalErrorSpansCount"`
	ServiceNameToTotalDurationMap map[string]uint64 `json:"serviceNameToTotalDurationMap"`
	Spans                         []*Span           `json:"spans"`
	HasMissingSpans               bool              `json:"hasMissingSpans"`
	UncollapsedSpans              []string          `json:"uncollapsedSpans"`
}

// Event represents a span event.
type Event struct {
	Name         string                 `json:"name,omitempty"`
	TimeUnixNano uint64                 `json:"timeUnixNano,omitempty"`
	AttributeMap map[string]interface{} `json:"attributeMap,omitempty"`
	IsError      bool                   `json:"isError,omitempty"`
}

// Span is the v3 span format with separated attributes/resources and snake_case keys.
type Span struct {
	Attributes         map[string]string `json:"attributes"`
	DBName             string            `json:"db_name"`
	DBOperation        string            `json:"db_operation"`
	DurationNano       uint64            `json:"duration_nano"`
	Events             []Event           `json:"events"`
	ExternalHTTPMethod string            `json:"external_http_method"`
	ExternalHTTPURL    string            `json:"external_http_url"`
	Flags              uint32            `json:"flags"`
	HasError           bool              `json:"has_error"`
	HTTPHost           string            `json:"http_host"`
	HTTPMethod         string            `json:"http_method"`
	HTTPURL            string            `json:"http_url"`
	IsRemote           string            `json:"is_remote"`
	Kind               int32             `json:"kind"`
	KindString         string            `json:"kind_string"`
	Links              string            `json:"links"`
	Name               string            `json:"name"`
	ParentSpanID       string            `json:"parent_span_id"`
	Resources          map[string]string `json:"resources"`
	ResponseStatusCode string            `json:"response_status_code"`
	SpanID             string            `json:"span_id"`
	StatusCode         int32             `json:"status_code"`
	StatusCodeString   string            `json:"status_code_string"`
	StatusMessage      string            `json:"status_message"`
	Timestamp          string            `json:"timestamp"`
	TraceID            string            `json:"trace_id"`
	TraceState         string            `json:"trace_state"`
	// Tree structure fields
	Children         []*Span `json:"children"`
	SubTreeNodeCount uint64  `json:"sub_tree_node_count"`
	HasChildren      bool    `json:"has_children"`
	HasSiblings      bool    `json:"has_siblings"`
	Level            uint64  `json:"level"`

	// timeUnixNano is an internal field used for tree building and sorting.
	// It is not serialized in the JSON response.
	TimeUnixNano uint64 `json:"-"`
	// serviceName is an internal field used for service time calculation.
	ServiceName string `json:"-"`
}

// CopyWithoutChildren creates a shallow copy and reset computed tree fields
func (s *Span) CopyWithoutChildren(level uint64, hasSiblings bool) *Span {
	cp := *s
	cp.Level = level
	cp.HasChildren = len(s.Children) > 0
	cp.HasSiblings = hasSiblings
	cp.Children = make([]*Span, 0)
	cp.SubTreeNodeCount = 0
	return &cp
}

// SpanItem is the ClickHouse scan struct for the v3 waterfall query.
type SpanItem struct {
	TimeUnixNano       time.Time          `ch:"timestamp"`
	DurationNano       uint64             `ch:"duration_nano"`
	SpanID             string             `ch:"span_id"`
	TraceID            string             `ch:"trace_id"`
	HasError           bool               `ch:"has_error"`
	Kind               int8               `ch:"kind"`
	ServiceName        string             `ch:"resource_string_service$$name"`
	Name               string             `ch:"name"`
	References         string             `ch:"references"`
	AttributesString   map[string]string  `ch:"attributes_string"`
	AttributesNumber   map[string]float64 `ch:"attributes_number"`
	AttributesBool     map[string]bool    `ch:"attributes_bool"`
	ResourcesString    map[string]string  `ch:"resources_string"`
	Events             []string           `ch:"events"`
	StatusMessage      string             `ch:"status_message"`
	StatusCodeString   string             `ch:"status_code_string"`
	SpanKind           string             `ch:"kind_string"`
	ParentSpanID       string             `ch:"parent_span_id"`
	Flags              uint32             `ch:"flags"`
	IsRemote           string             `ch:"is_remote"`
	TraceState         string             `ch:"trace_state"`
	StatusCode         int32              `ch:"status_code"`
	DBName             string             `ch:"db_name"`
	DBOperation        string             `ch:"db_operation"`
	HTTPMethod         string             `ch:"http_method"`
	HTTPURL            string             `ch:"http_url"`
	HTTPHost           string             `ch:"http_host"`
	ExternalHTTPMethod string             `ch:"external_http_method"`
	ExternalHTTPURL    string             `ch:"external_http_url"`
	ResponseStatusCode string             `ch:"response_status_code"`
}

// TraceSummary is the ClickHouse scan struct for the trace_summary query.
type TraceSummary struct {
	TraceID  string    `ch:"trace_id"`
	Start    time.Time `ch:"start"`
	End      time.Time `ch:"end"`
	NumSpans uint64    `ch:"num_spans"`
}

// OtelSpanRef is used for parsing the references/links JSON from ClickHouse.
type OtelSpanRef struct {
	TraceId string `json:"traceId,omitempty"`
	SpanId  string `json:"spanId,omitempty"`
	RefType string `json:"refType,omitempty"`
}

// WaterfallCache holds pre-processed trace data for caching.
type WaterfallCache struct {
	StartTime                     uint64            `json:"startTime"`
	EndTime                       uint64            `json:"endTime"`
	DurationNano                  uint64            `json:"durationNano"`
	TotalSpans                    uint64            `json:"totalSpans"`
	TotalErrorSpans               uint64            `json:"totalErrorSpans"`
	ServiceNameToTotalDurationMap map[string]uint64 `json:"serviceNameToTotalDurationMap"`
	SpanIDToSpanNodeMap           map[string]*Span  `json:"spanIdToSpanNodeMap"`
	TraceRoots                    []*Span           `json:"traceRoots"`
	HasMissingSpans               bool              `json:"hasMissingSpans"`
}

func (c *WaterfallCache) Clone() cachetypes.Cacheable {
	copyOfServiceNameToTotalDurationMap := make(map[string]uint64)
	maps.Copy(copyOfServiceNameToTotalDurationMap, c.ServiceNameToTotalDurationMap)

	copyOfSpanIDToSpanNodeMap := make(map[string]*Span)
	maps.Copy(copyOfSpanIDToSpanNodeMap, c.SpanIDToSpanNodeMap)

	copyOfTraceRoots := make([]*Span, len(c.TraceRoots))
	copy(copyOfTraceRoots, c.TraceRoots)
	return &WaterfallCache{
		StartTime:                     c.StartTime,
		EndTime:                       c.EndTime,
		DurationNano:                  c.DurationNano,
		TotalSpans:                    c.TotalSpans,
		TotalErrorSpans:               c.TotalErrorSpans,
		ServiceNameToTotalDurationMap: copyOfServiceNameToTotalDurationMap,
		SpanIDToSpanNodeMap:           copyOfSpanIDToSpanNodeMap,
		TraceRoots:                    copyOfTraceRoots,
		HasMissingSpans:               c.HasMissingSpans,
	}
}

func (c *WaterfallCache) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}

func (c *WaterfallCache) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}
