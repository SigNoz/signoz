import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';

// Most-recently-viewed list is capped so it stays a useful shortlist.
const RECENT_LIMIT = 20;

// Client-side persistence for the parts of the views feature that aren't backed
// by an API: recently-viewed dashboard ids and the rail collapse preference.
// (Saved views are org-shared via the Views API — see `useSavedViews`; pinning
// is server-side per-user — see `usePinDashboard`.)
interface DashboardViewsState {
	recent: string[]; // dashboard ids, most-recent first
	railCollapsed: boolean;
	markViewed: (id: string) => void;
	setRailCollapsed: (collapsed: boolean) => void;
}

const DEFAULT_STATE = {
	recent: [] as string[],
	railCollapsed: false,
};

export const useDashboardViewsStore = create<DashboardViewsState>()(
	persist(
		(set) => ({
			...DEFAULT_STATE,
			markViewed: (id): void => {
				set((s) => ({
					recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT),
				}));
			},
			setRailCollapsed: (collapsed): void => {
				set({ railCollapsed: collapsed });
			},
		}),
		{
			name: LOCALSTORAGE.DASHBOARDS_LIST_VIEWS,
			merge: (persisted, current) => ({
				...current,
				...DEFAULT_STATE,
				...((persisted as Partial<DashboardViewsState>) ?? {}),
			}),
		},
	),
);
