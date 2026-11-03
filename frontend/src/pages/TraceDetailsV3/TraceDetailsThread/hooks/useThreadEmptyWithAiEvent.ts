import { MutableRefObject, useEffect } from 'react';
import { useGetTraceSummary } from 'api/generated/services/tracedetail';

import { TraceDetailEvents } from '../../events';
import { TraceDetailLogEvent } from '../../hooks/useTraceDetailLogEvent';
import { getThreadEmptyWithAiEventAttributes } from '../utils';

interface ThreadEmptyWithAiEventArgs {
	traceId: string;
	interestedSpanId?: string;
	hasNoThread: boolean;
	firedForRef: MutableRefObject<string>;
	logTraceEvent: TraceDetailLogEvent;
}

export function useThreadEmptyWithAiEvent({
	traceId,
	interestedSpanId,
	hasNoThread,
	firedForRef,
	logTraceEvent,
}: ThreadEmptyWithAiEventArgs): void {
	// No keepPreviousData: a previous trace's summary must not be reported for this one.
	const { data } = useGetTraceSummary(
		{ traceID: traceId },
		{ query: { enabled: !!traceId, refetchOnMount: false } },
	);
	const summary = data?.data;

	useEffect(() => {
		if (
			!traceId ||
			firedForRef.current === traceId ||
			!hasNoThread ||
			!summary?.ai
		) {
			return;
		}
		firedForRef.current = traceId;
		logTraceEvent(
			TraceDetailEvents.ThreadEmptyWithAiSummary,
			getThreadEmptyWithAiEventAttributes(summary, interestedSpanId),
		);
	}, [
		traceId,
		interestedSpanId,
		hasNoThread,
		summary,
		firedForRef,
		logTraceEvent,
	]);
}
