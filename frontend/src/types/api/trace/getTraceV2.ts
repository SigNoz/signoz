export interface TraceDetailV2URLProps {
	id: string;
}

export interface GetTraceV2PayloadProps {
	traceId: string;
	interestedSpanId: string;
	uncollapsedNodes: string[];
	isInterestedSpanIdUnCollapsed: boolean;
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
	event: string[];
	rootName: string;
	statusMessage: string;
	statusCodeString: string;
	spanKind: string;
	hasChildren: boolean;
	hasSibling: boolean;
	level: number;
}

export interface GetTraceV2SuccessResponse {
	spans: Span[];
	uncollapsedNodes: string[];
	startTimestampMillis: number;
	endTimestampMillis: number;
	totalSpansCount: number;
	totalErrorSpansCount: number;
	rootServiceName: string;
	rootServiceEntryPoint: string;
}
