import { RefObject, useEffect } from 'react';

import { useScrollToPanelStore } from '../../../store/useScrollToPanelStore';

/**
 * Scrolls this panel into view when the store requests it (e.g. returning from
 * the editor or after creating a panel), then clears the request so it fires
 * once. Runs on mount, so it catches the panel as soon as the grid renders it.
 */
export function useScrollPanelIntoView(
	panelId: string,
	ref: RefObject<HTMLElement>,
): void {
	const scrollToPanelId = useScrollToPanelStore((s) => s.scrollToPanelId);
	const setScrollToPanelId = useScrollToPanelStore((s) => s.setScrollToPanelId);

	useEffect(() => {
		if (scrollToPanelId !== panelId) {
			return;
		}
		ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		setScrollToPanelId(null);
	}, [scrollToPanelId, panelId, ref, setScrollToPanelId]);
}
