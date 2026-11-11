import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Stands in for the query response on the static path, where there is no query to
 * respond. A module constant so it stays referentially stable across renders.
 */
export const EMPTY_PANEL_QUERY_DATA: PanelQueryData = {
	response: undefined,
	requestPayload: undefined,
	legendMap: {},
};
