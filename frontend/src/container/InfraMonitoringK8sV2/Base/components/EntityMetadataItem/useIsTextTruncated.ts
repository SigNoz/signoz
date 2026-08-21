import { RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Reports whether a single-line, ellipsised element is actually cut off, so a
 * tooltip can be offered only when it has something to add.
 */
export function useIsTextTruncated(
	ref: RefObject<HTMLElement>,
	text: string,
): boolean {
	const [isTruncated, setIsTruncated] = useState(false);

	const measure = useCallback((): void => {
		const element = ref.current;
		if (element) {
			setIsTruncated(element.scrollWidth > element.clientWidth);
		}
	}, [ref]);

	useEffect(() => {
		measure();

		const element = ref.current;
		if (!element || typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return (): void => observer.disconnect();
		// isTruncated re-runs this so the observer re-attaches to the element that
		// wrapping in a tooltip trigger replaced
	}, [ref, measure, text, isTruncated]);

	return isTruncated;
}
