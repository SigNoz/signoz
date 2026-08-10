import type { StateCreator } from 'zustand';

import { hasUsableValue } from '../../VariablesBar/utils/selectionUtils';
import type { VariableSelectionMap } from '../../VariablesBar/selectionTypes';
import type { VariableFetchContext } from '../../VariablesBar/utils/variableDependencies';
import type { DashboardStore } from '../useDashboardStore';
import { selectVariableValues } from './variableSelectionSlice';
import {
	type FetchMaps,
	isVariableInActiveFetchState,
	resolveFetchState,
	VariableFetchState,
} from './variableFetchSlice.utils';

/**
 * Whether every QUERY parent of `name` holds a committed value. Gating a child on its
 * parents' *values* (not their settled fetch state) makes it fetch once, after the
 * values commit — not prematurely on fetch-complete and again on value-commit.
 */
function queryParentsHaveValues(
	name: string,
	context: VariableFetchContext,
	selection: VariableSelectionMap,
): boolean {
	const parents = context.dependencyData.parentGraph[name] || [];
	return parents.every(
		(p) =>
			context.variableTypes[p] !== 'QUERY' ||
			hasUsableValue(selection[p], context.variableTypes[p]),
	);
}

export { VariableFetchState } from './variableFetchSlice.utils';

/**
 * Runtime fetch orchestration for dashboard variables — native port of V1's
 * `variableFetchStore`. Decides WHEN each variable's options fetch: query
 * variables in dependency order, dynamics immediately (they are scoped only by
 * sibling dynamic selections, never by query variables, so nothing gates them),
 * text/custom never. `cycleIds` is a per-variable request nonce keyed into each
 * selector's react-query key (bump = fresh fetch, auto-cancel stale). Transient.
 * `enqueueFetchAll` = load/time change; `enqueueDescendants` = one value changed.
 */
export interface VariableFetchSlice {
	variableFetchStates: Record<string, VariableFetchState>;
	variableLastUpdated: Record<string, number>;
	variableCycleIds: Record<string, number>;
	/**
	 * Whether a QUERY/DYNAMIC variable settled its fetch with zero options (so it
	 * will never get a value). Lets a dependent panel fall through to "no data"
	 * instead of waiting forever on a value that isn't coming.
	 */
	variableResolvedEmpty: Record<string, boolean>;
	/** Static dependency context, set by `initVariableFetch` (null before init). */
	variableFetchContext: VariableFetchContext | null;
	/**
	 * Signature (dashboard + time + variable order) of the last full fetch cycle.
	 * A repeat `enqueueFetchAll` with the same signature is skipped, so a component
	 * re-mount can't redo the cycle and double every variable's fetch.
	 */
	lastFetchAllKey: string | null;

	/** Seed state entries for the current variable set and store the context. */
	initVariableFetch: (names: string[], context: VariableFetchContext) => void;
	/**
	 * Clear all transient fetch state on dashboard-page unmount, so a later visit
	 * starts clean instead of inheriting stale state from this app-level store.
	 */
	resetVariableFetch: () => void;
	/** Record whether a variable settled with no options (drives the panel gate). */
	setVariableResolvedEmpty: (name: string, isEmpty: boolean) => void;
	/**
	 * Start a full fetch cycle for every fetchable variable (load / time change).
	 * A repeat call with the same signature `key` is a no-op (idempotent re-mount).
	 */
	enqueueFetchAll: (key?: string) => void;
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
	variableResolvedEmpty: {},
	variableFetchContext: null,
	lastFetchAllKey: null,

	resetVariableFetch: (): void => {
		set({
			variableFetchStates: {},
			variableLastUpdated: {},
			variableCycleIds: {},
			variableResolvedEmpty: {},
			variableFetchContext: null,
			lastFetchAllKey: null,
		});
	},

	setVariableResolvedEmpty: (name, isEmpty): void => {
		const current = get().variableResolvedEmpty;
		if ((current[name] ?? false) === isEmpty) {
			return;
		}
		set({ variableResolvedEmpty: { ...current, [name]: isEmpty } });
	},

