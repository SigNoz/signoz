import createStore from '../store';
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
			draft.variables = variables;
		} else {
			// Otherwise, we merge the variables
			draft.variables = {
				...draft.variables,
				...variables,
			};
		}

		updateDerivedValues(draft);
	});
}
