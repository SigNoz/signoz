import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import type { PanelEditorHandoffState } from '../PanelEditor/panelEditorHandoff';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Returns a callback that opens the V2 panel editor by navigating to its full-page route
 * (`/dashboard/:dashboardId/panel/:panelId`). The dashboard id comes from the store, so any
 * caller can open the editor with just the panel id. Variable selection is read from the
 * persisted store (localStorage), not carried in the URL. The optional `handoffState` is
 * passed as router location state — the View modal uses it to hand its drilldown-edited spec
 * off to the editor (view → edit) so the editor opens on those edits rather than the saved
 * panel.
 */
export function useOpenPanelEditor(): (
	panelId: string,
	handoffState?: PanelEditorHandoffState,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		(panelId: string, handoffState?: PanelEditorHandoffState): void => {
			void logEvent(DashboardDetailEvents.PanelAction, {
				action: 'edit',
				panelId,
				dashboardId,
			});
			safeNavigate(
				generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, { dashboardId, panelId }),
				handoffState ? { state: handoffState } : undefined,
			);
		},
		[safeNavigate, dashboardId],
	);
}
