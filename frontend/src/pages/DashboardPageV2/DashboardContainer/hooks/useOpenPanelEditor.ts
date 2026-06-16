import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Returns a callback that opens the V2 panel editor for a panel by navigating
 * to its dedicated route (`/dashboard/:dashboardId/panel/:panelId`). The editor
 * is a full page (not a modal), mirroring the V1 widget-editor flow. The
 * dashboard id comes from the edit-context store (set by DashboardContainer),
 * so any entry point can open the editor with just the panel id.
 */
export function useOpenPanelEditor(): (panelId: string) => void {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		(panelId: string): void => {
			safeNavigate(
				generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, { dashboardId, panelId }),
			);
		},
		[safeNavigate, dashboardId],
	);
}
