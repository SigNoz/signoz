import { useSyncExternalStore } from 'react';

import {
	dashboardVariablesStore,
	IDashboardVariables,
} from '../../providers/Dashboard/store/dashboardVariablesStore';

export interface IUseDashboardVariablesReturn {
	dashboardVariables: IDashboardVariables;
}

export const useDashboardVariables = (): IUseDashboardVariablesReturn => {
	const dashboardVariables = useSyncExternalStore(
		dashboardVariablesStore.subscribe,
		dashboardVariablesStore.getSnapshot,
	);

	return {
		dashboardVariables,
	};
};
