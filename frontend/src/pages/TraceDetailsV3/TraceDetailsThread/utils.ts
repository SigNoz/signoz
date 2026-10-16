import type { SpantypesThreadSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { isAxiosError } from 'axios';

import { collectToolCallKeys } from '../AIThreadMessage/utils';
import { toThreadMessages } from '../AIThreadMessage/messageUtils';
import { InterestedSpanStatus, ThreadSpan } from './types';

/** Derives SpanV3's `timestamp` and `service.name`, as the waterfall does. */
export function toThreadSpan(span: SpantypesThreadSpanDTO): ThreadSpan {
	return {
		...(span as unknown as ThreadSpan),
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
		formatted_input: toThreadMessages(span.formattedInput),
		formatted_output: toThreadMessages(span.formattedOutput),
	};
}

export function isNotFoundError(error: unknown): boolean {
	return isAxiosError(error) && error.response?.status === 404;
}

export function buildToolCallIndex(spans: ThreadSpan[]): Set<string> {
	return new Set(
		spans.flatMap((span) => [
			...collectToolCallKeys(span.formatted_input ?? []),
			...collectToolCallKeys(span.formatted_output ?? []),
		]),
	);
}

export function getInterestedSpanStatus(
	interestedSpanId: string | undefined,
	spans: ThreadSpan[],
	isLoading: boolean,
): InterestedSpanStatus {
	if (!interestedSpanId) {
		return InterestedSpanStatus.None;
	}
	if (isLoading) {
		return InterestedSpanStatus.Loading;
	}
	if (spans.length === 0) {
		return InterestedSpanStatus.NotFound;
	}
	return spans.some((span) => span.span_id === interestedSpanId)
		? InterestedSpanStatus.Found
		: InterestedSpanStatus.NoMessages;
}
