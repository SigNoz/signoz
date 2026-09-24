import { create } from 'zustand';

/**
 * One-shot reveal signal: a flow records the id of the panel/section to reveal and the
 * matching component scrolls itself into view on mount (see `useScrollIntoView`), then
 * clears it. Panel and section ids share this slot — they're in disjoint namespaces
 * (`sec-*` vs UUIDs). Kept off `useDashboardStore`/the URL so a refresh doesn't re-fire it.
 */
export interface ScrollIntoViewStore {
	scrollTargetId: string | null;
	setScrollTargetId: (id: string | null) => void;
}

export const useScrollIntoViewStore = create<ScrollIntoViewStore>((set) => ({
	scrollTargetId: null,
	setScrollTargetId: (scrollTargetId): void => {
		set({ scrollTargetId });
	},
}));
