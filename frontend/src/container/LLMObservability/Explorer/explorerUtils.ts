import { TelemetryFieldKey } from 'api/v5/v5';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import {
	getActiveBuilder,
	getBuilderSlotKeyForQueryType,
	replaceBuilderBySlotKey,
} from 'lib/query/builderSlot';
import { cloneDeep } from 'lodash-es';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';
import { parseListOrderBy } from 'utils/explorerUtils';

import { defaultSelectedColumns } from './ListView/configs';

export const getListViewQuery = (
	stagedQuery: Query,
	orderBy?: string,
): Query => {
	const query = stagedQuery
		? cloneDeep(stagedQuery)
		: cloneDeep(initialQueriesMap.traces);

	const orderByPayload: OrderByPayload[] = orderBy
		? [parseListOrderBy(orderBy)]
		: [];

	const { queryData: builderQueries } = getActiveBuilder(query);
	for (let i = 0; i < builderQueries.length; i++) {
		const queryData = builderQueries[i];
		queryData.groupBy = [];
		queryData.having = {
			expression: '',
		};
		queryData.orderBy = orderByPayload;
	}

	return query;
};

export const getAlertQuery = (
	stagedQuery: Query,
	panelType: PANEL_TYPES,
): Query => {
	if (panelType !== PANEL_TYPES.LIST && panelType !== PANEL_TYPES.TRACE) {
		return stagedQuery;
	}
	const query = getListViewQuery(stagedQuery);
	const builder = getActiveBuilder(query);
	// List and Trace show only the first query's filter, so nothing another view set may reach the alert or chart.
	return replaceBuilderBySlotKey(
		query,
		getBuilderSlotKeyForQueryType(query.queryType),
		{
			...builder,
			queryData: builder.queryData.slice(0, 1).map((item) => ({
				...item,
				aggregations: [{ expression: 'count()' }],
				stepInterval: null,
				limit: null,
				legend: '',
			})),
			queryFormulas: [],
		},
	);
};

export const getExportQuery = (
	stagedQuery: Query,
	panelType: PANEL_TYPES,
	selectColumns: TelemetryFieldKey[] = defaultSelectedColumns,
): Query => {
	const query = getAlertQuery(stagedQuery, panelType);
	const [queryData] = getActiveBuilder(query).queryData;
	if (panelType === PANEL_TYPES.LIST && queryData) {
		queryData.selectColumns = selectColumns;
	}
	return query;
};
