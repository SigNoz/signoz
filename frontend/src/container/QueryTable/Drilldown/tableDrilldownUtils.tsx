import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import {
	initialQueryBuilderFormValuesMap,
	OPERATORS,
} from 'constants/queryBuilder';
import cloneDeep from 'lodash-es/cloneDeep';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import {
	addFilterToSelectedQuery,
	FilterData,
	getBaseMeta,
} from './drilldownUtils';
import { AggregateData } from './useAggregateDrilldown';
/**
 * Gets the query data that matches the aggregate data's queryName
 */
export const getQueryData = (
	query: Query,
	aggregateData: AggregateData | null,
): IBuilderQuery => {
	if (!aggregateData) {
		console.warn('aggregateData is null in getQueryData');
		return initialQueryBuilderFormValuesMap.logs;
	}

	const queryData = query?.builder?.queryData?.filter(
		(item: IBuilderQuery) => item.queryName === aggregateData.queryName,
	);
	return queryData[0];
};

export const isEmptyFilterValue = (value: any): boolean =>
	value === '' || value === null || value === undefined || value === 'n/a';

/**
 * Creates filters to add to the query from table columns for view mode navigation
 */
export const getFiltersToAddToView = (clickedData: any): FilterData[] => {
	if (!clickedData) {
		console.warn('clickedData is null in getFiltersToAddToView');
		return [];
	}

	return (
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
			}, []) || []
	);
};

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
	aggregateData: AggregateData | null,
	groupBy: BaseAutocompleteData,
	filtersToAdd: FilterData[],
): Query => {
	if (!aggregateData) {
		console.warn('aggregateData is null in getBreakoutQuery');
		return query;
	}

	console.log('>> groupBy', groupBy);
	console.log('>> aggregateData', aggregateData);
	console.log('>> query', query);

	const queryWithFilters = addFilterToSelectedQuery(
		query,
		filtersToAdd,
		aggregateData.queryName,
	);
	const newQuery = cloneDeep(queryWithFilters);

	newQuery.builder.queryData = newQuery.builder.queryData.map(
		(item: IBuilderQuery) => {
			if (item.queryName === aggregateData.queryName) {
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
