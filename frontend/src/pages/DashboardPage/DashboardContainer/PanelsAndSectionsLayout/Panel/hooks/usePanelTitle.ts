import { useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { interpolateVariables } from 'pages/DashboardPage/DashboardContainer/Panels/utils/interpolateVariables';
import { selectResolvedVariables } from 'pages/DashboardPage/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

export function usePanelTitle(panel: DashboardtypesPanelDTO): string {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variables = useDashboardStore(selectResolvedVariables(dashboardId));
	const name = panel.spec.display.name;

	return useMemo(() => interpolateVariables(name, variables), [name, variables]);
}
