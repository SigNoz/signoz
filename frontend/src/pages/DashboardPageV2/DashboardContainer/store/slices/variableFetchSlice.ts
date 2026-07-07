import type { StateCreator } from 'zustand';

import type { VariableFetchContext } from '../../VariablesBar/variableDependencies';
import type { DashboardStore } from '../useDashboardStore';
import {
	areAllQueryVariablesSettled,
	type FetchMaps,
	isSettled,
	resolveFetchState,
	unlockWaitingDynamicVariables,
	VariableFetchState,
} from './variableFetchSlice.utils';

export { VariableFetchState } from './variableFetchSlice.utils';

/**
 * Runtime fetch orchestration for dashboard variables — native port of V1's
 * `variableFetchStore`. Decides WHEN each variable's options fetch: query
 * variables in dependency order, dynamics together once query values exist,
 * text/custom never. `cycleIds` is a per-variable request nonce keyed into each
 * selector's react-query key (bump = fresh fetch, auto-cancel stale). Transient.
 * `enqueueFetchAll` = load/time change; `enqueueDescendants` = one value changed.
 */
export interface VariableFetchSlice {
	variableFetchStates: Record<string, VariableFetchState>;
	variableLastUpdated: Record<string, number>;
	variableCycleIds: Record<string, number>;
	/** Static dependency context, set by `initVariableFetch` (null before init). */
	variableFetchContext: VariableFetchContext | null;

	/** Seed state entries for the current variable set and store the context. */
	initVariableFetch: (names: string[], context: VariableFetchContext) => void;
	/** Start a full fetch cycle for every fetchable variable (load / time change). */
	enqueueFetchAll: (doAllQueryVariablesHaveValuesSelected: boolean) => void;
	/** Mark a variable's fetch as done; unblock its waiting children / dynamics. */
	onVariableFetchComplete: (name: string) => void;
	/** Mark a variable's fetch as failed; idle its query descendants. */
	onVariableFetchFailure: (name: string) => void;
	/** Cascade a value change to a variable's query descendants + the dynamics. */
	enqueueDescendants: (name: string) => void;
	/**
	 * Batched value-change cascade: refresh the union of the given variables'
	 * query descendants plus the dynamics, each exactly once. Used to collapse the
	 * initial burst of auto-selections into a single downstream fetch.
	 */
	enqueueDescendantsBatch: (names: string[]) => void;
}

/** Snapshot the three fetch maps into mutable clones for a single action. */
function cloneMaps(state: DashboardStore): FetchMaps {
	return {
		states: { ...state.variableFetchStates },
		lastUpdated: { ...state.variableLastUpdated },
		cycleIds: { ...state.variableCycleIds },
	};
}

