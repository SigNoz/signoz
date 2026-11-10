import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

/**
 * Section collapse state — frontend-only and persisted to localStorage. Keyed by
 * dashboardId → section stable id → open. An absent entry means "open" (the
 * default). This is intentionally NOT server state: collapse is a per-user UI
 * preference, so it lives here instead of in the dashboard spec.
 */
export interface CollapseSlice {
	collapsed: Record<string, Record<string, boolean>>;
	toggleSectionCollapse: (dashboardId: string, sectionId: string) => void;
	// Whether the variables bar shows its full (expanded) list, per dashboard.
	// Absent → collapsed (the default).
	variablesExpanded: Record<string, boolean>;
	setVariablesExpanded: (dashboardId: string, expanded: boolean) => void;
}

export const createCollapseSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	CollapseSlice
> = (set, get) => ({
	collapsed: {},
	toggleSectionCollapse: (dashboardId, sectionId): void => {
		const { collapsed } = get();
		const current = collapsed[dashboardId]?.[sectionId];
		// Absent → open by default, so the first toggle closes it.
		const next = current === undefined ? false : !current;
		set({
			collapsed: {
				...collapsed,
				[dashboardId]: { ...collapsed[dashboardId], [sectionId]: next },
			},
		});
	},
	variablesExpanded: {},
	setVariablesExpanded: (dashboardId, expanded): void => {
		const { variablesExpanded } = get();
		set({
			variablesExpanded: { ...variablesExpanded, [dashboardId]: expanded },
		});
	},
});

/** Selector: is the variables bar expanded for this dashboard? Default collapsed. */
export const selectVariablesExpanded =
	(dashboardId: string) =>
	(state: DashboardStore): boolean =>
		Boolean(state.variablesExpanded[dashboardId]);
