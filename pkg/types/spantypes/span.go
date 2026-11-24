package spantypes

import (
	"maps"

	"github.com/SigNoz/signoz/pkg/errors"
)

const (
	SpanListViewErrorOrigins     SpanListView = "error_origins"
	SpanListViewUnmarkedFailures SpanListView = "unmarked_failures"
	SpanListViewTimeSpent        SpanListView = "time_spent"
	SpanListViewAIUsage          SpanListView = "ai_usage"
	SpanListViewLinks            SpanListView = "links"
)

const (
	UnmarkedFailureHTTP4xx        UnmarkedFailureReason = "http_4xx"
	UnmarkedFailureHTTP5xx        UnmarkedFailureReason = "http_5xx"
	UnmarkedFailureGRPCStatus     UnmarkedFailureReason = "grpc_status"
	UnmarkedFailureExceptionEvent UnmarkedFailureReason = "exception_event"
)

var ErrCodeTraceSpanNotFound = errors.MustNewCode("trace_span_not_found")

// SpanListView keeps the spans of one kind out of the spans a route covers, in that kind's order.
// It is a plain string so that a list of views binds from a repeated query parameter.
type SpanListView string

func (SpanListView) Enum() []any {
	return []any{SpanListViewErrorOrigins, SpanListViewUnmarkedFailures, SpanListViewTimeSpent, SpanListViewAIUsage, SpanListViewLinks}
}

// UnmarkedFailureReason says why a span without the error flag counts as a failure. It is a plain
// string so that omitempty leaves it out: the response encoder does not omit a zero struct.
type UnmarkedFailureReason string

