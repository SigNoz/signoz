export enum TraceDetailEvents {
	DataLoaded = 'Trace Detail: Data loaded',
	ViewSwitched = 'Trace Detail: View switched',
	FlameGraphToggled = 'Trace Detail: Flame graph toggled',
	WaterfallToggled = 'Trace Detail: Waterfall toggled',
	AnalyticsPanelToggled = 'Trace Detail: Analytics panel toggled',
	AnalyticsTabChanged = 'Trace Detail: Analytics tab changed',
	SpanPanelTabChanged = 'Trace Detail: Span panel tab changed',
	DownloadTriggered = 'Trace Detail: Download triggered',
	DownloadCancelled = 'Trace Detail: Download cancelled',
	SpanPercentileToggled = 'Trace Detail: Span percentile toggled',
	SpanPercentileTimeRangeChanged = 'Trace Detail: Span percentile time range changed',
	SpanPercentileAttributesSelectorToggled = 'Trace Detail: Span percentile attributes selector toggled',
	SpanPercentileAttributeChanged = 'Trace Detail: Span percentile attribute changed',
}

export enum TraceDetailEventKeys {
	// Injected on every event by useTraceDetailLogEvent
	View = 'view',
	TraceId = 'traceId',
	// Data loaded — trace shape
	TotalSpansCount = 'totalSpansCount',
	NumServices = 'numServices',
	TraceDurationMs = 'traceDurationMs',
	HadErrors = 'hadErrors',
	FlamegraphSampled = 'flamegraphSampled',
	// Data loaded — persisted settings
	SpanPanelVariant = 'spanPanelVariant',
	ColorByField = 'colorByField',
	PreviewFieldsCount = 'previewFieldsCount',
	// View switched
	From = 'from',
	To = 'to',
	DwellMs = 'dwellMs',
	// Toggles / tabs
	Expanded = 'expanded',
	Open = 'open',
	Tab = 'tab',
	// Span panel tab changed
	SpanId = 'spanId',
	// Download triggered (reuses TotalSpansCount for trace size)
	Format = 'format',
	// Span percentile (reuses Open, SpanId, From, To)
	PercentileValue = 'percentileValue',
	ResourceAttributeKey = 'resourceAttributeKey',
	Selected = 'selected',
}

export type TraceDetailView = 'v2' | 'v3';
