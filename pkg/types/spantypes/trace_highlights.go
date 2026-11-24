package spantypes

type GetTraceHighlightsParams struct {
	Views []SpanListView `query:"views" description:"The lists to return, each named by its view. Default: every view except all."`
	Limit int            `query:"limit" description:"Number of spans in each list. Default: 10. Maximum: 1000."`
}

type TraceServiceStats struct {
	ServiceName    string `json:"serviceName" required:"true"`
	SpanCount      uint64 `json:"spanCount" required:"true" description:"Number of spans of the service."`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true" description:"Number of spans of the service that are marked as errors."`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"Total own time of the service's spans, in nanoseconds."`
}

// TraceHighlights is the first read of a trace. Each list is the first page of the span list with
// the view it is named after, and is left out when that view was not asked for.
type TraceHighlights struct {
	Summary          GettableTraceSummary `json:"summary" required:"true" description:"Totals of the trace. The same object the trace summary route returns."`
	Services         []TraceServiceStats  `json:"services" required:"true" nullable:"false" description:"Totals for each service of the trace, highest own time first."`
	ErrorOrigins     *SpanList            `json:"errorOrigins,omitempty" description:"The spans where an error started. First page of the error_origins view of the span list."`
	UnmarkedFailures *SpanList            `json:"unmarkedFailures,omitempty" description:"Spans that failed without being marked as errors. First page of the unmarked_failures view of the span list."`
	TimeSpent        *SpanList            `json:"timeSpent,omitempty" description:"Where the time went, same-name siblings counted as one. First page of the time_spent view of the span list."`
	AIUsage          *SpanList            `json:"aiUsage,omitempty" description:"The spans with the highest gen_ai cost or token usage. First page of the ai_usage view of the span list. Empty for a trace where no span carries that usage."`
	Links            *SpanList            `json:"links,omitempty" description:"Spans that link to other spans. First page of the links view of the span list."`
	All              *SpanList            `json:"all,omitempty" description:"The top of the trace in tree order. First page of the span list without a view. Returned only when asked for."`
}
