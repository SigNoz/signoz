import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import isEmpty from 'lodash-es/isEmpty';
import {
	IVariableFetchStoreState,
	VariableFetchState,
	variableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';

import { useDashboardVariablesSelector } from './useDashboardVariables';

/**
 * Generic selector hook for the variable fetch store.
 * Same pattern as useDashboardVariablesSelector.
 */
const useVariableFetchSelector = <T>(
	selector: (state: IVariableFetchStoreState) => T,
): T => {
	const selectorRef = useRef(selector);
	selectorRef.current = selector;

	const getSnapshot = useCallback(
		() => selectorRef.current(variableFetchStore.getSnapshot()),
		[],
	);

	return useSyncExternalStore(variableFetchStore.subscribe, getSnapshot);
};

interface UseVariableFetchStateReturn {
	/** The current fetch state for this variable */
	variableFetchState: VariableFetchState;
	/** Current fetch cycle — include in react-query keys to auto-cancel stale requests */
	variableFetchCycleId: number;
	/** True if this variable is idle (not waiting and not fetching) */
	isVariableSettled: boolean;
	/** True if this variable is actively fetching (loading or revalidating) */
	isVariableFetching: boolean;
	/** True if this variable has completed at least one fetch cycle */
	hasVariableFetchedOnce: boolean;
	/** True if any parent variable hasn't settled yet */
	isVariableWaitingForDependencies: boolean;
	/** Message describing what this variable is waiting on, or null if not waiting */
	variableDependencyWaitMessage?: string;
}

/**
 * Per-variable hook that exposes the fetch state of a single variable.
 * Reusable by both variable input components and panel components.
 *
 * Subscribes to both variableFetchStore (for states) and
 * dashboardVariablesStore (for parent graph) to compute derived values.
 */
export function useVariableFetchState(
	variableName: string,
): UseVariableFetchStateReturn {
	// This variable's fetch state (loading, waiting, idle, etc.)
	const variableFetchState = useVariableFetchSelector(
		(s) => s.states[variableName] || 'idle',
	) as VariableFetchState;

	// All variable states — needed to check if parent variables are still in-flight
	const allStates = useVariableFetchSelector((s) => s.states);

	// Parent dependency graph — maps each variable to its direct parents
	// e.g. { "childVariable": ["parentVariable"] } means "childVariable" depends on "parentVariable"
	const parentGraph = useDashboardVariablesSelector(
		(s) => s.dependencyData?.parentDependencyGraph,
	);

	// Timestamp of last successful fetch — 0 means never fetched
	const lastUpdated = useVariableFetchSelector(
		(s) => s.lastUpdated[variableName] || 0,
	);

	// Per-variable cycle counter — used as part of react-query keys
	// so changing it auto-cancels stale requests for this variable only
	const variableFetchCycleId = useVariableFetchSelector(
		(s) => s.cycleIds[variableName] || 0,
	);

	const isVariableSettled = variableFetchState === 'idle';

	const isVariableFetching =
		variableFetchState === 'loading' || variableFetchState === 'revalidating';
	// True after at least one successful fetch — used to show stale data while revalidating
	const hasVariableFetchedOnce = lastUpdated > 0;

	// Variable type — needed to differentiate waiting messages
	const variableType = useDashboardVariablesSelector(
		(s) => s.variableTypes[variableName],
	);

	// Parent variable names that haven't settled yet
	const unsettledParents = useMemo(() => {
		const parents = parentGraph?.[variableName] || [];
		return parents.filter((p) => (allStates[p] || 'idle') !== 'idle');
	}, [parentGraph, variableName, allStates]);

	const isVariableWaitingForDependencies = unsettledParents.length > 0;

	const variableDependencyWaitMessage = useMemo(() => {
		if (variableFetchState !== 'waiting') {
			return;
		}

		if (variableType === 'DYNAMIC') {
			return 'Waiting for all query variable options to load.';
		}

		if (unsettledParents.length === 0) {
			return;
		}

		const quoted = unsettledParents.map((p) => `"${p}"`);
		const names =
			quoted.length > 1
				? `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`
				: quoted[0];
		return `Waiting for options of ${names} to load.`;
	}, [variableFetchState, variableType, unsettledParents]);

	return {
		variableFetchState,
		isVariableSettled,
		isVariableWaitingForDependencies,
		variableDependencyWaitMessage,
		isVariableFetching,
		hasVariableFetchedOnce,
		variableFetchCycleId,
	};
}

export function useIsPanelWaitingOnVariable(variableNames: string[]): boolean {
	const states = useVariableFetchSelector((s) => s.states);
	const dashboardVariables = useDashboardVariablesSelector((s) => s.variables);
	const variableTypesMap = useDashboardVariablesSelector((s) => s.variableTypes);

	return variableNames.some((name) => {
		const variableFetchState = states[name];
		const { selectedValue, allSelected } = dashboardVariables?.[name] || {};

		const isVariableInFetchingOrWaitingState =
			variableFetchState === 'loading' ||
			variableFetchState === 'revalidating' ||
			variableFetchState === 'waiting';

		if (variableTypesMap[name] === 'DYNAMIC' && allSelected) {
			return isVariableInFetchingOrWaitingState;
		}

		return isEmpty(selectedValue) ? isVariableInFetchingOrWaitingState : false;
	});
}