export const createVariableFetchSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	VariableFetchSlice
> = (set, get) => ({
	variableFetchStates: {},
	variableLastUpdated: {},
	variableCycleIds: {},
	variableFetchContext: null,

	initVariableFetch: (names, context): void => {
		const maps = cloneMaps(get());
		// Initialize new variables to idle, preserving existing states.
		names.forEach((name) => {
			if (!maps.states[name]) {
				maps.states[name] = VariableFetchState.Idle;
			}
		});
		// Drop entries for variables that no longer exist.
		const nameSet = new Set(names);
		Object.keys(maps.states).forEach((name) => {
			if (!nameSet.has(name)) {
				delete maps.states[name];
				delete maps.lastUpdated[name];
				delete maps.cycleIds[name];
			}
		});
		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
			variableFetchContext: context,
		});
	},

	enqueueFetchAll: (doAllQueryVariablesHaveValuesSelected): void => {
		const { variableFetchContext } = get();
		if (!variableFetchContext) {
			return;
		}
		const {
			dependencyData,
			variableTypes,
			queryVariableOrder,
			dynamicVariableOrder,
		} = variableFetchContext;
		const maps = cloneMaps(get());

		// Query variables: roots start immediately, dependents wait for parents.
		queryVariableOrder.forEach((name) => {
			maps.cycleIds[name] = (maps.cycleIds[name] || 0) + 1;
			const parents = dependencyData.parentGraph[name] || [];
			const hasQueryParents = parents.some((p) => variableTypes[p] === 'QUERY');
			maps.states[name] = hasQueryParents
				? VariableFetchState.Waiting
				: resolveFetchState(maps, name);
		});

		// Dynamic variables: start now if query variables already have values,
		// otherwise wait until the query variables settle.
		dynamicVariableOrder.forEach((name) => {
			maps.cycleIds[name] = (maps.cycleIds[name] || 0) + 1;
			maps.states[name] = doAllQueryVariablesHaveValuesSelected
				? resolveFetchState(maps, name)
				: VariableFetchState.Waiting;
		});

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
		});
	},

	onVariableFetchComplete: (name): void => {
		const { variableFetchContext } = get();
		const maps = cloneMaps(get());
		maps.states[name] = VariableFetchState.Idle;
		maps.lastUpdated[name] = Date.now();

		if (variableFetchContext) {
			const { dependencyData, variableTypes, dynamicVariableOrder } =
				variableFetchContext;
			// Unblock waiting query-type children.
			(dependencyData.graph[name] || []).forEach((child) => {
				if (
					variableTypes[child] === 'QUERY' &&
					maps.states[child] === VariableFetchState.Waiting
				) {
					maps.states[child] = resolveFetchState(maps, child);
				}
			});
			// Once all query variables settle, unlock any waiting dynamics.
			if (
				variableTypes[name] === 'QUERY' &&
				areAllQueryVariablesSettled(maps.states, variableTypes)
			) {
				unlockWaitingDynamicVariables(maps, dynamicVariableOrder);
			}
		}

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
		});
	},

	onVariableFetchFailure: (name): void => {
		const { variableFetchContext } = get();
		const maps = cloneMaps(get());
		maps.states[name] = VariableFetchState.Error;

		if (variableFetchContext) {
			const { dependencyData, variableTypes, dynamicVariableOrder } =
				variableFetchContext;
			// Query descendants can't proceed without this parent — idle them.
			(dependencyData.transitiveDescendants[name] || []).forEach((desc) => {
				if (variableTypes[desc] === 'QUERY') {
					maps.states[desc] = VariableFetchState.Idle;
				}
			});
			if (
				variableTypes[name] === 'QUERY' &&
				areAllQueryVariablesSettled(maps.states, variableTypes)
			) {
				unlockWaitingDynamicVariables(maps, dynamicVariableOrder);
			}
		}

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
		});
	},

	enqueueDescendants: (name): void => {
		get().enqueueDescendantsBatch([name]);
	},

	enqueueDescendantsBatch: (names): void => {
		const { variableFetchContext } = get();
		if (!variableFetchContext || names.length === 0) {
			return;
		}
		const { dependencyData, variableTypes, dynamicVariableOrder } =
			variableFetchContext;
		const maps = cloneMaps(get());

		// Union of the changed variables' query descendants, refreshed once each:
		// refetch when all their parents are settled, else wait.
		const queryDescendants = new Set<string>();
		names.forEach((name) => {
			(dependencyData.transitiveDescendants[name] || []).forEach((desc) => {
				if (variableTypes[desc] === 'QUERY') {
					queryDescendants.add(desc);
				}
			});
		});
		queryDescendants.forEach((desc) => {
			maps.cycleIds[desc] = (maps.cycleIds[desc] || 0) + 1;
			const parents = dependencyData.parentGraph[desc] || [];
			const allParentsSettled = parents.every((p) => isSettled(maps.states[p]));
			maps.states[desc] = allParentsSettled
				? resolveFetchState(maps, desc)
				: VariableFetchState.Waiting;
		});

		// Dynamics implicitly depend on all query values: refetch now if the query
		// variables are settled, otherwise wait for them.
		dynamicVariableOrder.forEach((dynName) => {
			maps.cycleIds[dynName] = (maps.cycleIds[dynName] || 0) + 1;
			maps.states[dynName] = areAllQueryVariablesSettled(
				maps.states,
				variableTypes,
			)
				? resolveFetchState(maps, dynName)
				: VariableFetchState.Waiting;
		});

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
		});
	},
});

/** Selector: the fetch state for a single variable (defaults to idle). */
export const selectVariableFetchState =
	(name: string) =>
	(state: DashboardStore): VariableFetchState =>
		state.variableFetchStates[name] ?? VariableFetchState.Idle;

/** Selector: the current fetch cycle id for a single variable (defaults to 0). */
export const selectVariableCycleId =
	(name: string) =>
	(state: DashboardStore): number =>
		state.variableCycleIds[name] ?? 0;

/** Selector: whether a variable has completed at least one fetch. */
export const selectVariableFetchedOnce =
	(name: string) =>
	(state: DashboardStore): boolean =>
		(state.variableLastUpdated[name] ?? 0) > 0;
