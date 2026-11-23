package spantypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	SpanListViewAll              = SpanListView{valuer.NewString("all")}
	SpanListViewErrors           = SpanListView{valuer.NewString("errors")}
	SpanListViewUnmarkedFailures = SpanListView{valuer.NewString("unmarked_failures")}
	SpanListViewSlowest          = SpanListView{valuer.NewString("slowest")}
	SpanListViewExpensive        = SpanListView{valuer.NewString("expensive")}
	SpanListViewLinks            = SpanListView{valuer.NewString("links")}
)

const (
	UnmarkedFailureHTTP4xx        UnmarkedFailureReason = "http_4xx"
	UnmarkedFailureHTTP5xx        UnmarkedFailureReason = "http_5xx"
	UnmarkedFailureGRPCStatus     UnmarkedFailureReason = "grpc_status"
	UnmarkedFailureExceptionEvent UnmarkedFailureReason = "exception_event"
)

// SpanListView picks which spans of a trace are listed, and in what order.
type SpanListView struct{ valuer.String }

func (SpanListView) Enum() []any {
	return []any{SpanListViewAll, SpanListViewErrors, SpanListViewUnmarkedFailures, SpanListViewSlowest, SpanListViewExpensive, SpanListViewLinks}
}

// UnmarkedFailureReason says why a span without the error flag counts as a failure. It is a plain
// string so that omitempty leaves it out: the response encoder does not omit a zero struct.
type UnmarkedFailureReason string

func (UnmarkedFailureReason) Enum() []any {
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureHTTP5xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

type ListTraceSpansParams struct {
	View         SpanListView `query:"view" description:"Which spans to return, and in what order. Default: all. all: every span in tree order, a span followed by the spans below it. errors: the spans where an error started, meaning error spans with no failing child, by start time. unmarked_failures: spans that failed without being marked as errors (a 4xx or 5xx response, a gRPC status other than OK, or an exception event), by start time. slowest: one span for each group of same-name siblings, by the group's total own time. expensive: the spans that carry gen_ai token or cost usage, by cost, or by tokens when none has a cost; each includes those attributes. links: the spans that link to other spans, by start time. The view is picked from the whole trace first; search and parentSpanId then filter it."`
	Search       string       `query:"search" description:"Returns only the spans that match. Takes words, a filter expression, or both, for example: worldpay AND has_error = true. Words are matched, ignoring case, against the span name, status message, attributes, resource attributes and events."`
	ParentSpanID string       `query:"parentSpanId" description:"Returns only the direct children of this span."`
	SelectFields []string     `query:"selectFields" description:"Attributes and resource attributes to include on each span, for example http.route or resource.k8s.pod.name. Without it a span includes only service.name. A field that no returned span has is listed in warnings."`
	Offset       int          `query:"offset" description:"Number of spans to skip. Default: 0."`
	Limit        int          `query:"limit" description:"Number of spans to return. Default: 50. Maximum: 1000."`
}

// Span is a stored span. Attributes, Resource and Events hold everything when one span is read, and
// only the selected fields in a list.
type Span struct {
	SpanID             string            `json:"spanId" required:"true"`
	TraceID            string            `json:"traceId" required:"true"`
	ParentSpanID       string            `json:"parentSpanId" required:"true" description:"ID of the parent span. Empty for a root."`
	Name               string            `json:"name" required:"true"`
	KindString         string            `json:"kindString" required:"true" description:"Span kind, for example Server, Client or Internal."`
	TimeUnixMilli      uint64            `json:"timeUnixMilli" required:"true" description:"Start time, in milliseconds since the Unix epoch."`
	DurationNano       uint64            `json:"durationNano" required:"true" description:"Duration, in nanoseconds."`
	HasError           bool              `json:"hasError" required:"true" description:"Whether the span is marked as an error."`
	StatusCodeString   string            `json:"statusCodeString" required:"true" description:"OpenTelemetry status code of the span."`
	StatusMessage      string            `json:"statusMessage" required:"true" description:"Status message, usually the error text. Empty when the span has none."`
	ResponseStatusCode string            `json:"responseStatusCode" required:"true" description:"HTTP or gRPC status code of the response, for example 404. Empty when the span has none."`
	Resource           map[string]string `json:"resource" required:"true" nullable:"false" description:"Resource attributes. Always includes service.name. A span read by ID has all of them; a span in a list also has the selected ones."`
	Attributes         map[string]any    `json:"attributes" required:"true" nullable:"false" description:"Span attributes. A span read by ID has all of them; a span in a list has only the selected ones; an ancestor has none."`
	Events             []Event           `json:"events" required:"true" nullable:"false" description:"Span events. A span read by ID has all of them; a span in a list and an ancestor have none."`
	References         []OtelSpanRef     `json:"references" required:"true" nullable:"false" description:"References to other spans: the parent as CHILD_OF, and each span link as FOLLOWS_FROM."`
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
	Field   string `json:"field" required:"true" description:"Where the word was found: name, statusMessage, attributes.<name>, resource.<name> or events[<index>]."`
	Snippet string `json:"snippet" required:"true" description:"The word with some of the text around it."`
}

type SpanListItem struct {
	Span                  Span                  `json:"span" required:"true"`
	TreeStats             SpanTreeStats         `json:"treeStats" required:"true" description:"Numbers computed from the span's place in the trace."`
	UnmarkedFailureReason UnmarkedFailureReason `json:"unmarkedFailureReason,omitempty" description:"Why the span counts as failed although it is not marked as an error. Omitted for every other span."`
	Matches               []SpanTextMatch       `json:"matches,omitempty" nullable:"false" description:"Where the search words were found, up to three places. A list does not return all attributes or any events, so this is how to see why a span matched. Omitted when the search has no words."`
}

type SpanList struct {
	Total    uint64         `json:"total" required:"true" description:"Number of spans that match the request, across all pages."`
	Items    []SpanListItem `json:"items" required:"true" nullable:"false" description:"The spans of this page."`
	Warnings []string       `json:"warnings,omitempty" nullable:"false" description:"Reasons the result may be incomplete, for example a search key that is not known or a selected field that no returned span has. Omitted when there are none."`
}

type SpanDetail struct {
	Span                  Span                  `json:"span" required:"true" description:"The span with all its attributes, resource attributes and events."`
	TreeStats             SpanTreeStats         `json:"treeStats" required:"true" description:"Numbers computed from the span's place in the trace."`
	UnmarkedFailureReason UnmarkedFailureReason `json:"unmarkedFailureReason,omitempty" description:"Why the span counts as failed although it is not marked as an error. Omitted for every other span."`
	Ancestors             []Span                `json:"ancestors" required:"true" nullable:"false" description:"The spans above this one, the parent first and the root last. Empty for a root and for a span whose parent is missing. Each includes service.name, no other attributes, and no events."`
}
