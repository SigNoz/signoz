export interface GetTraceV3PayloadProps {
	traceId: string;
	selectedSpanId: string;
	uncollapsedSpans: string[];
	isSelectedSpanIDUnCollapsed: boolean;
}

// Re-export shared types from V2 until V3 response diverges
export type {
	Event,
	GetTraceV2SuccessResponse as GetTraceV3SuccessResponse,
	Span,
	TraceDetailV2URLProps as TraceDetailV3URLProps,
} from './getTraceV2';
