import { RefObject, useEffect } from 'react';

import { useScrollToPanelStore } from '../../../store/useScrollToPanelStore';

/**
 * Section-level twin of `useScrollPanelIntoView`: a newly added section has no
 * panel to target, so it reveals itself when the store requests its id.
 */
export function useScrollSectionIntoView(
	sectionId: string,
	ref: RefObject<HTMLElement>,
): void {
	const scrollToSectionId = useScrollToPanelStore((s) => s.scrollToSectionId);
	const setScrollToSectionId = useScrollToPanelStore(
		(s) => s.setScrollToSectionId,
	);

	useEffect(() => {
		if (scrollToSectionId !== sectionId) {
			return;
		}
		ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		setScrollToSectionId(null);
	}, [scrollToSectionId, sectionId, ref, setScrollToSectionId]);
}
