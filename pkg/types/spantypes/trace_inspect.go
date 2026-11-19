package spantypes

import (
	"encoding/base64"
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	inspectListSize     = 10
	inspectServiceLimit = 20
	inspectLinkTargets  = 5
	// inspectTreeSpans is the number of spans the tree shows, and the largest trace returned with its records.
	inspectTreeSpans       = 50
	inspectSmallTraceChars = 20_000
	// inspectMaxResponseChars keeps a response under 50,000 characters with its envelope.
	inspectMaxResponseChars = 48_000
)

var (
	ErrCodeInspectInvalidCursor = errors.MustNewCode("trace_inspect_invalid_cursor")
	ErrCodeInspectInvalidDepth  = errors.MustNewCode("trace_inspect_invalid_depth")
	ErrCodeInspectInvalidLimit  = errors.MustNewCode("trace_inspect_invalid_limit")
	ErrCodeInspectInvalidParams = errors.MustNewCode("trace_inspect_invalid_params")
)

// The lists of the overview, as a cursor names them.
const (
	OverviewListErrors           = "errors"
	OverviewListUnmarkedFailures = "unmarkedFailures"
	OverviewListSlowest          = "slowest"
	OverviewListExpensive        = "expensive"
	OverviewListLinks            = "links"
)

var overviewLists = []string{OverviewListErrors, OverviewListUnmarkedFailures, OverviewListSlowest, OverviewListExpensive, OverviewListLinks}

var (
	UnmarkedFailureHTTP4xx        = UnmarkedFailureReason{valuer.NewString("http_4xx")}
	UnmarkedFailureGRPCStatus     = UnmarkedFailureReason{valuer.NewString("grpc_status")}
	UnmarkedFailureExceptionEvent = UnmarkedFailureReason{valuer.NewString("exception_event")}
)

var (
	InspectTypeOverview = InspectType{valuer.NewString("overview")}
	InspectTypeSpan     = InspectType{valuer.NewString("span")}
	InspectTypeFind     = InspectType{valuer.NewString("find")}
)

// UnmarkedFailureReason says why a span without the error flag is listed as a failure.
type UnmarkedFailureReason struct{ valuer.String }

func (UnmarkedFailureReason) Enum() []any {
	return []any{UnmarkedFailureHTTP4xx, UnmarkedFailureGRPCStatus, UnmarkedFailureExceptionEvent}
}

// InspectType names the part of an inspect response that is filled.
type InspectType struct{ valuer.String }

func (InspectType) Enum() []any {
	return []any{InspectTypeOverview, InspectTypeSpan, InspectTypeFind}
}

type InspectTraceParams struct {
	SpanID       string   `query:"spanId" description:"Returns this span in full with the spans around it. Cannot be combined with search."`
	Search       string   `query:"search" description:"Returns the spans that match, earliest first: words, a filter expression, or both, such as worldpay AND has_error = true. Words match the span name, status message, attribute values and events, ignoring case."`
	Depth        int      `query:"depth" description:"With spanId, the number of levels of ancestors and of descendants returned, 1 to 10; 2 when not given. The root span is always returned."`
	AllSpans     bool     `query:"allSpans" description:"Returns a different response: every span of the trace as a short line, in tree order, or with spanId that span and every span below it. Cannot be combined with search or depth."`
	SelectFields []string `query:"selectFields" description:"With spanId, attribute names returned without the 500 character cut; the record then holds only these attributes."`
	Limit        int      `query:"limit" description:"Page size for search and for allSpans, at most 1000; when not given, 20 with search and 400 with allSpans. A page holds fewer spans when it would pass the 50,000 character limit."`
	Cursor       string   `query:"cursor" description:"The nextCursor of an earlier response to the same request; returns the next page."`
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

type TraceSpanList struct {
	Total      uint64           `json:"total" required:"true"`
	Items      []TraceSpanMatch `json:"items" required:"true" nullable:"false"`
	NextCursor string           `json:"nextCursor,omitempty"`
}

// GettableTraceInspection holds one part, named by Type.
type GettableTraceInspection struct {
	Type     InspectType      `json:"type" required:"true"`
	Overview *TraceOverview   `json:"overview,omitempty"`
	Span     *TraceSpanDetail `json:"span,omitempty"`
	// Find holds the spans matching search, or every span for allSpans.
	Find *TraceSpanList `json:"find,omitempty"`
}

// InspectQuery is a validated inspect request.
type InspectQuery struct {
	Type InspectType
	// List and Offset page one list of the overview; List is empty on a first call.
	List   string
	Offset int
}

// inspectCursor is the content of a nextCursor: the list it belongs to and where its next page starts.
type inspectCursor struct {
	List   string `json:"list,omitempty"`
	Offset int    `json:"offset,omitempty"`
}

// NewInspectQuery validates the parameters of an overview request. A parameter that does not
// apply to the overview is an error.
func NewInspectQuery(params *InspectTraceParams) (*InspectQuery, error) {
	query := &InspectQuery{Type: InspectTypeOverview}
	switch {
	case params.SpanID != "" || params.Search != "" || params.AllSpans:
		return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "spanId, search and allSpans are not implemented yet")
	case params.Depth != 0:
		return nil, errors.NewInvalidInputf(ErrCodeInspectInvalidDepth, "depth needs spanId")
	case len(params.SelectFields) > 0:
		return nil, errors.NewInvalidInputf(ErrCodeInspectInvalidParams, "selectFields needs spanId")
	case params.Limit != 0:
		return nil, errors.NewInvalidInputf(ErrCodeInspectInvalidLimit, "limit needs search or allSpans")
	case params.Cursor == "":
		return query, nil
	}

	cursor, err := decodeInspectCursor(params.Cursor)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(overviewLists, cursor.List) || cursor.Offset <= 0 {
		return nil, errors.NewInvalidInputf(ErrCodeInspectInvalidCursor, "invalid cursor")
	}
	query.List, query.Offset = cursor.List, cursor.Offset
	return query, nil
}

func decodeInspectCursor(encoded string) (*inspectCursor, error) {
	data, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeInspectInvalidCursor, "invalid cursor")
	}
	cursor := new(inspectCursor)
	if err := json.Unmarshal(data, cursor); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeInspectInvalidCursor, "invalid cursor")
	}
	return cursor, nil
}

func (c inspectCursor) encode() string {
	data, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(data)
}
