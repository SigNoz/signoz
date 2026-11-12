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
import {
	createVariableSelectionSlice,
	type VariableSelectionSlice,
} from './slices/variableSelectionSlice';
import {
	createVariableFetchSlice,
	type VariableFetchSlice,
} from './slices/variableFetchSlice';
import {
	createSettingsRequestSlice,
	type SettingsRequestSlice,
} from './slices/settingsRequestSlice';

export type DashboardStore = EditContextSlice &
	CollapseSlice &
	VariableSelectionSlice &
	VariableFetchSlice &
	SettingsRequestSlice;

/**
 * V2 dashboard session store. Holds cross-cutting client state only — never the
 * dashboard spec (that stays in react-query via useGetDashboardV2). Slices:
 * - edit-context: dashboardId / isEditable / refetch (set once, not persisted).
 * - collapse: per-section open state (frontend-only, persisted to localStorage).
 * - variable-selection: runtime variable values (frontend-only, persisted).
 */
/** A page re-supplies its values on every mount, so they're never saved. */
function withoutPageVariables(
	state: DashboardStore,
): DashboardStore['variableValues'] {
	const names = Object.keys(state.pageVariables);
	const current = state.variableValues[state.dashboardId];
	if (names.length === 0 || !current) {
		return state.variableValues;
	}
	return {
		...state.variableValues,
		[state.dashboardId]: Object.fromEntries(
			Object.entries(current).filter(([name]) => !names.includes(name)),
		),
	};
}

export const useDashboardStore = create<DashboardStore>()(
	persist(
		(...a) => ({
			...createEditContextSlice(...a),
			...createCollapseSlice(...a),
			...createVariableSelectionSlice(...a),
			...createVariableFetchSlice(...a),
			...createSettingsRequestSlice(...a),
		}),
		{
			name: '@signoz/dashboard-v2',
			// Persist UI-only state (context incl. the refetch fn is transient).
			partialize: (state) => ({
				collapsed: state.collapsed,
				variablesExpanded: state.variablesExpanded,
				variableValues: withoutPageVariables(state),
			}),
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
