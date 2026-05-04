import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardPreference } from './useDashboardPreference';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';

const DEFAULT_CURSOR_SYNC_MODE = DashboardCursorSync.Crosshair;

export function useDashboardCursorSyncMode(
	dashboardId: string | undefined,
	panelMode?: PanelMode,
): [DashboardCursorSync, (value: DashboardCursorSync) => void] {
	if (panelMode !== PanelMode.DASHBOARD_VIEW) {
		// Only allow cursor sync modes to be set in the dashboard view mode, as the other modes are used for editing and standalone panel views where cursor sync is not applicable.
		return [DEFAULT_CURSOR_SYNC_MODE, () => {}];
	}

	return useDashboardPreference(
		dashboardId,
		'cursorSyncMode',
		DEFAULT_CURSOR_SYNC_MODE,
	);
}
