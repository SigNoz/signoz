package spantypes

type GetTraceOverviewParams struct {
	Limit     int `query:"limit" description:"The number of spans in each of errors, unmarkedFailures, expensive, links and slowest, at most 1000; 10 when not given."`
	TreeLimit int `query:"treeLimit" description:"The number of spans in tree, at most 1000; 50 when not given."`
}

type TraceServiceStats struct {
	ServiceName    string `json:"serviceName" required:"true"`
	SpanCount      uint64 `json:"spanCount" required:"true"`
	ErrorSpanCount uint64 `json:"errorSpanCount" required:"true"`
	OwnTimeNano    uint64 `json:"ownTimeNano" required:"true" description:"The own time of the service's spans, added up."`
}

// TraceOverview is the first read of a trace. Each list but Tree is the first page of the span list
// view of the same name.
type TraceOverview struct {
	Summary          GettableTraceSummary `json:"summary" required:"true"`
	Services         []TraceServiceStats  `json:"services" required:"true" nullable:"false" description:"Every service of the trace, highest own time first."`
	Errors           SpanList             `json:"errors" required:"true"`
	UnmarkedFailures SpanList             `json:"unmarkedFailures" required:"true"`
	Expensive        SpanList             `json:"expensive" required:"true"`
	Links            SpanList             `json:"links" required:"true"`
	Slowest          SpanList             `json:"slowest" required:"true"`
	Tree             SpanList             `json:"tree" required:"true" description:"The top levels of the trace, picked level by level and listed in tree order. It is not a page of the span list; its total is the number of spans in the trace."`
}
