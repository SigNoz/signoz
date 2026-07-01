import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getPanelQueryType } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getPanelQueryType';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';

import { buildCreateAlertUrl } from '../utils/buildCreateAlertUrl';

/**
 * Returns a callback that opens the alert builder in a new tab, seeded from a
 * panel's query, and logs the action — mirroring V1's `useCreateAlerts`
 * ('dashboardView' caller). The panel is supplied at call time so the callback
 * stays stable across panels (and the dashboard's react-query refetches).
 */
export function useCreateAlertFromPanel(): (
	panel: DashboardtypesPanelDTO,
	panelId: string,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		(panel: DashboardtypesPanelDTO, panelId: string): void => {
			void logEvent('Dashboard Detail: Panel action', {
				action: 'createAlerts',
				panelType: PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind],
				dashboardId,
				widgetId: panelId,
				queryType: getPanelQueryType(panel),
			});
			safeNavigate(buildCreateAlertUrl(panel), { newTab: true });
		},
		[dashboardId, safeNavigate],
	);
}
