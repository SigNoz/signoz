import { useEffect, useRef } from 'react';

export type EventHandler<K extends keyof WindowEventMap> = (
	ev: WindowEventMap[K],
) => void;

export function useGlobalEventListener<K extends keyof WindowEventMap>(
	type: K,
	handler: EventHandler<K>,
	options?: AddEventListenerOptions,
): void {
	const savedHandler = useRef<EventHandler<K> | undefined>();

	useEffect(() => {
		savedHandler.current = handler;
	}, [handler]);

	useEffect(() => {
		const eventListener = (event: WindowEventMap[K]): void => {
			if (typeof savedHandler.current === 'function') {
				savedHandler.current(event);
			}
		};

		window.addEventListener(type, eventListener, options);

		return (): void => {
			window.removeEventListener(type, eventListener, options);
		};
	});
}
