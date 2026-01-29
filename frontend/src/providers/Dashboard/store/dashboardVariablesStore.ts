import { DashboardData } from 'types/api/dashboard/getAll';
import createStore from './store';

export type IDashboardVariables = DashboardData['variables'];

export const dashboardVariablesStore = createStore<IDashboardVariables>({});

export function updateDashboardVariablesStore(
	variables: Partial<IDashboardVariables>,
): void {
	dashboardVariablesStore.update((currentVariables) => ({
		...currentVariables,
		...variables,
	}));
}
