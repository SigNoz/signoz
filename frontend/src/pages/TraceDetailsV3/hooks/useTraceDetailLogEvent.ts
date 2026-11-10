import { useCallback, useRef } from 'react';
import logEvent from 'api/common/logEvent';

import {
	TraceDetailEventKeys,
	TraceDetailEvents,
	TraceDetailView,
} from '../events';

export type TraceDetailLogEvent = (
	event: TraceDetailEvents,
	attributes?: Record<string, unknown>,
) => void;

export function useTraceDetailLogEvent(
	view: TraceDetailView,
	traceId: string,
): TraceDetailLogEvent {
	const contextRef = useRef({ view, traceId });
	contextRef.current = { view, traceId };

	return useCallback(
		(
			event: TraceDetailEvents,
			attributes: Record<string, unknown> = {},
		): void => {
			try {
				void logEvent(event, {
					[TraceDetailEventKeys.View]: contextRef.current.view,
					[TraceDetailEventKeys.TraceId]: contextRef.current.traceId,
					...attributes,
				});
			} catch {
				// No-op. Logging must never throw into the UI.
			}
		},
		[],
	);
}
