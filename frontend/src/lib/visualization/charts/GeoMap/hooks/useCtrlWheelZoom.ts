import { RefObject, useEffect } from 'react';

/**
 * Wheel zooms only with Ctrl/⌘ held (trackpad pinch sends ctrlKey), so a plain
 * scroll still scrolls the dashboard. Non-passive so the zoom can stop the page
 * from zooming too.
 */
export function useCtrlWheelZoom(
	ref: RefObject<Element>,
	onWheel: (event: WheelEvent) => void,
): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return undefined;
		}
		const handler = (event: Event): void => {
			const wheel = event as WheelEvent;
			if (wheel.ctrlKey || wheel.metaKey) {
				onWheel(wheel);
			}
		};
		element.addEventListener('wheel', handler, { passive: false });
		return (): void => element.removeEventListener('wheel', handler);
	}, [ref, onWheel]);
}
