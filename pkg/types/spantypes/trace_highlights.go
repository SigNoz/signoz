package spantypes

import (
	"slices"
)

const highlightsDefaultLimit = 10

type GetTraceHighlightsParams struct {
	Views []SpanListView `query:"views" description:"The lists to return, each named by its view. Default: all of them."`
	Limit int            `query:"limit" description:"Number of spans in each list. Default: 10. Maximum: 1000."`
}

type TraceServiceStats struct {
	ServiceName    string `json:"serviceName" required:"true"`
	SpanCount      uint64 `json:"spanCount" required:"true" description:"Number of spans of the service."`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true" description:"Number of spans of the service that are marked as errors."`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"Total own time of the service's spans, in nanoseconds."`
}

// TraceHighlights shows where to look in a trace. Each list is the first page of the span list with
// the view it is named after, and is left out when that view was not asked for.
type TraceHighlights struct {
	Services         []TraceServiceStats `json:"services" required:"true" nullable:"false" description:"Totals for each service of the trace, highest own time first."`
	ErrorOrigins     *SpanList           `json:"errorOrigins,omitempty" description:"The spans where an error started. First page of the error_origins view of the span list."`
	UnmarkedFailures *SpanList           `json:"unmarkedFailures,omitempty" description:"Spans that are not marked as errors but report a 4xx or 5xx response, a gRPC status other than OK, or an exception event. First page of the unmarked_failures view of the span list."`
	TimeSpent        *SpanList           `json:"timeSpent,omitempty" description:"Where the time went, same-name siblings counted as one. First page of the time_spent view of the span list."`
	AIUsage          *SpanList           `json:"aiUsage,omitempty" description:"The spans with the highest gen_ai cost or token usage. First page of the ai_usage view of the span list. Empty for a trace where no span carries that usage."`
	Links            *SpanList           `json:"links,omitempty" description:"Spans that link to other spans. First page of the links view of the span list."`
}

type TraceHighlightsQuery struct {
	Views []SpanListView
	Limit int
}

func NewTraceHighlightsQuery(params *GetTraceHighlightsParams) (*TraceHighlightsQuery, error) {
	limit, err := pageLimit("limit", params.Limit, highlightsDefaultLimit)
	if err != nil {
		return nil, err
	}
	query := &TraceHighlightsQuery{Limit: limit}
	for _, view := range params.Views {
		if err := validateSpanListView(view); err != nil {
			return nil, err
		}
		if !slices.Contains(query.Views, view) {
			query.Views = append(query.Views, view)
		}
	}
	if len(query.Views) == 0 {
		query.Views = spanListViews()
	}
	return query, nil
}

// NewTraceHighlights builds the first page of each requested view from the tree.
func NewTraceHighlights(skeleton *TraceSkeleton, query *TraceHighlightsQuery) *TraceHighlights {
	highlights := &TraceHighlights{Services: skeleton.serviceStats()}
	for _, view := range query.Views {
		list := NewSpanList(skeleton.page(skeleton.treeOrder, view, 0, query.Limit), nil)
		switch view {
		case SpanListViewErrorOrigins:
			highlights.ErrorOrigins = list
		case SpanListViewUnmarkedFailures:
			highlights.UnmarkedFailures = list
		case SpanListViewTimeSpent:
			highlights.TimeSpent = list
		case SpanListViewAIUsage:
			highlights.AIUsage = list
		case SpanListViewLinks:
			highlights.Links = list
		}
	}
	return highlights
}
