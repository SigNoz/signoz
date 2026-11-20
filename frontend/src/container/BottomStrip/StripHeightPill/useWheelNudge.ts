import { RefObject, useEffect } from 'react';

/** Each wheel tick over `ref` nudges by 1: up grows, down shrinks. */
export function useWheelNudge(
	ref: RefObject<HTMLElement>,
	nudge: (delta: number) => void,
): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return undefined;
		}

		const onWheel = (event: WheelEvent): void => {
			// React's onWheel is passive, so the page would scroll too.
			event.preventDefault();
			nudge(event.deltaY < 0 ? 1 : -1);
		};

		element.addEventListener('wheel', onWheel, { passive: false });
		return (): void => element.removeEventListener('wheel', onWheel);
	}, [ref, nudge]);
}
