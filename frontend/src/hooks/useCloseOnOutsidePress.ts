import {
	PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
} from 'react';

/**
 * Calls `onClose` on any press outside the elements given the returned handler as
 * `onPointerDownCapture`. Menus and dialogs rendered in portals still count as
 * inside: React events follow the component tree.
 *
 * The document listener runs in the capture phase, so an outside element that
 * stops propagation still closes. It runs before React marks the press, so the
 * check waits for the dispatch to finish.
 */
export function useCloseOnOutsidePress(
	enabled: boolean,
	onClose: () => void,
): (event: ReactPointerEvent) => void {
	const insidePress = useRef<Event | null>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const timeouts = new Set<ReturnType<typeof setTimeout>>();

		const handlePointerDown = (event: PointerEvent): void => {
			const timeout = setTimeout(() => {
				timeouts.delete(timeout);
				if (insidePress.current !== event) {
					onCloseRef.current();
				}
			});
			timeouts.add(timeout);
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		return (): void => {
			document.removeEventListener('pointerdown', handlePointerDown, true);
			timeouts.forEach(clearTimeout);
		};
	}, [enabled]);

	return useCallback((event: ReactPointerEvent): void => {
		insidePress.current = event.nativeEvent;
	}, []);
}
