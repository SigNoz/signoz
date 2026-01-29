import { IDashboardVariable } from 'types/api/dashboard/getAll';
import createStore from './store';

// TODO: CHange
export type VARSS = Record<string, IDashboardVariable>;
// type _asda = DashboardData['variables'];

export const dashboardVariablesStore = createStore<VARSS>({});

export function updateDashboardVariablesStore(variables: Partial<VARSS>): void {
	dashboardVariablesStore.update((currentVariables) => ({
		...currentVariables,
		...variables,
	}));
}
