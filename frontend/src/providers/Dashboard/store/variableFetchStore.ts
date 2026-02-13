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
