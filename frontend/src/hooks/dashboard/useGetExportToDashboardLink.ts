import { useCallback } from 'react';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { buildExportPanelLink } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/newPanelRoute';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

interface ExportToDashboardLinkParams {
	dashboardId: string;
	panelType: PANEL_TYPES;
	query: Query;
	widgetId: string;
}

/**
 * "Add to Dashboard" link builder for the explorers. Targets the V2 panel editor;
 * `null` when the panel type has no V2 kind, so callers skip navigation.
 */
export function useGetExportToDashboardLink(): (
	params: ExportToDashboardLinkParams,
) => string | null {
	return useCallback(
		({ dashboardId, panelType, query }: ExportToDashboardLinkParams) =>
			buildExportPanelLink({ dashboardId, panelType, query }),
		[],
	);
}
