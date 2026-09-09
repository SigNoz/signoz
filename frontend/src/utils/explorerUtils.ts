import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

// The list views of the logs and traces explorers hold their order as a
// `<column>:<direction>` string, the value format of the ListViewOrderBy select.
export const DEFAULT_LIST_ORDER_BY = 'timestamp:desc';

// Deep links carry the list order inside the compositeQuery param, so the list
// views are seeded from it instead of always opening newest-first.
export const getListOrderBy = (query: Query | null): string => {
	const [orderBy] = query?.builder?.queryData?.[0]?.orderBy ?? [];

	if (!orderBy?.columnName || !orderBy?.order) {
		return DEFAULT_LIST_ORDER_BY;
	}

	return `${orderBy.columnName}:${orderBy.order.toLowerCase()}`;
};

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
		// `unit` must always be present: the query builder provider rewrites (and
		// pushes a new history entry for) any compositeQuery missing a key of
		// `initialQueriesMap`, which traps the browser back button.
		// Since this is only being used by infra-monitoring, I will keep this fix one line
		// instead of going and update each chart configuration.
		encodeURIComponent(JSON.stringify({ unit: '', ...query })),
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
