import { useCallback, useEffect, useRef } from 'react';

/**
 * Calls `onClose` on any press outside the element given the returned handler as
 * `onPointerDownCapture`. Menus and dialogs rendered in portals still count as
 * inside: React events follow the component tree, so their presses reach the
 * handler before the document listener runs.
 */
export function useCloseOnOutsidePress(
	enabled: boolean,
	onClose: () => void,
): () => void {
	const isPressInside = useRef(false);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		isPressInside.current = false;

		const handlePointerDown = (): void => {
			if (isPressInside.current) {
				isPressInside.current = false;
				return;
			}
			onCloseRef.current();
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return (): void =>
			document.removeEventListener('pointerdown', handlePointerDown);
	}, [enabled]);

	return useCallback((): void => {
		isPressInside.current = true;
	}, []);
}
