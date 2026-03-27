import { useEffect } from 'react';
import isEqual from 'lodash-es/isEqual';
import {
	setDashboardVariablesStore,
	updateDashboardVariablesStore,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import {
	DashboardStore,
	useDashboardStore,
} from 'providers/Dashboard/store/useDashboardStore';

import { useDashboardVariablesSelector } from './useDashboardVariables';

/**
 * Keeps the external variables store in sync with the zustand dashboard store.
 * When selectedDashboard changes, propagates variable updates to the variables store.
 */
export function useDashboardVariablesSync(dashboardId: string): void {
	const dashboardVariables = useDashboardVariablesSelector((s) => s.variables);
	const savedDashboardId = useDashboardVariablesSelector((s) => s.dashboardId);
	const selectedDashboard = useDashboardStore(
		(s: DashboardStore) => s.selectedDashboard,
	);

	useEffect(() => {
		const updatedVariables = selectedDashboard?.data.variables || {};
		if (savedDashboardId !== dashboardId) {
			setDashboardVariablesStore({ dashboardId, variables: updatedVariables });
		} else if (!isEqual(dashboardVariables, updatedVariables)) {
			updateDashboardVariablesStore({ dashboardId, variables: updatedVariables });
		}
	}, [selectedDashboard]); // eslint-disable-line react-hooks/exhaustive-deps
}
