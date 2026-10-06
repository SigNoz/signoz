import type { TraceMetadataForHeader } from './TraceDetailsHeader';

// Placeholder until GET /api/v1/traces/{id}/summary feeds the header.
export const MOCK_TRACE_METADATA: TraceMetadataForHeader = {
	startTimestampMillis: 1789627365929,
	endTimestampMillis: 1789627367867,
	rootServiceName: 'frontend',
	rootServiceEntryPoint: 'HTTP GET /checkout',
	rootSpanStatusCode: '200',
	hasMissingSpans: false,
	totalSpansCount: 3,
};
