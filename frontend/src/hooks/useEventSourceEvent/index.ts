import { useEffect } from 'react';
import { EventListener, EventSourceEventMap } from 'event-source-polyfill';
import { useEventSource } from 'providers/EventSource';

type EventMap = {
	message: MessageEvent;
	open: Event;
	error: Event;
};

export const useEventSourceEvent = <T extends keyof EventSourceEventMap>(
	eventName: T,
	listener: (event: EventMap[T]) => void,
): void => {
	const { eventSourceInstance } = useEventSource();

	useEffect(() => {
		if (eventSourceInstance) {
			eventSourceInstance.addEventListener(eventName, listener as EventListener);
		}

		return (): void => {
			if (eventSourceInstance) {
				eventSourceInstance.removeEventListener(
					eventName,
					listener as EventListener,
				);
			}
		};
	}, [eventName, eventSourceInstance, listener]);
};