	initVariableFetch: (names, context): void => {
		const maps = cloneMaps(get());
		const resolvedEmpty = { ...get().variableResolvedEmpty };
		names.forEach((name) => {
			if (!maps.states[name]) {
				maps.states[name] = VariableFetchState.Idle;
			}
		});
		const nameSet = new Set(names);
		Object.keys(maps.states).forEach((name) => {
			if (!nameSet.has(name)) {
				delete maps.states[name];
				delete maps.lastUpdated[name];
				delete maps.cycleIds[name];
				delete resolvedEmpty[name];
			}
		});
		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
			variableResolvedEmpty: resolvedEmpty,
			variableFetchContext: context,
		});
	},

	enqueueFetchAll: (key): void => {
		// Skip a redundant re-run (re-mount with identical inputs) — else it doubles.
		if (key && key === get().lastFetchAllKey) {
			return;
		}
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

		// Query variables wait only for their QUERY parents. A DYNAMIC parent does not
		// gate: its option fetch feeds only its own dropdown, while its selected value
		// (ALL → `__all__`, or a concrete pick) is already in the selection, so a
		// dependent query substitutes it immediately and refetches via the cascade if
		// it later changes. Text/custom parents resolve synchronously, so nothing waits.
		queryVariableOrder.forEach((name) => {
			maps.cycleIds[name] = (maps.cycleIds[name] || 0) + 1;
			const parents = dependencyData.parentGraph[name] || [];
			const hasQueryParents = parents.some((p) => variableTypes[p] === 'QUERY');
			maps.states[name] = hasQueryParents
				? VariableFetchState.Waiting
				: resolveFetchState(maps, name);
		});

		// Query variables dropped from the dependency order (part of a cycle) would
		// otherwise never fetch — start them as best-effort roots so they surface
		// data/an error instead of sitting empty.
		const orderedQuery = new Set(queryVariableOrder);
		Object.keys(variableTypes).forEach((name) => {
			if (variableTypes[name] === 'QUERY' && !orderedQuery.has(name)) {
				maps.cycleIds[name] = (maps.cycleIds[name] || 0) + 1;
				maps.states[name] = resolveFetchState(maps, name);
			}
		});

		// Dynamic variables fetch immediately, in parallel with the query variables:
		// their options are scoped only by sibling dynamic selections (never by query
		// variables), so there is nothing to wait for. Starting early lets them
		// populate fast even when query variables are slow; a sibling selection change
		// later refetches them via `enqueueDescendantsBatch`.
		dynamicVariableOrder.forEach((name) => {
			maps.cycleIds[name] = (maps.cycleIds[name] || 0) + 1;
			maps.states[name] = resolveFetchState(maps, name);
		});

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
			lastFetchAllKey: key ?? get().lastFetchAllKey,
		});
	},

	onVariableFetchComplete: (name): void => {
		// Ignore a stale/late settle for a variable no longer fetching, so a
		// superseded cycle can't overwrite fresh state (V1 parity).
		if (!isVariableInActiveFetchState(get().variableFetchStates[name])) {
			return;
		}
		const { variableFetchContext } = get();
		const maps = cloneMaps(get());
		maps.states[name] = VariableFetchState.Idle;
		maps.lastUpdated[name] = Date.now();

		if (variableFetchContext) {
			const { dependencyData, variableTypes } = variableFetchContext;
			const selection = selectVariableValues(get().dashboardId)(get());
			// Release a waiting child only if its parents are already valued (e.g. a
			// persisted selection). For a just-fetched parent whose value hasn't committed
			// yet, the value cascade (enqueueDescendantsBatch) unblocks it instead.
			(dependencyData.graph[name] || []).forEach((child) => {
				if (
					variableTypes[child] !== 'QUERY' ||
					maps.states[child] !== VariableFetchState.Waiting
				) {
					return;
				}
				if (queryParentsHaveValues(child, variableFetchContext, selection)) {
					maps.states[child] = resolveFetchState(maps, child);
				}
			});
		}

		set({
			variableFetchStates: maps.states,
			variableLastUpdated: maps.lastUpdated,
			variableCycleIds: maps.cycleIds,
		});
	},

	onVariableFetchFailure: (name): void => {
		if (!isVariableInActiveFetchState(get().variableFetchStates[name])) {
			return;
		}
		const { variableFetchContext } = get();
		const maps = cloneMaps(get());
		maps.states[name] = VariableFetchState.Error;

		if (variableFetchContext) {
			const { dependencyData, variableTypes } = variableFetchContext;
			// Idle query descendants only when a QUERY parent fails (they need its
			// value); a DYNAMIC failure doesn't block them (they used its selection).
			(dependencyData.transitiveDescendants[name] || []).forEach((desc) => {
				if (variableTypes[name] === 'QUERY' && variableTypes[desc] === 'QUERY') {
					maps.states[desc] = VariableFetchState.Idle;
				}
			});
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
		const changed = new Set(names);
		// Callers commit values before this runs, so the gate sees the new parent values.
		const selection = selectVariableValues(get().dashboardId)(get());

		// Query descendants of the changed vars (not the changed ones): fetch once all
		// their query parents have a value, else hold until the rest land.
		const queryDescendants = new Set<string>();
		names.forEach((name) => {
			(dependencyData.transitiveDescendants[name] || []).forEach((desc) => {
				if (variableTypes[desc] === 'QUERY' && !changed.has(desc)) {
					queryDescendants.add(desc);
				}
			});
		});
		queryDescendants.forEach((desc) => {
			maps.cycleIds[desc] = (maps.cycleIds[desc] || 0) + 1;
			maps.states[desc] = queryParentsHaveValues(
				desc,
				variableFetchContext,
				selection,
			)
				? resolveFetchState(maps, desc)
				: VariableFetchState.Waiting;
		});

		// A dynamic's options depend only on its sibling DYNAMIC selections, so only a
		// dynamic change affects them — refresh the *other* dynamics immediately
		// (never the one that changed, which would refetch its own identical options).
		if (names.some((name) => variableTypes[name] === 'DYNAMIC')) {
			dynamicVariableOrder
				.filter((dynName) => !changed.has(dynName))
				.forEach((dynName) => {
					maps.cycleIds[dynName] = (maps.cycleIds[dynName] || 0) + 1;
					maps.states[dynName] = resolveFetchState(maps, dynName);
				});
		}

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
