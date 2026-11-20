import { useMemo, useState } from 'react';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { toSpanV3 } from './utils';

type UseDrawerSpanParams = {
	traceId: string | null;
	spanId: string | null;
	waterfallSpans: SpanV3[];
	/** The list row of the open span, if it is one. */
	seedRow: TracesTableRow | null;
};

type UseDrawerSpanResult = {
	span: SpanV3 | undefined;
	/** `span` is the previously shown one; the requested span is still loading. */
	isStale: boolean;
};

/**
 * Picks the span to show: the waterfall's copy, else the list row's, else the
 * last span shown until the requested one loads.
 */
export function useDrawerSpan({
	traceId,
	spanId,
	waterfallSpans,
	seedRow,
}: UseDrawerSpanParams): UseDrawerSpanResult {
	const loadedSpan = useMemo(
		() => waterfallSpans.find((s) => s.span_id === spanId),
		[waterfallSpans, spanId],
	);

	const seedSpan = useMemo(
		() =>
			seedRow && seedRow.trace_id === traceId && seedRow.span_id === spanId
				? toSpanV3(seedRow)
				: undefined,
		[seedRow, traceId, spanId],
	);

	const currentSpan = loadedSpan ?? seedSpan;
	const isOpen = !!traceId && !!spanId;

	const [lastShownSpan, setLastShownSpan] = useState<SpanV3>();
	if (currentSpan && currentSpan !== lastShownSpan) {
		setLastShownSpan(currentSpan);
	} else if (!isOpen && lastShownSpan) {
		setLastShownSpan(undefined);
	}

	if (currentSpan) {
		return { span: currentSpan, isStale: false };
	}
	if (isOpen && lastShownSpan) {
		return { span: lastShownSpan, isStale: true };
	}
	return { span: undefined, isStale: false };
}
