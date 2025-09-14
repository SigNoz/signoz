import { HierarchicalSpanData, ServiceEntrySpan, SpanDataRow } from './types';

export function formatDuration(durationNano: number): string {
	if (durationNano < 1000) {
		return `${durationNano}ns`;
	}
	if (durationNano < 1000000) {
		return `${(durationNano / 1000).toFixed(2)}μs`;
	}
	if (durationNano < 1000000000) {
		return `${(durationNano / 1000000).toFixed(2)}ms`;
	}
	return `${(durationNano / 1000000000).toFixed(2)}s`;
}

export function transformEntrySpansToHierarchy(
	entrySpans: SpanDataRow[],
): HierarchicalSpanData {
	let totalTraceTime = 0;

	// Calculate total trace time from all entry spans
	entrySpans.forEach((span) => {
		totalTraceTime += span.data.duration_nano;
	});

	// Transform entry spans to ServiceEntrySpan structure
	const entrySpansList: ServiceEntrySpan[] = entrySpans.map((span) => ({
		spanData: span,
		serviceName: span.data['service.name'],
		isExpanded: false,
		serviceSpans: undefined,
		isLoadingServiceSpans: false,
	}));

	// Sort by timestamp (most recent first)
	entrySpansList.sort(
		(a, b) =>
			new Date(b.spanData.timestamp).getTime() -
			new Date(a.spanData.timestamp).getTime(),
	);

	return {
		entrySpans: entrySpansList,
		totalTraceTime,
	};
}

// Mock function to simulate fetching service spans
export function fetchServiceSpans(
	traceId: string,
	serviceName: string,
): Promise<SpanDataRow[]> {
	// This would normally make an API call to get spans for the specific service
	// For now, return mock data filtered by service name
	return new Promise((resolve) => {
		setTimeout(() => {
			// Mock response - in real implementation, this would call the API
			const mockServiceSpans: SpanDataRow[] = [
				{
					data: {
						duration_nano: 1500000,
						http_method: 'GET',
						name: `${serviceName}/internal-call-1`,
						response_status_code: '200',
						'service.name': serviceName,
						span_id: `${serviceName}-span-1`,
						timestamp: '2025-09-03T11:33:46.100000000Z',
						trace_id: traceId,
					},
					timestamp: '2025-09-03T11:33:46.100000000Z',
				},
				{
					data: {
						duration_nano: 2500000,
						http_method: 'POST',
						name: `${serviceName}/internal-call-2`,
						response_status_code: '200',
						'service.name': serviceName,
						span_id: `${serviceName}-span-2`,
						timestamp: '2025-09-03T11:33:46.200000000Z',
						trace_id: traceId,
					},
					timestamp: '2025-09-03T11:33:46.200000000Z',
				},
			];
			resolve(mockServiceSpans);
		}, 500); // Simulate network delay
	});
}
