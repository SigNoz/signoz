export interface TraceDetailsProps {
	id: string;
}

export interface GetTraceDetailsProps {
	traceID: string;
	spanID: string;
	uncollapsedNodes: string[];
}

interface OtelSpanRef {
	traceId: string;
	spanId: string;
	refType: string;
}

export interface SpanItem {
	timestamp: number;
	traceID: string;
	spanID: string;
	parentSpanID: string;
	name: string;
	serviceName: string;
	durationNano: number;
	references: OtelSpanRef[];
	hasChildren: boolean;
}

export interface GetTraceDetailsSuccessResponse {
	spans: SpanItem[];
}
