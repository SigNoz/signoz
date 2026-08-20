import { RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Reports whether a line-clamped element is actually cut off, so a tooltip can
 * be offered only when it has something to add.
 *
 * Typography's `truncate` clamps with `-webkit-line-clamp` on a `-webkit-box`,
 * which wraps the text and hides the overflow vertically — so the signal is
 * scrollHeight, not scrollWidth.
 */
export function useIsTextClamped(
	ref: RefObject<HTMLElement>,
	text: string,
): boolean {
	const [isClamped, setIsClamped] = useState(false);

	const measure = useCallback((): void => {
		const element = ref.current;
		if (element) {
			setIsClamped(element.scrollHeight > element.clientHeight);
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
		// isClamped re-runs this so the observer re-attaches to the element that
		// wrapping in a tooltip trigger replaced
	}, [ref, measure, text, isClamped]);

	return isClamped;
}
