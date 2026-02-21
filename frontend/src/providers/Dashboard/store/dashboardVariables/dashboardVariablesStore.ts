import { isEmpty, isUndefined } from 'lodash-es';

import createStore from '../store';
import { VariableFetchContext } from '../variableFetchStore';
import { IDashboardVariablesStoreState } from './dashboardVariablesStoreTypes';
import {
	computeDerivedValues,
	updateDerivedValues,
} from './dashboardVariablesStoreUtils';

const initialState: IDashboardVariablesStoreState = {
	dashboardId: '',
	variables: {},
	sortedVariablesArray: [],
	dependencyData: null,
	variableTypes: {},
	dynamicVariableOrder: [],
};

export const dashboardVariablesStore = createStore<IDashboardVariablesStoreState>(
	initialState,
);

/**
 * Set dashboard variables (replaces all variables)
 */
export function setDashboardVariablesStore({
	dashboardId,
	variables,
}: {
	dashboardId: string;
	variables: IDashboardVariablesStoreState['variables'];
}): void {
	dashboardVariablesStore.set(() => {
		return {
			dashboardId,
			variables,
			...computeDerivedValues(variables),
		} as IDashboardVariablesStoreState;
	});
}

/**
 * Update specific dashboard variables (merges with existing)
 */
export function updateDashboardVariablesStore({
	dashboardId,
	variables,
}: {
	dashboardId: string;
	variables: IDashboardVariablesStoreState['variables'];
}): void {
	dashboardVariablesStore.update((draft) => {
		if (draft.dashboardId !== dashboardId) {
			// If dashboardId doesn't match, we replace the entire state
			draft.dashboardId = dashboardId;
		}
		draft.variables = variables;

		updateDerivedValues(draft);
	});
}

/**
 * Read current store snapshot as VariableFetchContext.
 * Used by components to pass context to variableFetchStore actions
 * without creating a circular import.
 */
export function getVariableDependencyContext(): VariableFetchContext {
	const state = dashboardVariablesStore.getSnapshot();

	// If every variable already has a selectedValue (e.g. persisted from
	// localStorage/URL), dynamic variables can start in parallel.
	// Otherwise they wait for query vars to settle first.
	const doAllVariablesHaveValuesSelected = Object.values(state.variables).every(
		(variable) => {
			if (
				variable.type === 'DYNAMIC' &&
				(variable.selectedValue === null || isEmpty(variable.selectedValue)) &&
				variable.allSelected === true
			) {
				return true;
			}

			return (
				!isUndefined(variable.selectedValue) && !isEmpty(variable.selectedValue)
			);
		},
	);

	return {
		doAllVariablesHaveValuesSelected,
		variableTypes: state.variableTypes,
		dynamicVariableOrder: state.dynamicVariableOrder,
		dependencyData: state.dependencyData,
	};
}
