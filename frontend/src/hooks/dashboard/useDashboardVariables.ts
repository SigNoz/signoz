import { useSyncExternalStore } from 'react';

import {
	dashboardVariablesStore,
	IDashboardVariables,
} from '../../providers/Dashboard/store/dashboardVariablesStore';

export const useDashboardVariables = (): {
	dashboardVariables: IDashboardVariables;
} => {
	const dashboardVariables = useSyncExternalStore(
		dashboardVariablesStore.subscribe,
		dashboardVariablesStore.getSnapshot,
	);

	return {
		dashboardVariables,
	};
};
