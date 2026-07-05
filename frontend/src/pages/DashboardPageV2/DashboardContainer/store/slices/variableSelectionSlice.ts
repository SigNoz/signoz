import type { Querybuildertypesv5QueryRangeRequestDTOVariables } from 'api/generated/services/sigNoz.schemas';
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
 *
 * `resolvedVariables` is the same selection resolved into the V5 query payload
 * shape (`{ name: { type, value } }`), published by `useResolvedVariables` so
 * `usePanelQuery` reads it without threading the dashboard spec down the tree
 * (the edit-context publish pattern). Transient — not persisted (it is derived
 * from `variableValues` + the spec on every load).
 */
export interface VariableSelectionSlice {
	variableValues: Record<string, VariableSelectionMap>;
	resolvedVariables: Record<
		string,
		Querybuildertypesv5QueryRangeRequestDTOVariables
	>;
	setVariableValue: (
		dashboardId: string,
		name: string,
		selection: VariableSelection,
	) => void;
	/** Bulk set (used to seed from URL/localStorage/defaults on load). */
	setVariableValues: (dashboardId: string, values: VariableSelectionMap) => void;
	/** Publish the resolved V5 variables payload for a dashboard. */
	setResolvedVariables: (
		dashboardId: string,
		variables: Querybuildertypesv5QueryRangeRequestDTOVariables,
	) => void;
}

export const createVariableSelectionSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	VariableSelectionSlice
> = (set, get) => ({
	variableValues: {},
	resolvedVariables: {},
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
	setResolvedVariables: (dashboardId, variables): void => {
		const { resolvedVariables } = get();
		set({
			resolvedVariables: { ...resolvedVariables, [dashboardId]: variables },
		});
	},
});

/**
 * Stable empty map for dashboards with no stored selections. Returning an inline
 * `{}` here would hand zustand's useSyncExternalStore a new reference every call,
 * which it reads as a changed snapshot → infinite re-render loop.
 */
const EMPTY_SELECTION_MAP: VariableSelectionMap = {};

/** Selector: the selection map for a dashboard (empty if none). */
export const selectVariableValues =
	(dashboardId: string) =>
	(state: DashboardStore): VariableSelectionMap =>
		state.variableValues[dashboardId] ?? EMPTY_SELECTION_MAP;

/** Stable empty payload — same rationale as {@link EMPTY_SELECTION_MAP}. */
const EMPTY_RESOLVED_VARIABLES: Querybuildertypesv5QueryRangeRequestDTOVariables =
	{};

/** Selector: the resolved V5 variables payload for a dashboard (empty if none). */
export const selectResolvedVariables =
	(dashboardId: string) =>
	(state: DashboardStore): Querybuildertypesv5QueryRangeRequestDTOVariables =>
		state.resolvedVariables[dashboardId] ?? EMPTY_RESOLVED_VARIABLES;
