import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { cloneDeep, set } from 'lodash-es';
import {
	OrderByPayload,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const createRootSpanFilterItem = (): TagFilterItem => ({
	id: uuid().slice(0, 8),
	key: {
		key: 'isRoot',
		dataType: undefined,
		type: '',
	},
	op: '=',
	value: 'true',
});

export const withRootSpanFilter = (query: Query): Query => {
	const nextQuery = cloneDeep(query);
	const queryData = nextQuery.builder?.queryData?.[0];

	if (!queryData) {
		return nextQuery;
	}

	if (!queryData.filters) {
		queryData.filters = { items: [], op: 'AND' };
	}

	const hasRootFilter = queryData.filters.items.some(
		(filter) =>
			filter.key?.key === 'isRoot' && String(filter.value) === 'true',
	);

	if (!hasRootFilter) {
		queryData.filters.items.push(createRootSpanFilterItem());
	}

	return nextQuery;
};

export const getListViewQuery = (
	stagedQuery: Query,
	orderBy?: string,
): Query => {
	const query = stagedQuery
		? cloneDeep(stagedQuery)
		: cloneDeep(initialQueriesMap.traces);

	const orderByPayload: OrderByPayload[] = orderBy
		? [
				{
					columnName: orderBy.split(':')[0],
					order: orderBy.split(':')[1] as 'asc' | 'desc',
				},
			]
		: [];

	for (let i = 0; i < query.builder.queryData.length; i++) {
		const queryData = query.builder.queryData[i];
		queryData.groupBy = [];
		queryData.having = {
			expression: '',
		};
		queryData.orderBy = orderByPayload;
	}

	if (
		query.builder.queryTraceOperator &&
		query.builder.queryTraceOperator.length > 0
	) {
		for (let i = 0; i < query.builder.queryTraceOperator.length; i++) {
			const queryTraceOperator = query.builder.queryTraceOperator[i];
			queryTraceOperator.groupBy = [];
			queryTraceOperator.having = {
				expression: '',
			};
			queryTraceOperator.orderBy = orderByPayload;
		}
	}

	return query;
};

export const getQueryByPanelType = (
	stagedQuery: Query,
	panelType: PANEL_TYPES,
): Query => {
	if (panelType === PANEL_TYPES.LIST || panelType === PANEL_TYPES.TRACE) {
		return getListViewQuery(stagedQuery);
	}
	return stagedQuery;
};

export const getExportQueryData = (
	query: Query,
	panelType: PANEL_TYPES,
	options: OptionsQuery,
): Query => {
	if (panelType === PANEL_TYPES.LIST) {
		const updatedQuery = cloneDeep(query);
		set(
			updatedQuery,
			'builder.queryData[0].selectColumns',
			options.selectColumns,
		);

		return updatedQuery;
	}
	return query;
};
