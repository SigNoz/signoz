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

/** Active = a fetch is in flight; only then should a settle be applied. */
export function isVariableInActiveFetchState(
	state: VariableFetchState | undefined,
): boolean {
	return state === 'loading' || state === 'revalidating';
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
