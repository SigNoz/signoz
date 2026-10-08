import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { SIGNOZ_VALUE } from 'container/QueryBuilder/filters/OrderByFilter/constants';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';

import { getParsedAggregationOptionsForOrderBy } from './aggregationConverter';

export const DEFAULT_LIST_ORDER_BY = 'timestamp:desc';

// Filters only. The query keeps the order for the panel that can use it.
export const getRawPanelOrderBy = (query: Query | null): OrderByPayload[] => {
	const queryData = query?.builder?.queryData?.[0];

	if (!queryData) {
		return [];
	}

	const disallowed = new Set<string>([SIGNOZ_VALUE]);
	getParsedAggregationOptionsForOrderBy(queryData).forEach((aggregation) => {
		if (aggregation?.key) {
			disallowed.add(aggregation.key);
		}
	});

	return (queryData.orderBy ?? []).filter(
		(item) => !disallowed.has(item.columnName),
	);
};

// Never write the fallback back: a view saved without an order would then read
// as unsaved on open.
export const getListOrderBy = (
	query: Query | null,
	fallback: string = DEFAULT_LIST_ORDER_BY,
): string => {
	const [orderBy] = getRawPanelOrderBy(query);

	if (!orderBy?.columnName || !orderBy?.order) {
		return fallback;
	}

	return `${orderBy.columnName}:${orderBy.order.toLowerCase()}`;
};

export const parseListOrderBy = (orderBy: string): OrderByPayload => {
	const [columnName, order] = orderBy.split(':');

	return {
		columnName: columnName || 'timestamp',
		order: order || 'desc',
	};
};

export const setListOrderBy = (query: Query, orderBy: string): Query => {
	const nextOrderBy = [parseListOrderBy(orderBy)];

	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((item) => ({
				...item,
				orderBy: nextOrderBy,
			})),
		},
	};
};

// Mapping between panel types and explorer views
export const panelTypeToExplorerView: Record<PANEL_TYPES, ExplorerViews> = {
	[PANEL_TYPES.LIST]: ExplorerViews.LIST,
	[PANEL_TYPES.TIME_SERIES]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.TRACE]: ExplorerViews.TRACE,
	[PANEL_TYPES.TABLE]: ExplorerViews.TABLE,
	[PANEL_TYPES.VALUE]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.BAR]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.AREA]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.PIE]: ExplorerViews.TIMESERIES,
	[PANEL_TYPES.HISTOGRAM]: ExplorerViews.TIMESERIES,
	// Dashboard-only visualisation; explorers never offer it.
	[PANEL_TYPES.TEXT]: ExplorerViews.LIST,
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
