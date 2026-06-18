import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { newPanelSearch, NEW_PANEL_ID } from '../PanelEditor/newPanelRoute';
import type { PanelKind } from '../Panels/types/panelKind';
import { useDashboardStore } from '../store/useDashboardStore';

interface CreatePanelArgs {
	pluginKind: PanelKind;
	/** Section to add the panel to on save; omitted → last/new section. */
	layoutIndex?: number;
}

/**
 * Opens the panel editor to create a new panel: navigates to the editor route
 * with a `new_<Kind>` token (and optional target section). Nothing is persisted
 * until the user saves — cancelling leaves the dashboard untouched. The dashboard
 * id comes from the edit-context store, so any trigger can call this with just a
 * kind.
 */
export function useCreatePanel(): (args: CreatePanelArgs) => void {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		({ pluginKind, layoutIndex }: CreatePanelArgs): void => {
			const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
				dashboardId,
				panelId: NEW_PANEL_ID,
			});
			safeNavigate(`${path}${newPanelSearch(pluginKind, layoutIndex)}`);
		},
		[safeNavigate, dashboardId],
	);
}
