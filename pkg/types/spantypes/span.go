package spantypes

const (
	SpanListViewErrorOrigins     SpanListView = "error_origins"
	SpanListViewUnmarkedFailures SpanListView = "unmarked_failures"
	SpanListViewTimeSpent        SpanListView = "time_spent"
	SpanListViewAIUsage          SpanListView = "ai_usage"
	SpanListViewLinks            SpanListView = "links"
)

const (
	UnmarkedFailureHTTP4xx        UnmarkedFailureKind = "http_4xx"
	UnmarkedFailureHTTP5xx        UnmarkedFailureKind = "http_5xx"
	UnmarkedFailureGRPCStatus     UnmarkedFailureKind = "grpc_status"
	UnmarkedFailureExceptionEvent UnmarkedFailureKind = "exception_event"
)

// SpanListView keeps the spans of one kind out of the spans a route covers, in that kind's order.
// It is a plain string so that a list of views binds from a repeated query parameter.
type SpanListView string

func (SpanListView) Enum() []any {
	return []any{SpanListViewErrorOrigins, SpanListViewUnmarkedFailures, SpanListViewTimeSpent, SpanListViewAIUsage, SpanListViewLinks}
}

// UnmarkedFailureKind says why a span without the error flag is in the unmarked_failures list. It is
// a plain string so that omitempty leaves it out: the response encoder does not omit a zero struct.
type UnmarkedFailureKind string

func (UnmarkedFailureKind) Enum() []any {
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureHTTP5xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

// ListTraceSpansParams is shared by every route that returns a list of spans: the route decides
// which spans it covers, and these narrow and page them.
type ListTraceSpansParams struct {
	View         SpanListView `query:"view" description:"A quick filter on the spans the route covers. Without it every span the route covers is returned, in the route's own order. With it only the spans of that kind are returned, in that kind's order. Whether a span is of a kind is decided on the whole trace, not only on the spans that matched query. error_origins: the spans where an error started, meaning error spans with no failing child, by start time. unmarked_failures: spans that are not marked as errors but report a 4xx or 5xx response, a gRPC status other than OK, or an exception event, by start time. time_spent: one span for each group of same-name siblings, by the group's total own time. ai_usage: the spans that carry gen_ai token or cost usage, by cost, or by tokens when none has a cost; each includes those attributes. links: the spans that link to other spans, by start time."`
	Query        string       `query:"query" description:"Returns only the spans that match. Takes words, a filter expression, or both, for example: worldpay AND has_error = true. Words are matched, ignoring case, against the span name, status message, attributes, resource attributes and events. A filter expression uses the keys of a span, such as kind_string or has_error. When view is also given, query is applied first, and the view then keeps the spans of its kind among the ones that matched."`
	SelectFields []string     `query:"selectFields" description:"Attributes and resource attributes to include on each span, for example http.route or resource.k8s.pod.name. Without it a span includes only service.name. A field that no returned span has is listed in warnings."`
	Offset       int          `query:"offset" description:"Number of spans to skip. Default: 0."`
	Limit        int          `query:"limit" description:"Number of spans to return. Default: 50. Maximum: 1000."`
}

// Span is a stored span. Apart from time_unix, its keys are the stored field names, so each is also
// a key a query filter accepts. Attributes, Resource and Events hold everything when one span is
// read, and only the selected fields in a list.
type Span struct {
	SpanID             string            `json:"span_id" required:"true"`
	TraceID            string            `json:"trace_id" required:"true"`
	ParentSpanID       string            `json:"parent_span_id" required:"true" description:"ID of the parent span. Empty for a root."`
	Name               string            `json:"name" required:"true"`
	KindString         string            `json:"kind_string" required:"true" description:"Span kind, for example Server, Client or Internal."`
	TimeUnix           uint64            `json:"time_unix" required:"true" description:"Start time, in milliseconds since the Unix epoch."`
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
	Field   string `json:"field" required:"true" description:"Where the word was found: name, status_message, an attribute as attributes.<name> (for example attributes.http.route), a resource attribute as resource.<name> (for example resource.service.name), or an event by its position as events[<index>] (for example events[0])."`
	Snippet string `json:"snippet" required:"true" description:"The text around the word, about 40 characters on each side, for example: Worldpay declined the card."`
}

// SpanItem is an item of every span list: a span, with what the trace says about it.
type SpanItem struct {
	Span                Span                `json:"span" required:"true"`
	TreeStats           SpanTreeStats       `json:"treeStats" required:"true" description:"Numbers computed from the span's place in the trace."`
	UnmarkedFailureKind UnmarkedFailureKind `json:"unmarkedFailureKind,omitempty" description:"Why the span is in the unmarked_failures list: a 4xx or 5xx response (http_4xx, http_5xx), a gRPC status other than OK (grpc_status), or an exception event (exception_event). Omitted for every other span."`
	Matches             []SpanTextMatch     `json:"matches,omitempty" nullable:"false" description:"Where the words of the query were found, up to three places. A list does not return all attributes or any events, so this is how to see why a span matched. Omitted when the query has no words."`
}

type SpanList struct {
	Total    uint64     `json:"total" required:"true" description:"Number of spans that match the request, across all pages."`
	Items    []SpanItem `json:"items" required:"true" nullable:"false" description:"The spans of this page."`
	Warnings []string   `json:"warnings,omitempty" nullable:"false" description:"Reasons the result may be incomplete, for example a query key that is not known or a selected field that no returned span has. Omitted when there are none."`
}
