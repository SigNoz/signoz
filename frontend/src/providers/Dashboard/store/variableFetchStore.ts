import { getVariableDependencyContext } from './dashboardVariables/dashboardVariablesStore';
import { IDashboardVariablesStoreState } from './dashboardVariables/dashboardVariablesStoreTypes';
import createStore from './store';
import {
	areAllQueryVariablesSettled,
	isSettled,
	resolveFetchState,
	unlockWaitingDynamicVariables,
} from './variableFetchStoreUtils';

// Fetch state for each variable
export type VariableFetchState =
	| 'idle' // stable state - initial or complete
	| 'loading' // actively fetching data (first time)
	| 'revalidating' // refetching existing data
	| 'waiting' // blocked on parent dependencies
	| 'error';

export interface IVariableFetchStoreState {
	// Per-variable fetch state
	states: Record<string, VariableFetchState>;

	// Track last update timestamp per variable
	lastUpdated: Record<string, number>;

	// Per-variable cycle counter — bumped when a variable needs to refetch.
	// Used in react-query keys to auto-cancel stale requests for that variable only.
	cycleIds: Record<string, number>;
}

/**
 * Context from dashboardVariablesStore needed by fetch actions.
 * Passed as parameter to avoid circular imports.
 */
export type VariableFetchContext = Pick<
	IDashboardVariablesStoreState,
	'variableTypes' | 'dynamicVariableOrder' | 'dependencyData'
> & {
	doAllVariablesHaveValuesSelected: boolean;
};

const initialState: IVariableFetchStoreState = {
	states: {},
	lastUpdated: {},
	cycleIds: {},
};

export const variableFetchStore = createStore<IVariableFetchStoreState>(
	initialState,
);

// ============== Actions ==============

/**
 * Initialize the store with variable names.
 * Called when dashboard variables change — sets up state entries.
 */
export function initializeVariableFetchStore(variableNames: string[]): void {
	variableFetchStore.update((draft) => {
		// Initialize all variables to idle, preserving existing states
		variableNames.forEach((name) => {
			if (!draft.states[name]) {
				draft.states[name] = 'idle';
			}
		});

		// Clean up stale entries for variables that no longer exist
		const nameSet = new Set(variableNames);
		Object.keys(draft.states).forEach((name) => {
			if (!nameSet.has(name)) {
				delete draft.states[name];
				delete draft.lastUpdated[name];
				delete draft.cycleIds[name];
			}
		});
	});
}

/**
 * Start a full fetch cycle for all fetchable variables.
 * Called on: initial load, time range change, or dependency graph change.
 *
 * Query variables with no query-type parents start immediately.
 * Query variables with query-type parents get 'waiting'.
 * Dynamic variables start immediately if all variables already have
 * selectedValues (e.g. persisted from localStorage/URL). Otherwise they
 * wait for all query variables to settle first.
 */
export function enqueueFetchOfAllVariables(): void {
	const {
		doAllVariablesHaveValuesSelected,
		dependencyData,
		variableTypes,
		dynamicVariableOrder,
	} = getVariableDependencyContext();
	if (!dependencyData) {
		return;
	}

	const { order: queryVariableOrder, parentDependencyGraph } = dependencyData;

	variableFetchStore.update((draft) => {
		// Query variables: root ones start immediately, dependent ones wait
		queryVariableOrder.forEach((name) => {
			draft.cycleIds[name] = (draft.cycleIds[name] || 0) + 1;
			const parents = parentDependencyGraph[name] || [];
			const hasQueryParents = parents.some((p) => variableTypes[p] === 'QUERY');
			if (hasQueryParents) {
				draft.states[name] = 'waiting';
			} else {
				draft.states[name] = resolveFetchState(draft, name);
			}
		});

		// Dynamic variables: start immediately if query variables have values,
		// otherwise wait for query variables to settle first
		dynamicVariableOrder.forEach((name) => {
			draft.cycleIds[name] = (draft.cycleIds[name] || 0) + 1;
			draft.states[name] = doAllVariablesHaveValuesSelected
				? resolveFetchState(draft, name)
				: 'waiting';
		});
	});
}

/**
 * Mark a variable as completed. Unblocks waiting query-type children.
 * If all query variables are now settled, unlocks any waiting dynamic variables.
 */
export function onVariableFetchComplete(name: string): void {
	const {
		dependencyData,
		variableTypes,
		dynamicVariableOrder,
	} = getVariableDependencyContext();

	variableFetchStore.update((draft) => {
		draft.states[name] = 'idle';
		draft.lastUpdated[name] = Date.now();

		if (!dependencyData) {
			return;
		}

		const { graph } = dependencyData;

		// Unblock waiting query-type children
		const children = graph[name] || [];
		children.forEach((child) => {
			if (variableTypes[child] === 'QUERY' && draft.states[child] === 'waiting') {
				draft.states[child] = resolveFetchState(draft, child);
			}
		});

		// If all query variables are settled, unlock any waiting dynamic variables
		if (
			variableTypes[name] === 'QUERY' &&
			areAllQueryVariablesSettled(draft.states, variableTypes)
		) {
			unlockWaitingDynamicVariables(draft, dynamicVariableOrder);
		}
	});
}

/**
 * Mark a variable as errored. Sets query-type descendants to idle
 * (they can't proceed without this parent).
 * If all query variables are now settled, unlocks any waiting dynamic variables.
 */
export function onVariableFetchFailure(name: string): void {
	const {
		dependencyData,
		variableTypes,
		dynamicVariableOrder,
	} = getVariableDependencyContext();

	variableFetchStore.update((draft) => {
		draft.states[name] = 'error';

		if (!dependencyData) {
			return;
		}

		// Set query-type descendants to idle (can't fetch without parent)
		const descendants = dependencyData.transitiveDescendants[name] || [];
		descendants.forEach((desc) => {
			if (variableTypes[desc] === 'QUERY') {
				draft.states[desc] = 'idle';
			}
		});

		// If all query variables are settled (error counts), unlock any waiting dynamic variables
		if (
			variableTypes[name] === 'QUERY' &&
			areAllQueryVariablesSettled(draft.states, variableTypes)
		) {
			unlockWaitingDynamicVariables(draft, dynamicVariableOrder);
		}
	});
}

/**
 * Cascade a value change to query-type descendants.
 * Called when a user changes a variable's value (not from a fetch cycle).
 *
 * Direct children whose parents are all settled start immediately.
 * Deeper descendants wait until their parents complete (BFS order
 * ensures parents are set before children within a single update).
 */
export function enqueueDescendantsOfVariable(name: string): void {
	const { dependencyData, variableTypes } = getVariableDependencyContext();
	if (!dependencyData) {
		return;
	}

	const { parentDependencyGraph } = dependencyData;

	variableFetchStore.update((draft) => {
		const descendants = dependencyData.transitiveDescendants[name] || [];
		const queryDescendants = descendants.filter(
			(desc) => variableTypes[desc] === 'QUERY',
		);

		queryDescendants.forEach((desc) => {
			draft.cycleIds[desc] = (draft.cycleIds[desc] || 0) + 1;
			const parents = parentDependencyGraph[desc] || [];
			const allParentsSettled = parents.every((p) => isSettled(draft.states[p]));

			draft.states[desc] = allParentsSettled
				? resolveFetchState(draft, desc)
				: 'waiting';
		});
	});
}
