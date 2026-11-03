import { useEffect } from 'react';

import { TraceDetailsTab } from '../constants';
import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { TraceDetailLogEvent } from './useTraceDetailLogEvent';

interface SpanDetailsOpenedEventArgs {
	isOpen: boolean;
	spanId: string | undefined;
	detailsTab: TraceDetailsTab;
	logTraceEvent: TraceDetailLogEvent;
}

// Fires once per span shown in the details panel; resets when the panel closes.
export function useSpanDetailsOpenedEvent({
	isOpen,
	spanId,
	detailsTab,
	logTraceEvent,
}: SpanDetailsOpenedEventArgs): void {
	useEffect(() => {
		if (!isOpen || !spanId) {
			return;
		}
		logTraceEvent(TraceDetailEvents.SpanDetailsOpened, {
			[TraceDetailEventKeys.SpanId]: spanId,
			[TraceDetailEventKeys.DetailsTab]: detailsTab,
		});
	}, [isOpen, spanId, detailsTab, logTraceEvent]);
}
