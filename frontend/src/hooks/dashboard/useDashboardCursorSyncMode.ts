import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardPreference } from './useDashboardPreference';

const DEFAULT_CURSOR_SYNC_MODE = DashboardCursorSync.Crosshair;

export function useDashboardCursorSyncMode(
	dashboardId: string | undefined,
): [DashboardCursorSync, (value: DashboardCursorSync) => void] {
	return useDashboardPreference(
		dashboardId,
		'cursorSyncMode',
		DEFAULT_CURSOR_SYNC_MODE,
	);
}
