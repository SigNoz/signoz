import { RefObject, useEffect } from 'react';

import { useScrollIntoViewStore } from '../../../store/useScrollIntoViewStore';

/**
 * Scrolls this panel/section into view when the store targets its id, then clears the
 * request so it fires once. Runs on mount, so it catches the element as the grid renders it.
 */
export function useScrollIntoView(
	id: string,
	ref: RefObject<HTMLElement>,
	block: ScrollLogicalPosition = 'center',
): void {
	const scrollTargetId = useScrollIntoViewStore((s) => s.scrollTargetId);
	const setScrollTargetId = useScrollIntoViewStore((s) => s.setScrollTargetId);

	useEffect(() => {
		if (scrollTargetId !== id) {
			return;
		}
		ref.current?.scrollIntoView({ behavior: 'smooth', block });
		setScrollTargetId(null);
	}, [scrollTargetId, id, ref, block, setScrollTargetId]);
}
