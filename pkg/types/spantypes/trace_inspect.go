package spantypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	UnmarkedFailureHTTP4xx        = UnmarkedFailureReason{valuer.NewString("http_4xx")}
	UnmarkedFailureGRPCStatus     = UnmarkedFailureReason{valuer.NewString("grpc_status")}
	UnmarkedFailureExceptionEvent = UnmarkedFailureReason{valuer.NewString("exception_event")}
)

// UnmarkedFailureReason says why a span without the error flag is listed as a failure.
type UnmarkedFailureReason struct{ valuer.String }

func (UnmarkedFailureReason) Enum() []any {
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

type InspectTraceParams struct {
	Cursor string `query:"cursor" description:"The nextCursor of one list of the overview; returns the next page of that list and nothing else."`
}

type InspectTraceSpanParams struct {
	Depth        int      `query:"depth" description:"The number of levels of ancestors and of descendants returned, 1 to 10; 2 when not given. The root span is always returned."`
	SelectFields []string `query:"selectFields" description:"Attribute names returned without the 500 character cut; the record then holds only these attributes."`
}

type InspectTraceSpansParams struct {
	Search string `query:"search" description:"Returns the spans that match, earliest first: words, a filter expression, or both, such as worldpay AND has_error = true. Words match the span name, status message, attributes, resource attributes and events, ignoring case. Without it every span is returned, in tree order."`
	Under  string `query:"under" description:"A span ID; returns that span and every span below it. Cannot be combined with search."`
	Limit  int    `query:"limit" description:"Page size, at most 1000; when not given, 20 with search and 400 without. A page holds fewer spans when it would pass the response size limit."`
	Cursor string `query:"cursor" description:"The nextCursor of an earlier response to the same request; returns the next page."`
}

// SpanSummary is the short form of a span: enough to place it in the trace and decide whether to open it.
type SpanSummary struct {
	SpanID       string `json:"spanId" required:"true"`
	ParentSpanID string `json:"parentSpanId,omitempty"`
	Name         string `json:"name" required:"true"`
	ServiceName  string `json:"serviceName" required:"true"`
	Kind         string `json:"kind" required:"true"`
	// StartOffsetNano is the time from the start of the trace to the start of the span.
	StartOffsetNano uint64 `json:"startOffsetNano" required:"true"`
	DurationNano    uint64 `json:"durationNano" required:"true"`
	// OwnTimeNano is the duration minus the time the span's children cover.
	OwnTimeNano        uint64 `json:"ownTimeNano" required:"true"`
	ResponseStatusCode string `json:"responseStatusCode,omitempty"`
	HasError           bool   `json:"hasError" required:"true"`
	Level              uint32 `json:"level" required:"true"`
	ChildCount         uint32 `json:"childCount" required:"true"`
	// SubtreeSpanCount is the number of spans below this one.
	SubtreeSpanCount uint32 `json:"subtreeSpanCount" required:"true"`
}

type TraceServiceStats struct {
	ServiceName    string `json:"serviceName" required:"true"`
	SpanCount      uint64 `json:"spanCount" required:"true"`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true"`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true"`
}

type TraceAIIdentity struct {
	ModelCallCount uint64        `json:"modelCallCount" required:"true"`
	ToolCallCount  uint64        `json:"toolCallCount" required:"true"`
	Tokens         TraceAITokens `json:"tokens" required:"true"`
	// TotalCost is omitted when no span carries a cost attribute.
	TotalCost *float64 `json:"totalCost,omitempty" nullable:"false"`
}

type TraceIdentity struct {
	TraceID              string `json:"traceId" required:"true"`
	StartTimestampMillis uint64 `json:"startTimestampMillis" required:"true"`
	DurationNano         uint64 `json:"durationNano" required:"true"`
	// Root is the earliest span without a parent; omitted when every span's parent is missing.
	Root            *SpanSummary        `json:"root,omitempty"`
	SpanCount       uint64              `json:"spanCount" required:"true"`
	ErrorSpanCount  uint64              `json:"errorSpanCount" required:"true"`
	RootCount       uint64              `json:"rootCount" required:"true"`
	HasMissingSpans bool                `json:"hasMissingSpans" required:"true"`
	ServiceCount    uint64              `json:"serviceCount" required:"true"`
	Services        []TraceServiceStats `json:"services" required:"true" nullable:"false"`
	AI              *TraceAIIdentity    `json:"ai,omitempty"`
}

// Every list has a total, items and a nextCursor when more items follow. Every item starts with
// its span and that span's direct parent, omitted for a root or when the parent span is missing.
type TraceErrorItem struct {
	Span          SpanSummary  `json:"span" required:"true"`
	Parent        *SpanSummary `json:"parent,omitempty"`
	StatusMessage string       `json:"statusMessage" required:"true"`
	// ErrorAncestorCount is the number of consecutive ancestors, from the parent up, that carry the error flag.
	ErrorAncestorCount uint32 `json:"errorAncestorCount" required:"true"`
}

type TraceErrorList struct {
	Total      uint64           `json:"total" required:"true"`
	Items      []TraceErrorItem `json:"items" required:"true" nullable:"false"`
	NextCursor string           `json:"nextCursor,omitempty"`
}

type TraceUnmarkedFailureItem struct {
	Span   SpanSummary           `json:"span" required:"true"`
	Parent *SpanSummary          `json:"parent,omitempty"`
	Reason UnmarkedFailureReason `json:"reason" required:"true"`
}

type TraceUnmarkedFailureList struct {
	Total      uint64                     `json:"total" required:"true"`
	Items      []TraceUnmarkedFailureItem `json:"items" required:"true" nullable:"false"`
	NextCursor string                     `json:"nextCursor,omitempty"`
}

// TraceSlowestItem is one span, or the same-name spans under one parent taken together.
type TraceSlowestItem struct {
	// Span is the longest span of the group.
	Span           SpanSummary  `json:"span" required:"true"`
	Parent         *SpanSummary `json:"parent,omitempty"`
	SpanCount      uint64       `json:"spanCount" required:"true"`
	OwnTimeNano    uint64       `json:"ownTimeNano" required:"true"`
	ErrorSpanCount uint64       `json:"errorSpanCount" required:"true"`
}

type TraceSlowestList struct {
	Total      uint64             `json:"total" required:"true"`
	Items      []TraceSlowestItem `json:"items" required:"true" nullable:"false"`
	NextCursor string             `json:"nextCursor,omitempty"`
}

type TraceExpensiveItem struct {
	Span         SpanSummary  `json:"span" required:"true"`
	Parent       *SpanSummary `json:"parent,omitempty"`
	Cost         *float64     `json:"cost,omitempty" nullable:"false"`
	InputTokens  uint64       `json:"inputTokens" required:"true"`
	OutputTokens uint64       `json:"outputTokens" required:"true"`
}

type TraceExpensiveList struct {
	Total      uint64               `json:"total" required:"true"`
	Items      []TraceExpensiveItem `json:"items" required:"true" nullable:"false"`
	NextCursor string               `json:"nextCursor,omitempty"`
}

type TraceLinkItem struct {
	Span   SpanSummary  `json:"span" required:"true"`
	Parent *SpanSummary `json:"parent,omitempty"`
	// LinkCount is the number of spans this span links to; Links holds the first of them.
	LinkCount uint64 `json:"linkCount" required:"true"`
	Links     []Link `json:"links" required:"true" nullable:"false"`
}

// TraceLinkList lists the spans of this trace that link to other spans, in this or another trace.
type TraceLinkList struct {
	Total      uint64          `json:"total" required:"true"`
	Items      []TraceLinkItem `json:"items" required:"true" nullable:"false"`
	NextCursor string          `json:"nextCursor,omitempty"`
}

type TraceTree struct {
	// Total is the number of spans in the trace; Spans holds every one of them when Complete is set.
	Total    uint64 `json:"total" required:"true"`
	Complete bool   `json:"complete" required:"true"`
	// Spans is in tree order: a span is followed by the spans below it. A span's childCount and
	// subtreeSpanCount say how much of the trace sits under it.
	Spans []SpanSummary `json:"spans" required:"true" nullable:"false"`
	// Records holds the full record of every span of a small trace.
	Records []SpanRecord `json:"records,omitempty" nullable:"false"`
}

// TraceOverview holds every part on a first call and one list on a call with a cursor.
type TraceOverview struct {
	Identity         *TraceIdentity            `json:"identity,omitempty"`
	Errors           *TraceErrorList           `json:"errors,omitempty"`
	UnmarkedFailures *TraceUnmarkedFailureList `json:"unmarkedFailures,omitempty"`
	Slowest          *TraceSlowestList         `json:"slowest,omitempty"`
	// Expensive is present when the trace has gen_ai spans.
	Expensive *TraceExpensiveList `json:"expensive,omitempty"`
	Links     *TraceLinkList      `json:"links,omitempty"`
	Tree      *TraceTree          `json:"tree,omitempty"`
}

type TraceSpanLevel struct {
	// Level counts down from the span: 1 holds its children.
	Level uint32        `json:"level" required:"true"`
	Total uint64        `json:"total" required:"true"`
	Spans []SpanSummary `json:"spans" required:"true" nullable:"false"`
}

// TraceSpanPercentile places a span's duration among the spans of the same name and service that
// started in the window before it.
type TraceSpanPercentile struct {
	P50Nano uint64 `json:"p50Nano" required:"true"`
	P90Nano uint64 `json:"p90Nano" required:"true"`
	P99Nano uint64 `json:"p99Nano" required:"true"`
	// Position is the share of those spans, 0 to 100, that were no slower than this one.
	Position      float64 `json:"position" required:"true"`
	WindowMinutes uint64  `json:"windowMinutes" required:"true"`
}

type TraceSpanDetail struct {
	Summary SpanSummary `json:"summary" required:"true"`
	Record  SpanRecord  `json:"record" required:"true"`
	// Percentile is omitted when it could not be computed in time.
	Percentile *TraceSpanPercentile `json:"percentile,omitempty"`
	// Ancestors holds the nearest ancestors, the parent first, then the root when it is further up.
	Ancestors     []SpanSummary    `json:"ancestors" required:"true" nullable:"false"`
	AncestorCount uint64           `json:"ancestorCount" required:"true"`
	Descendants   []TraceSpanLevel `json:"descendants" required:"true" nullable:"false"`
}

type SpanTextMatch struct {
	Field   string `json:"field" required:"true"`
	Snippet string `json:"snippet" required:"true"`
}

type TraceSpanMatch struct {
	Span   SpanSummary  `json:"span" required:"true"`
	Parent *SpanSummary `json:"parent,omitempty"`
	// Matches says where the searched words were found; empty for a filter without words.
	Matches []SpanTextMatch `json:"matches" required:"true" nullable:"false"`
}

// TraceSpanList holds the spans matching a search, or every span when there is none.
type TraceSpanList struct {
	Total      uint64           `json:"total" required:"true"`
	Items      []TraceSpanMatch `json:"items" required:"true" nullable:"false"`
	NextCursor string           `json:"nextCursor,omitempty"`
	// Warnings says why a search may have matched less than expected, such as a key that is not known.
	Warnings []string `json:"warnings,omitempty" nullable:"false"`
}
