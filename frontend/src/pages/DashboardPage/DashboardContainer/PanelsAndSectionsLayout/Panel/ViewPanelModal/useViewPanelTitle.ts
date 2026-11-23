import { useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { interpolateVariables } from 'pages/DashboardPage/DashboardContainer/Panels/utils/interpolateVariables';
import { selectResolvedVariables } from 'pages/DashboardPage/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

const VIEW_MODE_TITLE = 'View mode';

/**
 * Plain-text heading of the View modal: the panel name with the dashboard's
 * variables resolved, followed by "(View mode)". The dialog title is a string, so
 * it wraps instead of truncating. Falls back to "View mode" while no panel is
 * carried (the modal is closed) or the panel has no name.
 */
export function useViewPanelTitle(panel?: DashboardtypesPanelDTO): string {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variables = useDashboardStore(selectResolvedVariables(dashboardId));
	const rawName = panel?.spec.display.name;

	return useMemo(() => {
		const name = rawName ? interpolateVariables(rawName, variables) : '';
		return name ? `${name} - (${VIEW_MODE_TITLE})` : VIEW_MODE_TITLE;
	}, [rawName, variables]);
}
