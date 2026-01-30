import { IDashboardVariable } from 'types/api/dashboard/getAll';

import createStore from './store';

// export type IDashboardVariables = DashboardData['variables'];
export type IDashboardVariables = Record<string, IDashboardVariable>;

export const dashboardVariablesStore = createStore<IDashboardVariables>({});

export function updateDashboardVariablesStore(
	variables: Partial<IDashboardVariables>,
): void {
	dashboardVariablesStore.update((currentVariables) => ({
		...currentVariables,
		...variables,
	}));
}
