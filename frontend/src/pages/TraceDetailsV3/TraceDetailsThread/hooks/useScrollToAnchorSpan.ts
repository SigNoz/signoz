import { RefObject, useEffect, useRef } from 'react';

/** Scrolls the anchor span's card into view once, after it first renders. */
export function useScrollToAnchorSpan(
	containerRef: RefObject<HTMLElement>,
	anchorSpanId: string | undefined,
	isAnchorLoaded: boolean,
): void {
	const scrolledForRef = useRef<string>();

	useEffect(() => {
		if (
			!anchorSpanId ||
			!isAnchorLoaded ||
			scrolledForRef.current === anchorSpanId
		) {
			return;
		}
		const card = containerRef.current?.querySelector<HTMLElement>(
			`[data-span-id="${CSS.escape(anchorSpanId)}"]`,
		);
		if (card) {
			scrolledForRef.current = anchorSpanId;
			card.scrollIntoView({ block: 'start' });
		}
	}, [containerRef, anchorSpanId, isAnchorLoaded]);
}
