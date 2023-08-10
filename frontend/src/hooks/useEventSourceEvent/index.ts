import { EventListener, EventSourceEventMap } from 'event-source-polyfill';
import { useEventSource } from 'providers/EventSource';
import { useEffect } from 'react';

export const useEventSourceEvent = (
	eventName: keyof EventSourceEventMap,
	listener: EventListener,
): void => {
	const { eventSourceInstance } = useEventSource();

	useEffect(() => {
		if (eventSourceInstance) {
			eventSourceInstance.addEventListener(eventName, listener);
		}

		return (): void => {
			if (eventSourceInstance) {
				eventSourceInstance.removeEventListener(eventName, listener);
			}
		};
	}, [eventName, eventSourceInstance, listener]);
};
