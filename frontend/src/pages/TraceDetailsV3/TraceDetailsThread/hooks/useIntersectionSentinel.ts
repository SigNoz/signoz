import { RefObject, useEffect } from 'react';

const ROOT_MARGIN = '200px 0px';

/** Calls `onVisible` while enabled and the sentinel is within reach of the container's viewport. */
export function useIntersectionSentinel(
	containerRef: RefObject<HTMLElement>,
	sentinelRef: RefObject<HTMLElement>,
	isEnabled: boolean,
	onVisible: () => void,
): void {
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!isEnabled || !sentinel) {
			return undefined;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					onVisible();
				}
			},
			{ root: containerRef.current, rootMargin: ROOT_MARGIN },
		);
		observer.observe(sentinel);
		return (): void => observer.disconnect();
	}, [containerRef, sentinelRef, isEnabled, onVisible]);
}
