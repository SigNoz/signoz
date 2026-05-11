export interface GetTraceV3PayloadProps {
	traceId: string;
	selectedSpanId: string;
	uncollapsedSpans: string[];
	isSelectedSpanIDUnCollapsed: boolean;
	limit?: number; // Optional limit for number of spans to fetch, default can be set in API
}

export interface TraceDetailV3URLProps {
	id: string;
}

// Event shape — same in V2 and V3 (already camelCase from backend)
export interface EventV3 {
	name: string;
	timeUnixNano: number;
	attributeMap: Record<string, string>;
	isError: boolean;
}

// V3 span — snake_case fields matching the API response directly.
// 'service.name' is the only derived field, computed once in getTraceV3.tsx.
export interface SpanV3 {
	// Identity
	span_id: string;
	trace_id: string;
	parent_span_id: string;

	// Timing
	timestamp: number;
	duration_nano: number;

	// Naming
	name: string;
	'service.name': string;

	// Status
	has_error: boolean;
	status_message: string;
	status_code: number;
	status_code_string: string;

	// Metadata
	kind: number;
	kind_string: string;

	// Tree structure
	has_children: boolean;
	has_sibling: boolean;
	sub_tree_node_count: number;
	level: number;

	// Attributes & Resources
	attributes: Record<string, any>;
	resource: Record<string, string>;

	// Events
	events: EventV3[];

	// V3 direct fields
	http_method: string;
	http_url: string;
	http_host: string;
	db_name: string;
	db_operation: string;
	external_http_method: string;
	external_http_url: string;
	response_status_code: string;
	is_remote: string;
	flags: number;
	trace_state: string;
}

export interface GetTraceV3SuccessResponse {
	spans: SpanV3[];
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
