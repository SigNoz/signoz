import { create } from 'zustand';

/**
 * Ephemeral cross-route signal: the panel editor records which panel to reveal
 * on the way back, and the dashboard grid scrolls that panel into view once it
 * mounts, then clears the id. Kept out of `useDashboardStore` (never persisted)
 * and off the URL so a refresh doesn't re-trigger the scroll.
 */
export interface ScrollToPanelStore {
	scrollToPanelId: string | null;
	setScrollToPanelId: (panelId: string | null) => void;
}

export const useScrollToPanelStore = create<ScrollToPanelStore>((set) => ({
	scrollToPanelId: null,
	setScrollToPanelId: (scrollToPanelId): void => {
		set({ scrollToPanelId });
	},
}));
