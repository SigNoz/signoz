import type { StateCreator } from 'zustand';

import type {
	VariableSelection,
	VariableSelectionMap,
} from '../../VariablesBar/selectionTypes';
import type { DashboardStore } from '../useDashboardStore';

/**
 * Runtime variable selection — the values the user picks in the variable bar.
 * Keyed by dashboardId → variable name. Frontend-only and persisted to
 * localStorage (mirrored to the URL by the bar for shareable links); it is
 * deliberately NOT part of the dashboard spec, so selecting a value never
 * patches the dashboard.
 */
export interface VariableSelectionSlice {
	variableValues: Record<string, VariableSelectionMap>;
	setVariableValue: (
		dashboardId: string,
		name: string,
		selection: VariableSelection,
	) => void;
	/** Bulk set (used to seed from URL/localStorage/defaults on load). */
	setVariableValues: (dashboardId: string, values: VariableSelectionMap) => void;
}

export const createVariableSelectionSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	VariableSelectionSlice
> = (set, get) => ({
	variableValues: {},
	setVariableValue: (dashboardId, name, selection): void => {
		const { variableValues } = get();
		set({
			variableValues: {
				...variableValues,
				[dashboardId]: { ...variableValues[dashboardId], [name]: selection },
			},
		});
	},
	setVariableValues: (dashboardId, values): void => {
		const { variableValues } = get();
		set({
			variableValues: { ...variableValues, [dashboardId]: values },
		});
	},
});

/** Selector: the selection map for a dashboard (empty if none). */
export const selectVariableValues =
	(dashboardId: string) =>
	(state: DashboardStore): VariableSelectionMap =>
		state.variableValues[dashboardId] ?? {};
