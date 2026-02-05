import { useCallback, useRef, useSyncExternalStore } from 'react';
import { dashboardVariablesStore } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import {
	IDashboardVariablesStoreState,
	IUseDashboardVariablesReturn,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';

/**
 * Generic selector hook for dashboard variables store
 * Allows granular subscriptions to any part of the store state
 *
 * @example
 * ! Select top-level field
 * const variables = useDashboardVariablesSelector(s => s.variables);
 *
 * ! Select specific variable
 * const fooVar = useDashboardVariablesSelector(s => s.variables['foo']);
 *
 * ! Select derived value
 * const hasVariables = useDashboardVariablesSelector(s => Object.keys(s.variables).length > 0);
 */
export const useDashboardVariablesSelector = <T>(
	selector: (state: IDashboardVariablesStoreState) => T,
): T => {
	const selectorRef = useRef(selector);
	selectorRef.current = selector;

	const getSnapshot = useCallback(
		() => selectorRef.current(dashboardVariablesStore.getSnapshot()),
		[],
	);

	return useSyncExternalStore(dashboardVariablesStore.subscribe, getSnapshot);
};

export const useDashboardVariables = (): IUseDashboardVariablesReturn => {
	const dashboardVariables = useDashboardVariablesSelector((s) => s.variables);

	return { dashboardVariables };
};
