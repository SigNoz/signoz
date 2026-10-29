import type { SpantypesThreadSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { isAxiosError } from 'axios';

import { collectToolCallKeys } from '../AIThreadMessage/utils';
import { InterestedSpanStatus, ThreadSpan } from './types';

/** Derives SpanV3's `timestamp` and `service.name`, as the waterfall does. */
export function toThreadSpan(span: SpantypesThreadSpanDTO): ThreadSpan {
	return {
		...(span as unknown as ThreadSpan),
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
	};
}

export function isNotFoundError(error: unknown): boolean {
	return isAxiosError(error) && error.response?.status === 404;
}

export function buildToolCallIndex(span: ThreadSpan): Set<string> {
	return new Set([
		...collectToolCallKeys(span.formattedInput ?? []),
		...collectToolCallKeys(span.formattedOutput ?? []),
	]);
}

export function getInterestedSpanStatus(
	interestedSpanId: string | undefined,
	spans: ThreadSpan[],
	isLoading: boolean,
	isNotFound: boolean,
): InterestedSpanStatus {
	if (!interestedSpanId) {
		return InterestedSpanStatus.None;
	}
	if (isLoading) {
		return InterestedSpanStatus.Loading;
	}
	if (isNotFound) {
		return InterestedSpanStatus.NotFound;
	}
	// The span exists but the thread is empty, so the no-AI-spans state applies.
	if (spans.length === 0) {
		return InterestedSpanStatus.None;
	}
	return spans.some((span) => span.span_id === interestedSpanId)
		? InterestedSpanStatus.Found
		: InterestedSpanStatus.NoIOMessages;
}
