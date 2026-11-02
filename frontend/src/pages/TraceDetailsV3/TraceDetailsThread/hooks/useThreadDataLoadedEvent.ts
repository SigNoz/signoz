import { MutableRefObject, useEffect } from 'react';
import { useGetTraceSummary } from 'api/generated/services/tracedetail';

import { TraceDetailsTab } from '../../constants';
import { TraceDetailEventKeys, TraceDetailEvents } from '../../events';
import { TraceDetailLogEvent } from '../../hooks/useTraceDetailLogEvent';
import { SpanDetailVariant } from '../../SpanDetailsPanel/constants';

interface ThreadDataLoadedEventArgs {
	traceId: string;
	hasSpans: boolean;
	spanPanelVariant: SpanDetailVariant;
	firedForRef: MutableRefObject<string>;
	logTraceEvent: TraceDetailLogEvent;
}

export function useThreadDataLoadedEvent({
	traceId,
	hasSpans,
	spanPanelVariant,
	firedForRef,
	logTraceEvent,
}: ThreadDataLoadedEventArgs): void {
	// No keepPreviousData: a previous trace's summary must not be reported for this one.
	const { data } = useGetTraceSummary(
		{ traceID: traceId },
		{ query: { enabled: !!traceId, refetchOnMount: false } },
	);
	const summary = data?.data;

	useEffect(() => {
		if (!traceId || firedForRef.current === traceId || !hasSpans || !summary) {
			return;
		}
		firedForRef.current = traceId;
		logTraceEvent(TraceDetailEvents.DataLoaded, {
			[TraceDetailEventKeys.DetailsTab]: TraceDetailsTab.Thread,
			[TraceDetailEventKeys.TotalSpansCount]: summary.totalSpansCount,
			[TraceDetailEventKeys.TraceDurationMs]:
				summary.endTimestampMillis - summary.startTimestampMillis,
			[TraceDetailEventKeys.HadErrors]: summary.totalErrorSpansCount > 0,
			[TraceDetailEventKeys.SpanPanelVariant]: spanPanelVariant,
		});
	}, [traceId, hasSpans, summary, spanPanelVariant, firedForRef, logTraceEvent]);
}
