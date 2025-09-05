import { OPERATORS, PANEL_TYPES } from 'constants/queryBuilder';
import cloneDeep from 'lodash-es/cloneDeep';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

import { addFilterToSelectedQuery, FilterData } from './drilldownUtils';
import { BreakoutAttributeType } from './types';
import { AggregateData } from './useAggregateDrilldown';

export const isEmptyFilterValue = (value: any): boolean =>
	value === '' || value === null || value === undefined || value === 'n/a';

/**
 * Creates filters to add to the query from table columns for view mode navigation
 */
export const getFiltersToAddToView = (clickedData: any): FilterData[] => {
	if (!clickedData) {
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

export const getBreakoutPanelType = (
	// breakoutQuery: Query,
	currentPanelType?: PANEL_TYPES,
	// groupBy?: BreakoutAttributeType,
): PANEL_TYPES => {
	// // Check if the query is grouped by a number data type
	// const hasNumberGroupBy = groupBy?.dataType === 'number';

	// if (hasNumberGroupBy) {
	// 	return PANEL_TYPES.HISTOGRAM;
	// }

	if (currentPanelType === PANEL_TYPES.VALUE) {
		return PANEL_TYPES.TABLE;
	}

	return currentPanelType || PANEL_TYPES.TIME_SERIES;
};

/**
 * Creates a breakout query by adding filters and updating the groupBy
 */
export const getBreakoutQuery = (
	query: Query,
	aggregateData: AggregateData | null,
	groupBy: BreakoutAttributeType,
	filtersToAdd: FilterData[],
): Query => {
	if (!aggregateData) {
		return query;
	}

	const queryWithFilters = addFilterToSelectedQuery(
		query,
		filtersToAdd,
		aggregateData.queryName,
	);
	const newQuery = cloneDeep(queryWithFilters);

	// Filter to keep only the query that matches queryName
	newQuery.builder.queryData = newQuery.builder.queryData
		.filter((item: IBuilderQuery) => item.queryName === aggregateData.queryName)
		.map((item: IBuilderQuery) => ({
			...item,
			groupBy: [{ key: groupBy.key, type: groupBy.type } as BaseAutocompleteData],
			orderBy: [],
			legend: item.legend && groupBy.key ? `{{${groupBy.key}}}` : '',
		}));

	return newQuery;
};
