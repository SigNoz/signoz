import { useSyncExternalStore } from 'react';
import { dashboardVariablesStore, VARSS } from './dashboardVariablesStore';

export const useDashboardVariables = (): {
	dashboardVariables: VARSS;
} => {
	const dashboardVariables = useSyncExternalStore(
		dashboardVariablesStore.subscribe,
		dashboardVariablesStore.getSnapshot,
	);

	return {
		dashboardVariables,
	};
};
