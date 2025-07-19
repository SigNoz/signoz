import { OPERATORS } from 'constants/queryBuilder';
import cloneDeep from 'lodash-es/cloneDeep';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

import { addFilterToSelectedQuery, FilterData } from './drilldownUtils';
import { AggregateData } from './useAggregateDrilldown';

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
