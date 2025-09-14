export interface SpanData {
	duration_nano: number;
	http_method: string;
	name: string;
	response_status_code: string;
	'service.name': string;
	span_id: string;
	timestamp: string;
	trace_id: string;
}

export interface SpanDataRow {
	data: SpanData;
	timestamp: string;
}

export interface ApiResponse {
	status: string;
	data: {
		type: string;
		meta: {
			rowsScanned: number;
			bytesScanned: number;
			durationMs: number;
		};
		data: {
			results: Array<{
				queryName: string;
				nextCursor: string;
				rows: SpanDataRow[];
			}>;
		};
	};
}

export interface ServiceEntrySpan {
	spanData: SpanDataRow;
	serviceName: string;
	isExpanded?: boolean;
	serviceSpans?: SpanDataRow[]; // All spans for this service when expanded
	isLoadingServiceSpans?: boolean;
}

export interface HierarchicalSpanData {
	entrySpans: ServiceEntrySpan[];
	totalTraceTime: number;
}
