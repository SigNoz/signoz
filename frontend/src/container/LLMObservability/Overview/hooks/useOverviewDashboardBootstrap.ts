import { useEffect } from 'react';
import { useDashboardVariablesSync } from 'hooks/dashboard/useDashboardVariablesSync';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import { defaultTo } from 'lodash-es';
import { initializeDefaultVariables } from 'providers/Dashboard/initializeDefaultVariables';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { sortLayout } from 'providers/Dashboard/util';
import { useShallow } from 'zustand/react/shallow';

import {
	LLM_OVERVIEW_DASHBOARD,
	LLM_OVERVIEW_DASHBOARD_ID,
} from '../overviewDashboard';

// Seeds the dashboard zustand store from the hardcoded overview dashboard so
// the dashboard components (variables bar + grid layout) can be reused
// unchanged. Mirrors useDashboardBootstrap minus the API fetch/refetch logic.
export function useOverviewDashboardBootstrap(): boolean {
	const { setDashboardData, setLayouts, setPanelMap, resetDashboardStore } =
		useDashboardStore(
			useShallow((s) => ({
				setDashboardData: s.setDashboardData,
				setLayouts: s.setLayouts,
				setPanelMap: s.setPanelMap,
				resetDashboardStore: s.resetDashboardStore,
			})),
		);

	const isBootstrapped = useDashboardStore((s) => Boolean(s.dashboardData));

	const { getUrlVariables, updateUrlVariable, transformDashboardVariables } =
		useTransformDashboardVariables(LLM_OVERVIEW_DASHBOARD_ID);

	// Keep the external variables store in sync with dashboardData
	useDashboardVariablesSync(LLM_OVERVIEW_DASHBOARD_ID);

	useEffect(() => {
		// transformDashboardVariables deep-clones and merges variable selections
		// from URL/localStorage, so the module constant stays pristine.
		const dashboard = transformDashboardVariables(LLM_OVERVIEW_DASHBOARD);
		const variables = dashboard?.data?.variables;
		if (variables) {
			initializeDefaultVariables(variables, getUrlVariables, updateUrlVariable);
		}
		setDashboardData(dashboard);
		setLayouts(sortLayout(getUpdatedLayout(dashboard?.data?.layout)));
		setPanelMap(defaultTo(dashboard?.data?.panelMap, {}));

		// Reset on unmount so stale state doesn't bleed into real dashboards
		return (): void => {
			resetDashboardStore();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return isBootstrapped;
}
