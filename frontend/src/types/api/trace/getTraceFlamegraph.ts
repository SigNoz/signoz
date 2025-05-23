export interface TraceDetailFlamegraphURLProps {
	id: string;
}

export interface GetTraceFlamegraphPayloadProps {
	traceId: string;
	selectedSpanId: string;
}

export interface Event {
	name: string;
	timeUnixNano: number;
	attributeMap: Record<string, string>;
	isError: boolean;
}

export interface FlamegraphSpan {
	timestamp: number;
	durationNano: number;
	spanId: string;
	parentSpanId: string;
	traceId: string;
	hasError: boolean;
	serviceName: string;
	name: string;
	level: number;
	event: Event[];
}

export interface GetTraceFlamegraphSuccessResponse {
	spans: FlamegraphSpan[][];
	startTimestampMillis: number;
	endTimestampMillis: number;
}
