import type { SpantypesThreadSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { isAxiosError } from 'axios';

import { collectToolCallIds } from '../AIThreadMessage/utils';
import { toThreadMessages } from './messageUtils';
import { AnchorStatus, ThreadSpan } from './types';

type WireThreadSpan = Omit<
	ThreadSpan,
	'timestamp' | 'service.name' | 'formatted_input' | 'formatted_output'
> & {
	time_unix: number;
	formatted_input?: unknown;
	formatted_output?: unknown;
};

/** Derives SpanV3's `timestamp` and `service.name`, as the waterfall does. */
export function toThreadSpan(span: SpantypesThreadSpanDTO): ThreadSpan {
	const wire = span as unknown as WireThreadSpan;
	return {
		...wire,
		'service.name': wire.resource?.['service.name'] || '',
		timestamp: wire.time_unix,
		formatted_input: toThreadMessages(wire.formatted_input),
		formatted_output: toThreadMessages(wire.formatted_output),
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
