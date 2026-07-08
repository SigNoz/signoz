import {
	selectVariableCycleId,
	selectVariableFetchedOnce,
	selectVariableFetchState,
	VariableFetchState,
} from '../store/slices/variableFetchSlice';
import { useDashboardStore } from '../store/useDashboardStore';

export interface VariableFetchStateResult {
	variableFetchState: VariableFetchState;
	/** Include in the selector's react-query key to auto-cancel stale requests. */
	variableFetchCycleId: number;
	/** Actively fetching (first load or revalidating). */
	isVariableFetching: boolean;
	/** Stable — the fetch completed (or errored). */
	isVariableSettled: boolean;
	/** Blocked on parent dependencies (query order) or query variables (dynamics). */
	isVariableWaiting: boolean;
	/** Completed at least one fetch — keeps the query subscribed so a cycle bump refetches. */
	hasVariableFetchedOnce: boolean;
}

/**
 * Per-variable view of the runtime fetch engine (`variableFetchSlice`), consumed
 * by the Query/Dynamic selectors to gate their fetch and key it by cycle id.
 * V2-native equivalent of V1's `useVariableFetchState`.
 */
export function useVariableFetchState(name: string): VariableFetchStateResult {
	const variableFetchState = useDashboardStore(selectVariableFetchState(name));
	const variableFetchCycleId = useDashboardStore(selectVariableCycleId(name));
	const hasVariableFetchedOnce = useDashboardStore(
		selectVariableFetchedOnce(name),
	);

	return {
		variableFetchState,
		variableFetchCycleId,
		isVariableFetching:
			variableFetchState === VariableFetchState.Loading ||
			variableFetchState === VariableFetchState.Revalidating,
		isVariableSettled: variableFetchState === VariableFetchState.Idle,
		isVariableWaiting: variableFetchState === VariableFetchState.Waiting,
		hasVariableFetchedOnce,
	};
}
