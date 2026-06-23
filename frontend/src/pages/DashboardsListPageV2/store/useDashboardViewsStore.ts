import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';

import type { SavedView } from '../types';

// Most-recently-viewed list is capped so it stays a useful shortlist.
const RECENT_LIMIT = 20;

// Client-side persistence for everything the views feature owns until the views
// API lands: user-saved views, favorite/recently-viewed dashboard ids, and the
// rail collapse preference. Mirrors `useDashboardsListVisibleColumnsStore`.
interface DashboardViewsState {
	customViews: SavedView[];
	favorites: string[]; // dashboard ids
	recent: string[]; // dashboard ids, most-recent first
	railCollapsed: boolean;
	addView: (view: SavedView) => void;
	updateView: (id: string, patch: Partial<Omit<SavedView, 'id'>>) => void;
	deleteView: (id: string) => void;
	toggleFavorite: (id: string) => void;
	markViewed: (id: string) => void;
	setRailCollapsed: (collapsed: boolean) => void;
}

const DEFAULT_STATE = {
	customViews: [] as SavedView[],
	favorites: [] as string[],
	recent: [] as string[],
	railCollapsed: false,
};

export const useDashboardViewsStore = create<DashboardViewsState>()(
	persist(
		(set) => ({
			...DEFAULT_STATE,
			addView: (view): void => {
				set((s) => ({ customViews: [...s.customViews, view] }));
			},
			updateView: (id, patch): void => {
				set((s) => ({
					customViews: s.customViews.map((v) =>
						v.id === id ? { ...v, ...patch } : v,
					),
				}));
			},
			deleteView: (id): void => {
				set((s) => ({ customViews: s.customViews.filter((v) => v.id !== id) }));
			},
			toggleFavorite: (id): void => {
				set((s) => ({
					favorites: s.favorites.includes(id)
						? s.favorites.filter((f) => f !== id)
						: [...s.favorites, id],
				}));
			},
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