func (UnmarkedFailureReason) Enum() []any {
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureHTTP5xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

// ListTraceSpansParams is shared by every route that returns a list of spans: the route decides
// which spans it covers, and these narrow and page them.
type ListTraceSpansParams struct {
	View         SpanListView `query:"view" description:"A quick filter on the spans the route covers. Without it every span the route covers is returned, in the route's own order. With it only the spans of that kind are returned, in that kind's order. error_origins: the spans where an error started, meaning error spans with no failing child, by start time. unmarked_failures: spans that failed without being marked as errors (a 4xx or 5xx response, a gRPC status other than OK, or an exception event), by start time. time_spent: one span for each group of same-name siblings, by the group's total own time. ai_usage: the spans that carry gen_ai token or cost usage, by cost, or by tokens when none has a cost; each includes those attributes. links: the spans that link to other spans, by start time."`
	Query        string       `query:"query" description:"Returns only the spans that match. Takes words, a filter expression, or both, for example: worldpay AND has_error = true. Words are matched, ignoring case, against the span name, status message, attributes, resource attributes and events. A filter expression uses the keys of a span, such as kind_string or has_error."`
	SelectFields []string     `query:"selectFields" description:"Attributes and resource attributes to include on each span, for example http.route or resource.k8s.pod.name. Without it a span includes only service.name. A field that no returned span has is listed in warnings."`
	Offset       int          `query:"offset" description:"Number of spans to skip. Default: 0."`
	Limit        int          `query:"limit" description:"Number of spans to return. Default: 50. Maximum: 1000."`
}

// Span is a stored span. Its keys are the stored field names, so each is also a key a query filter
// accepts. Attributes, Resource and Events hold everything when one span is read, and only the
// selected fields in a list.
type Span struct {
	SpanID             string            `json:"span_id" required:"true"`
	TraceID            string            `json:"trace_id" required:"true"`
	ParentSpanID       string            `json:"parent_span_id" required:"true" description:"ID of the parent span. Empty for a root."`
	Name               string            `json:"name" required:"true"`
	KindString         string            `json:"kind_string" required:"true" description:"Span kind, for example Server, Client or Internal."`
	Timestamp          uint64            `json:"timestamp" required:"true" description:"Start time, in nanoseconds since the Unix epoch."`
	DurationNano       uint64            `json:"duration_nano" required:"true" description:"Duration, in nanoseconds."`
	HasError           bool              `json:"has_error" required:"true" description:"Whether the span is marked as an error."`
	StatusCodeString   string            `json:"status_code_string" required:"true" description:"OpenTelemetry status code of the span."`
	StatusMessage      string            `json:"status_message" required:"true" description:"Status message, usually the error text. Empty when the span has none."`
	ResponseStatusCode string            `json:"response_status_code" required:"true" description:"HTTP or gRPC status code of the response, for example 404. Empty when the span has none."`
	Resource           map[string]string `json:"resource" required:"true" nullable:"false" description:"Resource attributes. Always includes service.name. A span read by ID has all of them; a span in a list also has the selected ones."`
	Attributes         map[string]any    `json:"attributes" required:"true" nullable:"false" description:"Span attributes. A span read by ID has all of them; a span in a list has only the selected ones."`
	Events             []Event           `json:"events" required:"true" nullable:"false" description:"Span events. A span read by ID has all of them; a span in a list has none."`
	References         []OtelSpanRef     `json:"references" required:"true" nullable:"false" description:"References to other spans: the parent as CHILD_OF, and each span link as FOLLOWS_FROM."`
}

// NewSpan returns the span with everything row stores on it: all attributes, resource attributes
// and events.
func NewSpan(traceID string, row *StorableSpan) *Span {
	span := &Span{
		SpanID:             row.SpanID,
		TraceID:            traceID,
		ParentSpanID:       row.ParentSpanID,
		Name:               row.Name,
		KindString:         row.SpanKind,
		Timestamp:          uint64(row.StartTime.UnixNano()),
		DurationNano:       row.DurationNano,
		HasError:           row.HasError,
		StatusCodeString:   row.StatusCodeString,
		StatusMessage:      row.StatusMessage,
		ResponseStatusCode: row.ResponseStatusCode,
		Resource:           map[string]string{"service.name": row.ServiceName},
		Attributes:         row.Attributes(),
		Events:             row.UnmarshalledEvents(),
		References:         row.UnmarshalledRefs(),
	}
	maps.Copy(span.Resource, row.ResourcesString)
	return span
}

type SameNameSiblingStats struct {
	SpanCount      uint64 `json:"spanCount" required:"true" description:"Number of spans in the group, this span included."`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"Total own time of the group, in nanoseconds."`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true" description:"Number of spans in the group that are marked as errors."`
}

// SpanTreeStats holds what the shape of the trace says about one span. It is computed, never stored.
type SpanTreeStats struct {
	Level              uint32                `json:"level" required:"true" description:"Depth in the trace: 0 for a root, 1 for its children, and so on."`
	ChildCount         uint32                `json:"childCount" required:"true" description:"Number of direct children."`
	SubtreeSpanCount   uint32                `json:"subtreeSpanCount" required:"true" description:"Number of spans below this one, at any depth."`
	OwnTimeNano        uint64                `json:"ownTimeNano" required:"true" description:"Time spent in the span itself, in nanoseconds: its duration minus the time its children cover."`
	ErrorAncestorCount uint32                `json:"errorAncestorCount" required:"true" description:"Number of ancestors in a row, starting at the parent, that are marked as errors. On an error span it shows how far up the error spread."`
	SameNameSiblings   *SameNameSiblingStats `json:"sameNameSiblings,omitempty" description:"Totals for the spans that share this span's name and parent, this span included. Omitted when no other span does."`
}

type SpanTextMatch struct {
	Field   string `json:"field" required:"true" description:"Where the word was found: name, status_message, attributes.<name>, resource.<name> or events[<index>]."`
	Snippet string `json:"snippet" required:"true" description:"The word with some of the text around it."`
}

// SpanItem is an item of every span list: a span, with what the trace says about it.
type SpanItem struct {
	Span                  Span                  `json:"span" required:"true"`
	TreeStats             SpanTreeStats         `json:"treeStats" required:"true" description:"Numbers computed from the span's place in the trace."`
	UnmarkedFailureReason UnmarkedFailureReason `json:"unmarkedFailureReason,omitempty" description:"Why the span counts as failed although it is not marked as an error. Omitted for every other span."`
	Matches               []SpanTextMatch       `json:"matches,omitempty" nullable:"false" description:"Where the words of the query were found, up to three places. A list does not return all attributes or any events, so this is how to see why a span matched. Omitted when the query has no words."`
}

type SpanList struct {
	Total    uint64     `json:"total" required:"true" description:"Number of spans that match the request, across all pages."`
	Items    []SpanItem `json:"items" required:"true" nullable:"false" description:"The spans of this page."`
	Warnings []string   `json:"warnings,omitempty" nullable:"false" description:"Reasons the result may be incomplete, for example a query key that is not known or a selected field that no returned span has. Omitted when there are none."`
}
