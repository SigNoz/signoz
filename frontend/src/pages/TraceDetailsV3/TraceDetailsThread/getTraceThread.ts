import { MOCK_TRACE_THREAD_SPANS } from './mockThread';
import { ThreadSpan, TraceThreadResponse } from './types';

export interface TraceThreadParams {
	traceId: string;
	limit: number;
	after?: string;
	before?: string;
	spanId?: string;
}

// Mock-only knobs; the real endpoint pages by `limit`.
const MOCK_PAGE_SIZE = 5;
const MOCK_LATENCY_MS = 400;
const SPANS_BEFORE_ANCHOR = 2;

type WireSpan = Omit<ThreadSpan, 'timestamp' | 'service.name'> & {
	time_unix: number;
};

function toThreadSpan(span: WireSpan): ThreadSpan {
	return {
		...span,
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
	};
}

function getStartIndex(
	spans: WireSpan[],
	{ after, before, spanId }: TraceThreadParams,
): number {
	if (after) {
		return Number(after);
	}
	if (before) {
		return Math.max(0, Number(before) - MOCK_PAGE_SIZE);
	}
	if (spanId) {
		const index = spans.findIndex((s) => s.span_id === spanId);
		return index === -1 ? -1 : Math.max(0, index - SPANS_BEFORE_ANCHOR);
	}
	return 0;
}

/** Placeholder for GET /api/v1/traces/{id}/thread; an unknown `spanId` yields no spans. */
export async function getTraceThread(
	params: TraceThreadParams,
): Promise<TraceThreadResponse> {
	await new Promise((resolve) => {
		setTimeout(resolve, MOCK_LATENCY_MS);
	});

	const all = MOCK_TRACE_THREAD_SPANS as unknown as WireSpan[];
	const start = getStartIndex(all, params);
	if (start === -1) {
		return { spans: [] };
	}

	const end = params.before
		? Number(params.before)
		: Math.min(all.length, start + MOCK_PAGE_SIZE);

	return {
		spans: all.slice(start, end).map(toThreadSpan),
		prevCursor: start > 0 ? String(start) : undefined,
		nextCursor: end < all.length ? String(end) : undefined,
	};
}
