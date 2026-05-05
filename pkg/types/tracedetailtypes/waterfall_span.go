package tracedetailtypes

import (
	"encoding/json"
	"fmt"
	"maps"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// ClickHouse database and table names for trace queries.
	TraceDB           = "signoz_traces"
	TraceTable        = "distributed_signoz_index_v3"
	TraceSummaryTable = "distributed_trace_summary"
)

// ErrTraceNotFound is returned when a trace ID has no matching spans in ClickHouse.
var ErrTraceNotFound = errors.NewNotFoundf(errors.CodeNotFound, "trace not found")

// PostableWaterfall is the request body for the v3 waterfall API.
type PostableWaterfall struct {
	SelectedSpanID   string            `json:"selectedSpanId"`
	UncollapsedSpans []string          `json:"uncollapsedSpans"`
	Limit            uint              `json:"limit"`
	Aggregations     []SpanAggregation `json:"aggregations"`
}

func (p *PostableWaterfall) Validate() error {
	if len(p.Aggregations) > maxAggregationItems {
		return ErrTooManyAggregationItems
	}
	for _, a := range p.Aggregations {
		if !a.Aggregation.isValid() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown aggregation type: %q", a.Aggregation)
		}
		fc := a.Field.FieldContext
		if fc != telemetrytypes.FieldContextResource && fc != telemetrytypes.FieldContextAttribute {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregation field context must be %q or %q, got %q",
				telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute, fc)
		}
	}
	return nil
}

// Event represents a span event.
type Event struct {
	Name         string         `json:"name,omitempty"`
	TimeUnixNano uint64         `json:"timeUnixNano,omitempty"`
	AttributeMap map[string]any `json:"attributeMap,omitempty"`
	IsError      bool           `json:"isError,omitempty"`
}

// WaterfallSpan represents the span in waterfall response,
// this uses snake_case keys for response as a special case since these
// keys can be directly used to query spans and client need to know the actual fields.
// This pattern should not be copied elsewhere.
type WaterfallSpan struct {
	Attributes   map[string]any    `json:"attributes"`
	DurationNano uint64            `json:"duration_nano"`
	Events       []Event           `json:"events"`
	Flags        uint32            `json:"flags"`
	HasError     bool              `json:"has_error"`
	IsRemote     string            `json:"is_remote"`
	Kind         int32             `json:"-"`
	KindString   string            `json:"kind_string"`
	Name         string            `json:"name"`
	ParentSpanID string            `json:"parent_span_id"`
	Resource     map[string]string `json:"resource"`
	SpanID       string            `json:"span_id"`
	TimeUnix     uint64            `json:"time_unix"`
	TraceID      string            `json:"trace_id"`
	TraceState   string            `json:"trace_state"`

	// Calculated fields https://signoz.io/docs/traces-management/guides/derived-fields-spans
	DBName             string `json:"db_name,omitempty"`
	DBOperation        string `json:"db_operation,omitempty"`
	ExternalHTTPMethod string `json:"external_http_method,omitempty"`
	ExternalHTTPURL    string `json:"external_http_url,omitempty"`
	HTTPHost           string `json:"http_host,omitempty"`
	HTTPMethod         string `json:"http_method,omitempty"`
	HTTPURL            string `json:"http_url,omitempty"`
	ResponseStatusCode string `json:"response_status_code,omitempty"`
	StatusCode         int16  `json:"status_code,omitempty"`
	StatusCodeString   string `json:"status_code_string,omitempty"`
	StatusMessage      string `json:"status_message,omitempty"`

	// Internal tree structure fields
	Children         []*WaterfallSpan `json:"-"`
	SubTreeNodeCount uint64           `json:"sub_tree_node_count"`
	HasChildren      bool             `json:"has_children"`
	Level            uint64           `json:"level"`

	// used only for service time calculation
	ServiceName string `json:"-"`
}

// StorableSpan is the ClickHouse scan struct for the v3 waterfall query.
type StorableSpan struct {
	StartTime          time.Time          `ch:"timestamp"`
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
	StatusCode         int16              `ch:"status_code"`
	DBName             string             `ch:"db_name"`
	DBOperation        string             `ch:"db_operation"`
	HTTPMethod         string             `ch:"http_method"`
	HTTPURL            string             `ch:"http_url"`
	HTTPHost           string             `ch:"http_host"`
	ExternalHTTPMethod string             `ch:"external_http_method"`
	ExternalHTTPURL    string             `ch:"external_http_url"`
	ResponseStatusCode string             `ch:"response_status_code"`
}

// NewMissingWaterfallSpan creates a synthetic placeholder span for a parent that has no recorded data.
func NewMissingWaterfallSpan(spanID, traceID string, timeUnixNano, durationNano uint64) *WaterfallSpan {
	return &WaterfallSpan{
		SpanID:       spanID,
		TraceID:      traceID,
		Name:         "Missing Span",
		TimeUnix:     timeUnixNano,
		DurationNano: durationNano,
		Events:       make([]Event, 0),
		Children:     make([]*WaterfallSpan, 0),
		Attributes:   make(map[string]any),
		Resource:     make(map[string]string),
	}
}

// SortChildren recursively sorts children of each span by TimeUnixNano then Name.
func (ws *WaterfallSpan) SortChildren() {
	sort.Slice(ws.Children, func(i, j int) bool {
		if ws.Children[i].TimeUnix == ws.Children[j].TimeUnix {
			return ws.Children[i].Name < ws.Children[j].Name
		}
		return ws.Children[i].TimeUnix < ws.Children[j].TimeUnix
	})
	for _, child := range ws.Children {
		child.SortChildren()
	}
}

