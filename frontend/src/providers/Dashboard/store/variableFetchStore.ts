import { VariableGraph } from 'container/DashboardContainer/DashboardVariablesSelection/util';

import createStore from './store';

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

	// Dependency graphs (set once when variables change)
	dependencyGraph: VariableGraph; // variable -> children that depend on it
	parentGraph: VariableGraph; // variable -> parents it depends on

	// Track last update timestamp per variable to trigger re-fetches
	lastUpdated: Record<string, number>;
}

const initialState: IVariableFetchStoreState = {
	states: {},
	dependencyGraph: {},
	parentGraph: {},
	lastUpdated: {},
};

export const variableFetchStore = createStore<IVariableFetchStoreState>(
	initialState,
);

// ============== Actions ==============

/**
 * Initialize the store with dependency graphs and set initial states
 */
export function initializeVariableFetchStore(
	variableNames: string[],
	dependencyGraph: VariableGraph,
	parentGraph: VariableGraph,
): void {
	variableFetchStore.update((draft) => {
		draft.dependencyGraph = dependencyGraph;
		draft.parentGraph = parentGraph;

		// Initialize all variables to idle, preserving existing ready states
		variableNames.forEach((name) => {
			if (!draft.states[name]) {
				draft.states[name] = 'idle';
			}
		});
	});
}

/**
 * Mark variables as waiting (need to fetch when parents are ready)
 * Only marks QUERY type variables, others are handled differently
 */
export function markVariablesWaiting(variableNames: string[]): void {
	variableFetchStore.update((draft) => {
		variableNames.forEach((name) => {
			// Only transition to waiting if not already loading
			if (draft.states[name] !== 'loading') {
				draft.states[name] = 'waiting';
			}
		});
	});
}

/**
 * Mark a single variable as waiting
 */
export function markVariableWaiting(variableName: string): void {
	variableFetchStore.update((draft) => {
		if (draft.states[variableName] !== 'loading') {
			draft.states[variableName] = 'waiting';
		}
	});
}

/**
 * Check if a variable can start fetching
 * A variable can fetch if:
 * - It has no parents (dependencies), OR
 * - All its parents are in 'idle' state (complete)
 */
export function canVariableFetch(variableName: string): boolean {
	const state = variableFetchStore.getSnapshot();

	// If not waiting, can't fetch
	if (state.states[variableName] !== 'waiting') {
		return false;
	}

	const parents = state.parentGraph[variableName] || [];

	// If no parents, can always fetch
	if (parents.length === 0) {
		return true;
	}

	// All parents must be idle (complete)
	return parents.every((parent) => state.states[parent] === 'idle');
}

/**
 * Start fetching a variable (transition waiting -> loading)
 */
export function startVariableFetch(variableName: string): void {
	variableFetchStore.update((draft) => {
		if (draft.states[variableName] === 'waiting') {
			draft.states[variableName] = 'loading';
		}
	});
}

/**
 * Helper to mark a variable as idle and trigger dependent children
 */
function markIdleAndTriggerChildren(
	draft: IVariableFetchStoreState,
	variableName: string,
): void {
	draft.states[variableName] = 'idle';
	draft.lastUpdated[variableName] = Date.now();

	// Mark children as waiting so they can refetch with new parent value
	const children = draft.dependencyGraph[variableName] || [];
	children.forEach((child) => {
		// Only mark as waiting if not already loading
		if (draft.states[child] !== 'loading') {
			draft.states[child] = 'waiting';
		}
	});
}

/**
 * Complete a variable fetch successfully (transition loading -> idle)
 * Also marks dependent children as waiting if they aren't already
 */
export function completeVariableFetch(variableName: string): void {
	variableFetchStore.update((draft) => {
		markIdleAndTriggerChildren(draft, variableName);
	});
}

/**
 * Fail a variable fetch (transition loading -> error)
 */
export function failVariableFetch(variableName: string): void {
	variableFetchStore.update((draft) => {
		draft.states[variableName] = 'error';
	});
}

/**
 * When a variable's VALUE changes (user selection), mark its dependents as waiting
 * Note: Intentionally same implementation as completeVariableFetch - they represent
 * different semantic operations (fetch complete vs user selection) but have same effect
 */
// eslint-disable-next-line sonarjs/no-identical-functions
export function onVariableValueChange(variableName: string): void {
	variableFetchStore.update((draft) => {
		markIdleAndTriggerChildren(draft, variableName);
	});
}

/**
 * Reset the store (useful when dashboard changes)
 */
export function resetVariableFetchStore(): void {
	variableFetchStore.set(() => initialState);
}

// ============== Selectors ==============

/**
 * Get the fetch state for a specific variable
 */
export function getVariableFetchState(
	variableName: string,
): VariableFetchState {
	const state = variableFetchStore.getSnapshot();
	return state.states[variableName] || 'idle';
}

/**
 * Get all variables that are currently waiting and can fetch
 */
export function getVariablesReadyToFetch(): string[] {
	const state = variableFetchStore.getSnapshot();
	return Object.keys(state.states).filter(
		(name) => state.states[name] === 'waiting' && canVariableFetch(name),
	);
}

/**
 * Check if a variable has any parents (dependencies)
 */
export function hasParentDependencies(variableName: string): boolean {
	const state = variableFetchStore.getSnapshot();
	const parents = state.parentGraph[variableName] || [];
	return parents.length > 0;
}

/**
 * Get the last update timestamp for a variable
 */
export function getVariableLastUpdated(variableName: string): number {
	const state = variableFetchStore.getSnapshot();
	return state.lastUpdated[variableName] || 0;
}
