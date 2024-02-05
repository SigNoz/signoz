import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';

export const PANEL_TYPES_INITIAL_QUERY = {
	[PANEL_TYPES.TIME_SERIES]: initialQueriesMap.metrics,
	[PANEL_TYPES.VALUE]: initialQueriesMap.metrics,
	[PANEL_TYPES.TABLE]: initialQueriesMap.metrics,
	[PANEL_TYPES.LIST]: initialQueriesMap.logs,
	[PANEL_TYPES.TRACE]: initialQueriesMap.traces,
	[PANEL_TYPES.EMPTY_WIDGET]: initialQueriesMap.metrics,
};
