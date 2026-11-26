import { MutableRefObject, useEffect } from 'react';
import { useGetTraceSummary } from 'api/generated/services/tracedetail';

import { TraceDetailEvents } from '../../events';
import { TraceDetailLogEvent } from '../../hooks/useTraceDetailLogEvent';
import { SpanDetailVariant } from '../../SpanDetailsPanel/constants';
import {
	getThreadDataLoadedEventAttributes,
	getThreadEmptyWithAiEventAttributes,
} from '../utils';

interface ThreadLoadedEventsArgs {
	traceId: string;
	interestedSpanId?: string;
	hasSpans: boolean;
	hasNoThread: boolean;
	spanPanelVariant: SpanDetailVariant;
	dataLoadedFiredForRef: MutableRefObject<string>;
	threadEmptyFiredForRef: MutableRefObject<string>;
	logTraceEvent: TraceDetailLogEvent;
}

export function useThreadLoadedEvents({
	traceId,
	interestedSpanId,
	hasSpans,
	hasNoThread,
	spanPanelVariant,
	dataLoadedFiredForRef,
	threadEmptyFiredForRef,
	logTraceEvent,
}: ThreadLoadedEventsArgs): void {
	// No keepPreviousData: a previous trace's summary must not be reported for this one.
	const { data } = useGetTraceSummary(
		{ traceID: traceId },
		{ query: { enabled: !!traceId, refetchOnMount: false } },
	);
	const summary = data?.data;

	useEffect(() => {
		if (!traceId || !summary) {
			return;
		}
		// Not exclusive: an errored thread can still hold spans, so each event keeps its own ref.
		if (hasSpans && dataLoadedFiredForRef.current !== traceId) {
			dataLoadedFiredForRef.current = traceId;
			logTraceEvent(
				TraceDetailEvents.DataLoaded,
				getThreadDataLoadedEventAttributes(summary, spanPanelVariant),
			);
		}
		if (hasNoThread && summary.ai && threadEmptyFiredForRef.current !== traceId) {
			threadEmptyFiredForRef.current = traceId;
			logTraceEvent(
				TraceDetailEvents.ThreadEmptyWithAiSummary,
				getThreadEmptyWithAiEventAttributes(summary, interestedSpanId),
			);
		}
	}, [
		traceId,
		interestedSpanId,
		hasSpans,
		hasNoThread,
		summary,
		spanPanelVariant,
		dataLoadedFiredForRef,
		threadEmptyFiredForRef,
		logTraceEvent,
	]);
}
