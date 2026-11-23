package spantypes

type GetTraceOverviewParams struct {
	Limit     int `query:"limit" description:"Number of spans in each of the errors, unmarkedFailures, expensive, links and slowest lists. Default: 10. Maximum: 1000."`
	TreeLimit int `query:"treeLimit" description:"Number of spans in tree. Default: 50. Maximum: 1000."`
}

type TraceServiceStats struct {
	ServiceName    string `json:"serviceName" required:"true"`
	SpanCount      uint64 `json:"spanCount" required:"true" description:"Number of spans of the service."`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true" description:"Number of spans of the service that are marked as errors."`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"Total own time of the service's spans, in nanoseconds."`
}

// TraceOverview is the first read of a trace. Each list but Tree is the first page of the span list
// view of the same name.
type TraceOverview struct {
	Summary          GettableTraceSummary `json:"summary" required:"true" description:"Totals of the trace. The same object the trace summary route returns."`
	Services         []TraceServiceStats  `json:"services" required:"true" nullable:"false" description:"Totals for each service of the trace, highest own time first."`
	Errors           SpanList             `json:"errors" required:"true" description:"The spans where an error started. First page of the errors view of the span list."`
	UnmarkedFailures SpanList             `json:"unmarkedFailures" required:"true" description:"Spans that failed without being marked as errors. First page of the unmarked_failures view of the span list."`
	Expensive        SpanList             `json:"expensive" required:"true" description:"The most expensive gen_ai spans. First page of the expensive view of the span list. Empty for a trace without gen_ai spans."`
	Links            SpanList             `json:"links" required:"true" description:"Spans that link to other spans. First page of the links view of the span list."`
	Slowest          SpanList             `json:"slowest" required:"true" description:"Where the time went, same-name siblings counted as one. First page of the slowest view of the span list."`
	Tree             SpanList             `json:"tree" required:"true" description:"The top levels of the trace, chosen level by level and listed in tree order. Not a page of the span list. Its total is the number of spans in the trace."`
}
