import { useCallback } from 'react';
import { generatePath, useLocation } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import type { PanelEditorHandoffState } from '../PanelEditor/panelEditorHandoff';
import { useDashboardStore } from '../store/useDashboardStore';
import { withVariablesSearch } from '../VariablesBar/variablesUrlState';

/**
 * Returns a callback that opens the V2 panel editor by navigating to its full-page route
 * (`/dashboard/:dashboardId/panel/:panelId`). The dashboard id comes from the store, so any
 * caller can open the editor with just the panel id. The `?variables=` selection is carried
 * along (V1 parity) so it survives a refresh of the editor. The optional `handoffState` is
 * passed as router location state — the View modal uses it to hand its drilldown-edited spec
 * off to the editor (view → edit) so the editor opens on those edits rather than the saved
 * panel.
 */
export function useOpenPanelEditor(): (
	panelId: string,
	handoffState?: PanelEditorHandoffState,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const { search } = useLocation();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		(panelId: string, handoffState?: PanelEditorHandoffState): void => {
			safeNavigate(
				`${generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
					dashboardId,
					panelId,
				})}${withVariablesSearch('', search)}`,
				handoffState ? { state: handoffState } : undefined,
			);
		},
		[safeNavigate, dashboardId, search],
	);
}
