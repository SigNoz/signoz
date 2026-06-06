export enum TraceDetailEvents {
	DataLoaded = 'Trace Detail: Data loaded',
	ViewSwitched = 'Trace Detail: View switched',
	FlameGraphToggled = 'Trace Detail: Flame graph toggled',
	WaterfallToggled = 'Trace Detail: Waterfall toggled',
	AnalyticsPanelToggled = 'Trace Detail: Analytics panel toggled',
	AnalyticsTabChanged = 'Trace Detail: Analytics tab changed',
	SpanPanelTabChanged = 'Trace Detail: Span panel tab changed',
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
	EntryPreferOldView = 'entryPreferOldView',
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
}

export type TraceDetailView = 'v2' | 'v3';
