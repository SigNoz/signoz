import type { SpantypesThreadSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { isAxiosError } from 'axios';

import { collectToolCallIds } from '../AIThreadMessage/utils';
import { toThreadMessages } from './messageUtils';
import { AnchorStatus, ThreadSpan } from './types';

/** Derives SpanV3's `timestamp` and `service.name`, as the waterfall does. */
export function toThreadSpan(span: SpantypesThreadSpanDTO): ThreadSpan {
	return {
		...(span as unknown as ThreadSpan),
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
		formatted_input: toThreadMessages(span.formatted_input),
		formatted_output: toThreadMessages(span.formatted_output),
	};
}

export function isNotFoundError(error: unknown): boolean {
	return isAxiosError(error) && error.response?.status === 404;
}

export function buildToolCallIndex(spans: ThreadSpan[]): Set<string> {
	return new Set(
		spans.flatMap((span) => [
			...collectToolCallIds(span.formatted_input ?? []),
			...collectToolCallIds(span.formatted_output ?? []),
		]),
	);
}

export function getAnchorStatus(
	anchorSpanId: string | undefined,
	spans: ThreadSpan[],
	isLoading: boolean,
): AnchorStatus {
	if (!anchorSpanId) {
		return AnchorStatus.None;
	}
	if (isLoading) {
		return AnchorStatus.Loading;
	}
	if (spans.length === 0) {
		return AnchorStatus.NotFound;
	}
	return spans.some((span) => span.span_id === anchorSpanId)
		? AnchorStatus.Found
		: AnchorStatus.NoMessages;
}
