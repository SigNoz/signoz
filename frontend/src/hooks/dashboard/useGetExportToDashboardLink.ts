import { useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { buildExportPanelLink } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/newPanelRoute';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';

interface ExportToDashboardLinkParams {
	dashboardId: string;
	panelType: PANEL_TYPES;
	query: Query;
	widgetId: string;
}

/**
 * Flag-aware "Add to Dashboard" link builder for the explorers. V2 targets the panel
 * editor (`/dashboard/:id/panel/new`); V1 uses the legacy new-widget link. Keeps the V1
 * `generateExportToDashboardLink` signature (V2 ignores `widgetId` — the id is made on save).
 */
export function useGetExportToDashboardLink(): (
	params: ExportToDashboardLinkParams,
) => string {
	const isDashboardV2 = useIsDashboardV2();

	return useCallback(
		({ dashboardId, panelType, query, widgetId }: ExportToDashboardLinkParams) =>
			isDashboardV2
				? buildExportPanelLink({ dashboardId, panelType, query })
				: generateExportToDashboardLink({
						query,
						panelType,
						dashboardId,
						widgetId,
					}),
		[isDashboardV2],
	);
}
