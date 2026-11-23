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
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

type ListTraceSpansParams struct {
	View         SpanListView `query:"view" description:"Which spans are returned and in what order; all when not given. all: every span in tree order, a span followed by the spans below it. errors: the error spans with no error span among their children, in start order. unmarked_failures: the spans without the error flag that have a 4xx response, a gRPC status other than OK or an exception event, in start order. slowest: the longest span of each group of same-name spans under one parent, by the group's own time. expensive: the gen_ai spans by cost, or by tokens when no span has a cost; each carries its gen_ai token and cost attributes. links: the spans that link to other spans, in start order. A view is formed over the whole trace; search and parentSpanId only filter it."`
	Search       string       `query:"search" description:"Keeps only the spans that match: words, a filter expression, or both, such as worldpay AND has_error = true. Words match the span name, status message, attributes, resource attributes and events, ignoring case."`
	ParentSpanID string       `query:"parentSpanId" description:"Keeps only the direct children of this span."`
	SelectFields []string     `query:"selectFields" description:"Names of the attributes and resource attributes to fill on each span, such as http.route or resource.k8s.pod.name. service.name is always filled."`
	Offset       int          `query:"offset" description:"The number of spans to skip; 0 when not given."`
	Limit        int          `query:"limit" description:"Page size, at most 1000; 50 when not given."`
}

// Span is a stored span. Attributes, Resource and Events hold everything when one span is read, and
// only the selected fields in a list.
type Span struct {
	SpanID             string            `json:"spanId" required:"true"`
	TraceID            string            `json:"traceId" required:"true"`
	ParentSpanID       string            `json:"parentSpanId" required:"true"`
	Name               string            `json:"name" required:"true"`
	KindString         string            `json:"kindString" required:"true"`
	TimeUnixMilli      uint64            `json:"timeUnixMilli" required:"true" description:"The start time, in milliseconds since the Unix epoch."`
	DurationNano       uint64            `json:"durationNano" required:"true"`
	HasError           bool              `json:"hasError" required:"true"`
	StatusCodeString   string            `json:"statusCodeString" required:"true"`
	StatusMessage      string            `json:"statusMessage" required:"true"`
	ResponseStatusCode string            `json:"responseStatusCode" required:"true" description:"The HTTP or gRPC status code of the response; empty when the span has none."`
	Resource           map[string]string `json:"resource" required:"true" nullable:"false"`
	Attributes         map[string]any    `json:"attributes" required:"true" nullable:"false"`
	Events             []Event           `json:"events" required:"true" nullable:"false"`
	References         []OtelSpanRef     `json:"references" required:"true" nullable:"false" description:"The parent as a CHILD_OF reference and each span link as a FOLLOWS_FROM one."`
}

type SameNameSiblingStats struct {
	SpanCount      uint64 `json:"spanCount" required:"true"`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"The own time of the group's spans, added up."`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true"`
}

// SpanTreeStats holds what the shape of the trace says about one span. It is computed, never stored.
type SpanTreeStats struct {
	Level              uint32                `json:"level" required:"true" description:"The depth in the trace; 0 for a root."`
	ChildCount         uint32                `json:"childCount" required:"true"`
	SubtreeSpanCount   uint32                `json:"subtreeSpanCount" required:"true" description:"The number of spans below this one, at any depth."`
	OwnTimeNano        uint64                `json:"ownTimeNano" required:"true" description:"The duration minus the time the span's children cover."`
	ErrorAncestorCount uint32                `json:"errorAncestorCount" required:"true" description:"The number of ancestors in a row, from the parent up, that carry the error flag."`
	SameNameSiblings   *SameNameSiblingStats `json:"sameNameSiblings,omitempty" description:"The spans with this span's name under the same parent, this span included; omitted when it is the only one."`
}

type SpanTextMatch struct {
	Field   string `json:"field" required:"true"`
	Snippet string `json:"snippet" required:"true"`
}

type SpanListItem struct {
	Span                  Span                  `json:"span" required:"true"`
	TreeStats             SpanTreeStats         `json:"treeStats" required:"true"`
	UnmarkedFailureReason UnmarkedFailureReason `json:"unmarkedFailureReason,omitempty" description:"Present for a span that failed without the error flag."`
	Parent                *Span                 `json:"parent,omitempty" description:"The direct parent; omitted for a root, when the parent span is missing, and when the request gives parentSpanId."`
	Matches               []SpanTextMatch       `json:"matches,omitempty" nullable:"false" description:"Where the searched words were found; omitted when the search has no words."`
}

type SpanList struct {
	Total    uint64         `json:"total" required:"true" description:"The number of spans the request matches, over all pages."`
	Items    []SpanListItem `json:"items" required:"true" nullable:"false"`
	Warnings []string       `json:"warnings,omitempty" nullable:"false" description:"Why the request may have returned less than expected, such as a search key that is not known or a selected field that no returned span has."`
}

type SpanDetail struct {
	Span                  Span                  `json:"span" required:"true" description:"The span with every attribute, resource attribute and event."`
	TreeStats             SpanTreeStats         `json:"treeStats" required:"true"`
	UnmarkedFailureReason UnmarkedFailureReason `json:"unmarkedFailureReason,omitempty" description:"Present for a span that failed without the error flag."`
	Ancestors             []Span                `json:"ancestors" required:"true" nullable:"false" description:"Every span above this one, the parent first and a root last; empty for a root and when the parent span is missing. Each holds service.name as its only resource attribute, and no attributes or events."`
}