// GetWithoutChildren creates a shallow copy and resets tree-structure fields.
// SubTreeNodeCount is preserved (must be pre-computed via computeSubTreeNodeCount).
func (ws *WaterfallSpan) GetWithoutChildren(level uint64) *WaterfallSpan {
	cp := *ws
	cp.Level = level
	cp.HasChildren = len(ws.Children) > 0
	cp.Children = make([]*WaterfallSpan, 0)
	return &cp
}

// GetSubtreeNodeCount recursively sets SubTreeNodeCount on every span in the subtree.
func (ws *WaterfallSpan) GetSubtreeNodeCount() uint64 {
	count := uint64(1)
	for _, child := range ws.Children {
		count += child.GetSubtreeNodeCount()
	}
	ws.SubTreeNodeCount = count
	return count
}

// FieldValue returns the string representation of field's value on this span for grouping.
// The bool reports whether the field was present with a non-empty value.
func (ws *WaterfallSpan) FieldValue(field telemetrytypes.TelemetryFieldKey) (string, bool) {
	switch field.FieldContext {
	case telemetrytypes.FieldContextResource:
		v, ok := ws.Resource[field.Name]
		return v, ok
	case telemetrytypes.FieldContextAttribute:
		v, ok := ws.Attributes[field.Name]
		if !ok {
			return "", false
		}
		return fmt.Sprintf("%v", v), true
	}
	return "", false
}

func (ws *WaterfallSpan) getPreOrderedSpans(uncollapsedSpanIDs map[string]struct{}, selectAll bool, level uint64) []*WaterfallSpan {
	result := []*WaterfallSpan{ws.GetWithoutChildren(level)}
	_, isUncollapsed := uncollapsedSpanIDs[ws.SpanID]
	if selectAll || isUncollapsed {
		for _, child := range ws.Children {
			result = append(result, child.getPreOrderedSpans(uncollapsedSpanIDs, selectAll, level+1)...)
		}
	}
	return result
}

// autoExpandDescendants marks spans within depth levels below span as uncollapsed.
func (ws *WaterfallSpan) autoExpandDescendants(remainingDepth int, uncollapsedMap map[string]struct{}) {
	if remainingDepth <= 0 || len(ws.Children) == 0 { // leaves have nothing to expand
		return
	}
	uncollapsedMap[ws.SpanID] = struct{}{}
	for _, child := range ws.Children {
		child.autoExpandDescendants(remainingDepth-1, uncollapsedMap)
	}
}

func (ws *WaterfallSpan) getPathToSelectedSpanID(selectedSpanID string) ([]string, bool) {
	path := []string{ws.SpanID}
	if ws.SpanID == selectedSpanID {
		return path, true
	}

	for _, child := range ws.Children {
		childPath, found := child.getPathToSelectedSpanID(selectedSpanID)
		if found {
			path = append(path, childPath...)
			return path, true
		}
	}
	return nil, false
}

func (item *StorableSpan) Attributes() map[string]any {
	attributes := make(map[string]any, len(item.AttributesString)+len(item.AttributesNumber)+len(item.AttributesBool))
	for k, v := range item.AttributesString {
		attributes[k] = v
	}
	for k, v := range item.AttributesNumber {
		attributes[k] = v
	}
	for k, v := range item.AttributesBool {
		attributes[k] = v
	}
	return attributes
}

func (item *StorableSpan) UnmarshalledEvents() []Event {
	events := make([]Event, 0, len(item.Events))
	for _, eventStr := range item.Events {
		var event Event
		if err := json.Unmarshal([]byte(eventStr), &event); err != nil {
			continue // skipping malformed events
		}
		events = append(events, event)
	}
	return events
}

func (item *StorableSpan) ToWaterfallSpan() *WaterfallSpan {
	resources := make(map[string]string)
	maps.Copy(resources, item.ResourcesString)

	return &WaterfallSpan{
		Attributes:         item.Attributes(),
		DBName:             item.DBName,
		DBOperation:        item.DBOperation,
		DurationNano:       item.DurationNano,
		Events:             item.UnmarshalledEvents(),
		ExternalHTTPMethod: item.ExternalHTTPMethod,
		ExternalHTTPURL:    item.ExternalHTTPURL,
		Flags:              item.Flags,
		HasError:           item.HasError,
		HTTPHost:           item.HTTPHost,
		HTTPMethod:         item.HTTPMethod,
		HTTPURL:            item.HTTPURL,
		IsRemote:           item.IsRemote,
		Kind:               int32(item.Kind),
		KindString:         item.SpanKind,
		Name:               item.Name,
		ParentSpanID:       item.ParentSpanID,
		Resource:           resources,
		ResponseStatusCode: item.ResponseStatusCode,
		SpanID:             item.SpanID,
		StatusCode:         item.StatusCode,
		StatusCodeString:   item.StatusCodeString,
		StatusMessage:      item.StatusMessage,
		TraceID:            item.TraceID,
		TraceState:         item.TraceState,
		Children:           make([]*WaterfallSpan, 0),
		TimeUnix:           uint64(item.StartTime.UnixNano()),
		ServiceName:        item.ServiceName,
	}
}

// getSpanIndex returns the index of matched span and -1 for no match.
func getSpanIndex(spans []*WaterfallSpan, targetSpanID string) int {
	for i, s := range spans {
		if s != nil && s.SpanID == targetSpanID {
			return i
		}
	}
	return -1
}
