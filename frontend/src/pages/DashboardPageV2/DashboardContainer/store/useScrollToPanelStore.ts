import { create } from 'zustand';

/**
 * Ephemeral reveal signal: a flow records a panel/section id here and the matching
 * component scrolls itself into view on mount (see `useScrollPanelIntoView` /
 * `useScrollSectionIntoView`), then clears it. Kept off `useDashboardStore` and the
 * URL so a refresh doesn't re-trigger the scroll.
 */
export interface ScrollToPanelStore {
	scrollToPanelId: string | null;
	setScrollToPanelId: (panelId: string | null) => void;
	scrollToSectionId: string | null;
	setScrollToSectionId: (sectionId: string | null) => void;
}

export const useScrollToPanelStore = create<ScrollToPanelStore>((set) => ({
	scrollToPanelId: null,
	setScrollToPanelId: (scrollToPanelId): void => {
		set({ scrollToPanelId });
	},
	scrollToSectionId: null,
	setScrollToSectionId: (scrollToSectionId): void => {
		set({ scrollToSectionId });
	},
}));
