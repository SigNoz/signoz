import { SyncTooltipFilterMode } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardPreference } from './useDashboardPreference';

const DEFAULT_SYNC_TOOLTIP_FILTER_MODE = SyncTooltipFilterMode.Filtered;

export function useSyncTooltipFilterMode(
	dashboardId: string | undefined,
): [SyncTooltipFilterMode, (value: SyncTooltipFilterMode) => void] {
	return useDashboardPreference(
		dashboardId,
		'syncTooltipFilterMode',
		DEFAULT_SYNC_TOOLTIP_FILTER_MODE,
	);
}
