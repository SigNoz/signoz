import { collectToolCallIds } from '../AIThreadMessage/utils';
import { AnchorStatus, ThreadSpan } from './types';

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
