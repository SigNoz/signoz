import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { cloneDeep, set } from 'lodash-es';
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

	for (let i = 0; i < query.builder.queryData.length; i++) {
		const queryData = query.builder.queryData[i];
		queryData.groupBy = [];
		queryData.having = {
			expression: '',
		};
		queryData.orderBy = orderByPayload;
	}

	return query;
};

export const getExportQuery = (
	stagedQuery: Query,
	panelType: PANEL_TYPES,
): Query => {
	if (panelType !== PANEL_TYPES.LIST && panelType !== PANEL_TYPES.TRACE) {
		return stagedQuery;
	}
	const query = getListViewQuery(stagedQuery);
	if (panelType === PANEL_TYPES.LIST) {
		set(query, 'builder.queryData[0].selectColumns', defaultSelectedColumns);
	}
	if (panelType === PANEL_TYPES.TRACE) {
		// Trace hides aggregations, so one left from another view must not reach the chart.
		for (const queryData of query.builder.queryData) {
			queryData.aggregations = [{ expression: 'count()' }];
		}
	}
	return query;
};
