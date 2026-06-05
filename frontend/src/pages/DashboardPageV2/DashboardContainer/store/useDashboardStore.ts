import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
	createEditContextSlice,
	type EditContextSlice,
} from './slices/editContextSlice';
import {
	createCollapseSlice,
	type CollapseSlice,
} from './slices/collapseSlice';

export type DashboardStore = EditContextSlice & CollapseSlice;

/**
 * V2 dashboard session store. Holds cross-cutting client state only — never the
 * dashboard spec (that stays in react-query via useGetDashboardV2). Two slices:
 * - edit-context: dashboardId / isEditable / refetch (set once, not persisted).
 * - collapse: per-section open state (frontend-only, persisted to localStorage).
 */
export const useDashboardStore = create<DashboardStore>()(
	persist(
		(...a) => ({
			...createEditContextSlice(...a),
			...createCollapseSlice(...a),
		}),
		{
			name: '@signoz/dashboard-v2',
			// Persist only the collapse map — context (incl. the refetch fn) is transient.
			partialize: (state) => ({ collapsed: state.collapsed }),
		},
	),
);

/** Selector: is a section open? Absent entry (or no dashboard) → open by default. */
export const selectIsSectionOpen =
	(dashboardId: string, sectionId: string) =>
	(state: DashboardStore): boolean => {
		if (!dashboardId) {
			return true;
		}
		const value = state.collapsed[dashboardId]?.[sectionId];
		return value === undefined ? true : value;
	};
