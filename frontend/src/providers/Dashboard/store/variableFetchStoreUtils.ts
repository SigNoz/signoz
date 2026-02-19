import { TVariableQueryType } from 'types/api/dashboard/getAll';

import {
	IVariableFetchStoreState,
	VariableFetchState,
} from './variableFetchStore';

export function isSettled(state: VariableFetchState | undefined): boolean {
	return state === 'idle' || state === 'error';
}

/**
 * Resolve the next fetch state based on whether the variable has been fetched before.
 */
export function resolveFetchState(
	draft: IVariableFetchStoreState,
	name: string,
): VariableFetchState {
	return (draft.lastUpdated[name] || 0) > 0 ? 'revalidating' : 'loading';
}

/**
 * Check if all query variables are settled (idle or error).
 */
export function areAllQueryVariablesSettled(
	states: Record<string, VariableFetchState>,
	variableTypes: Record<string, TVariableQueryType>,
): boolean {
	return Object.entries(variableTypes)
		.filter(([, type]) => type === 'QUERY')
		.every(([name]) => isSettled(states[name]));
}

/**
 * Transition waiting dynamic variables to loading/revalidating if in 'waiting' state.
 */
export function unlockWaitingDynamicVariables(
	draft: IVariableFetchStoreState,
	dynamicVariableOrder: string[],
): void {
	dynamicVariableOrder.forEach((dynName) => {
		if (draft.states[dynName] === 'waiting') {
			draft.states[dynName] = resolveFetchState(draft, dynName);
		}
	});
}
