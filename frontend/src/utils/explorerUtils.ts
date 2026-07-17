import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

// Mapping between panel types and explorer views
export const panelTypeToExplorerView: Record<PANEL_TYPES, ExplorerViews> = {
	[PANEL_TYPES.LIST]: ExplorerViews.LIST,
	[PANEL_TYPES.TIME_SERIES]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.TRACE]: ExplorerViews.TRACE,
	[PANEL_TYPES.TABLE]: ExplorerViews.TABLE,
	[PANEL_TYPES.VALUE]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.BAR]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.PIE]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.HISTOGRAM]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.EMPTY_WIDGET]: ExplorerViews.LIST,
};

export const explorerViewToPanelType = {
	[ExplorerViews.LIST]: PANEL_TYPES.LIST,
	[ExplorerViews.TIMESERIES]: PANEL_TYPES.TIME_SERIES,
	[ExplorerViews.TRACE]: PANEL_TYPES.TRACE,
	[ExplorerViews.TABLE]: PANEL_TYPES.TABLE,
} as Record<ExplorerViews, PANEL_TYPES>;

/**
 * Get the explorer view based on panel type from URL or saved view
 * @param searchParams - URL search parameters
 * @param panelTypesFromUrl - Panel type extracted from URL
 * @returns The appropriate ExplorerViews value
 */
export const getExplorerViewFromUrl = (
	searchParams: URLSearchParams,
	panelTypesFromUrl: PANEL_TYPES | null,
): ExplorerViews => {
	const savedView = searchParams.get(QueryParams.selectedExplorerView);
	if (savedView) {
		return savedView as ExplorerViews;
	}

	// If no saved view, use panel type from URL to determine the view
	const urlPanelType = panelTypesFromUrl || PANEL_TYPES.LIST;
	return panelTypeToExplorerView[urlPanelType];
};

/**
 * Get the explorer view for a given panel type
 * @param panelType - The panel type
 * @returns The corresponding ExplorerViews value
 */
export const getExplorerViewForPanelType = (
	panelType: PANEL_TYPES,
): ExplorerViews => panelTypeToExplorerView[panelType];

export interface MetricsExplorerUrlParams {
	query: Query;
	relativeTime?: string;
	startTimeMs?: number;
	endTimeMs?: number;
}

export const getMetricsExplorerUrl = ({
	query,
	relativeTime,
	startTimeMs,
	endTimeMs,
}: MetricsExplorerUrlParams): string => {
	const params = new URLSearchParams();
	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(query)),
	);

	if (relativeTime) {
		params.set(QueryParams.relativeTime, relativeTime);
	} else {
		if (startTimeMs !== undefined) {
			params.set(QueryParams.startTime, String(startTimeMs));
		}
		if (endTimeMs !== undefined) {
			params.set(QueryParams.endTime, String(endTimeMs));
		}
	}

	return `${ROUTES.METRICS_EXPLORER_EXPLORER}?${params.toString()}`;
};
