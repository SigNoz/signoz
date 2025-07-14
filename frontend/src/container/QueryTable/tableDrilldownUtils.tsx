import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import {
	initialQueryBuilderFormValuesMap,
	OPERATORS,
} from 'constants/queryBuilder';
import {
	addFilterToSelectedQuery,
	FilterData,
} from 'container/QueryTable/drilldownUtils';
import cloneDeep from 'lodash-es/cloneDeep';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { getBaseMeta } from './drilldownUtils';
/**
 * Gets the query data that matches the clicked column's dataIndex
 */
export const getQueryData = (query: Query, clickedData: any): IBuilderQuery => {
	const queryData = query?.builder?.queryData?.filter(
		(item: IBuilderQuery) => item.queryName === clickedData.column.dataIndex,
	);
	return queryData[0];
};

/**
 * Creates filters to add to the query from columns which are part of the query.builder.queryData[].groupBy
 */
export const getFiltersToAdd = (
	query: Query,
	clickedData: any,
): FilterData[] => {
	const queryData = getQueryData(query, clickedData);
	const { groupBy } = queryData;

	return groupBy.map((item: BaseAutocompleteData) => ({
		filterKey: item.key,
		filterValue: clickedData.record[item.key],
		operator: OPERATORS['='],
	}));
};

export const isEmptyFilterValue = (value: any): boolean =>
	value === '' || value === null || value === undefined || value === 'n/a';

/**
 * Creates filters to add to the query from table columns for view mode navigation
 */
export const getFiltersToAddToView = (clickedData: any): FilterData[] =>
	clickedData?.tableColumns
		?.filter((col: any) => !col.isValueColumn)
		.reduce((acc: FilterData[], col: any) => {
			// only add table col which have isValueColumn false. and the filter value suffices the isEmptyFilterValue condition.
			const { dataIndex } = col;
			if (!dataIndex || typeof dataIndex !== 'string') return acc;
			if (
				clickedData?.column?.isValueColumn &&
				isEmptyFilterValue(clickedData?.record?.[dataIndex])
			)
				return acc;
			return [
				...acc,
				{
					filterKey: dataIndex,
					filterValue: clickedData?.record?.[dataIndex] || '',
					operator: OPERATORS['='],
				},
			];
		}, []) || [];

const VIEW_QUERY_MAP: Record<string, IBuilderQuery> = {
	view_logs: initialQueryBuilderFormValuesMap.logs,
	view_metrics: initialQueryBuilderFormValuesMap.metrics,
	view_traces: initialQueryBuilderFormValuesMap.traces,
};

export const getViewQuery = (
	query: Query,
	filtersToAdd: FilterData[],
	key: string,
): Query | null => {
	const newQuery = cloneDeep(query);

	const queryBuilderData = VIEW_QUERY_MAP[key];

	if (!queryBuilderData) return null;

	newQuery.builder.queryData = [queryBuilderData];

	const filters = filtersToAdd.reduce((acc: any[], filter) => {
		// use existing query to get baseMeta
		const baseMeta = getBaseMeta(query, filter.filterKey);
		if (!baseMeta) return acc;

		acc.push({
			id: uuid(),
			key: baseMeta,
			op: filter.operator,
			value: filter.filterValue,
		});

		return acc;
	}, []);

	newQuery.builder.queryData[0].filters = {
		items: filters,
		op: 'AND',
	};

	newQuery.builder.queryData[0].filter = convertFiltersToExpression({
		items: filters,
		op: 'AND',
	});

	return newQuery;
};

/**
 * Creates a breakout query by adding filters and updating the groupBy
 */
export const getBreakoutQuery = (
	query: Query,
	clickedData: any,
	groupBy: BaseAutocompleteData,
	filtersToAdd: FilterData[],
): Query => {
	console.log('>> groupBy', groupBy);
	console.log('>> clickedData', clickedData);
	console.log('>> query', query);

	const queryWithFilters = addFilterToSelectedQuery(
		query,
		filtersToAdd,
		clickedData.column.dataIndex,
	);
	const newQuery = cloneDeep(queryWithFilters);

	newQuery.builder.queryData = newQuery.builder.queryData.map(
		(item: IBuilderQuery) => {
			if (item.queryName === clickedData.column.dataIndex) {
				return {
					...item,
					groupBy: [groupBy],
				};
			}
			return item;
		},
	);

	console.log('>> breakoutQuery', newQuery);
	return newQuery;
};
