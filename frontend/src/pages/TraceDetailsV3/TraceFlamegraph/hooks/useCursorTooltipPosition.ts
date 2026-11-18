import { RefObject, useLayoutEffect, useRef } from 'react';

const CURSOR_OFFSET = 15;

interface CursorAnchor {
	clientX: number;
	clientY: number;
}

function resolveAxis(cursor: number, size: number, viewport: number): number {
	const after = cursor + CURSOR_OFFSET;
	if (after + size <= viewport) {
		return after;
	}
	return Math.max(0, cursor - CURSOR_OFFSET - size);
}

/** Places a fixed element beside the cursor, flipping sides when it would overflow the viewport. */
export function useCursorTooltipPosition<T extends HTMLElement>(
	anchor: CursorAnchor | null,
): RefObject<T> {
	const ref = useRef<T>(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el || !anchor) {
			return;
		}
		const left = resolveAxis(anchor.clientX, el.offsetWidth, window.innerWidth);
		const top = resolveAxis(anchor.clientY, el.offsetHeight, window.innerHeight);
		el.style.left = `${left}px`;
		el.style.top = `${top}px`;
	}, [anchor]);

	return ref;
}
