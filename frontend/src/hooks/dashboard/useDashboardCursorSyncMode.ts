import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardPreference } from './useDashboardPreference';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';

const NOOP = (): void => {};

export function useDashboardCursorSyncMode(
	dashboardId: string | undefined,
	panelMode?: PanelMode,
): [DashboardCursorSync, (value: DashboardCursorSync) => void] {
	const [value, setValue] = useDashboardPreference(
		dashboardId,
		'cursorSyncMode',
		DashboardCursorSync.Crosshair,
	);

	// Chart panels in edit / standalone modes don't participate in cross-panel
	// sync, so surface the default with a no-op setter for them. Callers without
	// a panelMode (e.g. dashboard settings) read/write the preference normally.
	if (panelMode && panelMode !== PanelMode.DASHBOARD_VIEW) {
		return [DashboardCursorSync.None, NOOP];
	}

	return [value, setValue];
}
