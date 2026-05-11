export interface TraceDetailV2URLProps {
	id: string;
}

export interface GetTraceV2PayloadProps {
	traceId: string;
	selectedSpanId: string;
	uncollapsedSpans: string[];
	isSelectedSpanIDUnCollapsed: boolean;
}

export interface Event {
	name: string;
	timeUnixNano: number;
	attributeMap: Record<string, string>;
	isError: boolean;
}
export interface Span {
	timestamp: number;
	durationNano: number;
	spanId: string;
	rootSpanId: string;
	parentSpanId: string;
	traceId: string;
	hasError: boolean;
	kind: number;
	serviceName: string;
	name: string;
	references: any;
	tagMap: Record<string, string>;
	event: Event[];
	rootName: string;
	statusMessage: string;
	statusCodeString: string;
	spanKind: string;
	hasChildren: boolean;
	hasSibling: boolean;
	subTreeNodeCount: number;
	level: number;
	// V2 API format fields
	attributes_string?: Record<string, string>;
	attributes_number?: Record<string, number>;
	attributes_bool?: Record<string, boolean>;
	resources_string?: Record<string, string>;
	// V3 API format fields
	attributes?: Record<string, string>;
	resources?: Record<string, string>;
	http_method?: string;
	http_url?: string;
	http_host?: string;
	db_name?: string;
	db_operation?: string;
	external_http_method?: string;
	external_http_url?: string;
	response_status_code?: string;
	is_remote?: string;
}

export interface GetTraceV2SuccessResponse {
	spans: Span[];
	hasMissingSpans: boolean;
	uncollapsedSpans: string[];
	startTimestampMillis: number;
	endTimestampMillis: number;
	totalSpansCount: number;
	totalErrorSpansCount: number;
	rootServiceName: string;
	rootServiceEntryPoint: string;
	serviceNameToTotalDurationMap: Record<string, number>;
}
