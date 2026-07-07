import type { VariableType } from '../../DashboardSettings/Variables/variableFormModel';

/** Per-variable fetch lifecycle (ported from V1's `variableFetchStore`). */
export enum VariableFetchState {
	Idle = 'idle',
	Loading = 'loading',
	Revalidating = 'revalidating',
	Waiting = 'waiting',
	Error = 'error',
}

/** Mutable clones a fetch action works over before committing back in one `set`. */
export interface FetchMaps {
	states: Record<string, VariableFetchState>;
	lastUpdated: Record<string, number>;
	cycleIds: Record<string, number>;
}

/** Settled = can make no further progress (idle or error). */
export function isSettled(state: VariableFetchState | undefined): boolean {
	return state === VariableFetchState.Idle || state === VariableFetchState.Error;
}

/** Fetch-start state: `revalidating` if fetched before, else `loading`. */
export function resolveFetchState(
	maps: FetchMaps,
	name: string,
): VariableFetchState {
	return (maps.lastUpdated[name] || 0) > 0
		? VariableFetchState.Revalidating
		: VariableFetchState.Loading;
}

/** True once every QUERY variable is settled. */
export function areAllQueryVariablesSettled(
	states: Record<string, VariableFetchState>,
	variableTypes: Record<string, VariableType>,
): boolean {
	return Object.entries(variableTypes)
		.filter(([, type]) => type === 'QUERY')
		.every(([name]) => isSettled(states[name]));
}

/** Move any `waiting` dynamic variables into loading/revalidating. */
export function unlockWaitingDynamicVariables(
	maps: FetchMaps,
	dynamicVariableOrder: string[],
): void {
	dynamicVariableOrder.forEach((dynName) => {
		if (maps.states[dynName] === VariableFetchState.Waiting) {
			maps.states[dynName] = resolveFetchState(maps, dynName);
		}
	});
}
