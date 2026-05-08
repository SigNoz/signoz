import React, { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES, QueryBuilderKeys } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { ArrowDownToDot, ArrowUpFromDot } from 'lucide-react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export interface SpanAttributeAction {
	label: string;
	value: string;
	icon?: React.ReactNode;
	disabled?: boolean;
	hidden?: boolean;
	callback: (args: { key: string; value: string; dataType?: string }) => void;
	/** Returns true if this action should be hidden for the given field key */
	shouldHide: (key: string) => boolean;
}

// Keys that should NOT support filter/group-by actions.
// These are system/internal/computed fields, not actual queryable attributes.
export const NON_FILTERABLE_KEYS = new Set([
	'datetime',
	'duration',
	'parent_span_id',
	'has_children',
	'has_sibling',
	'sub_tree_node_count',
	'flags',
	'trace_state',
	'timestamp',
]);

const shouldHideForKey = (key: string): boolean => NON_FILTERABLE_KEYS.has(key);

// Action identifiers
export const SPAN_ACTION = {
	FILTER_IN: 'filter-in',
	FILTER_OUT: 'filter-out',
	GROUP_BY: 'group-by',
} as const;

export function useSpanAttributeActions(): SpanAttributeAction[] {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const queryClient = useQueryClient();

	const getAutocompleteKey = useCallback(
		async (fieldKey: string): Promise<BaseAutocompleteData> => {
			const response = await queryClient.fetchQuery(
				[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
				async () =>
					getAggregateKeys({
						searchText: fieldKey,
						aggregateOperator:
							currentQuery.builder.queryData[0].aggregateOperator || '',
						dataSource: DataSource.TRACES,
						aggregateAttribute:
							currentQuery.builder.queryData[0].aggregateAttribute?.key || '',
					}),
			);

			return chooseAutocompleteFromCustomValue(
				response.payload?.attributeKeys || [],
				fieldKey,
				DataTypes.String,
			);
		},
		[queryClient, currentQuery.builder.queryData],
	);

	const handleFilter = useCallback(
		async (
			{ key, value }: { key: string; value: string },
			operator: string,
		): Promise<void> => {
			try {
				const autocompleteKey = await getAutocompleteKey(key);
				const resolvedOperator = getOperatorValue(operator);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => {
							const cleanedFilters = (item.filters?.items || []).filter(
								(f) => f.key?.key !== autocompleteKey.key,
							);
							const newFilters = [
								...cleanedFilters,
								{
									id: uuid(),
									key: autocompleteKey,
									op: resolvedOperator,
									value,
								},
							];
							const converted = convertFiltersToExpressionWithExistingQuery(
								{ items: newFilters, op: item.filters?.op || 'AND' },
								item.filter?.expression || '',
							);
							return {
								...item,
								dataSource: DataSource.TRACES,
								filters: converted.filters,
								filter: converted.filter,
							};
						}),
					},
				};

				redirectWithQueryBuilderData(
					nextQuery,
					{ panelTypes: PANEL_TYPES.LIST },
					ROUTES.TRACES_EXPLORER,
				);
			} catch {
				toast.error(SOMETHING_WENT_WRONG, { position: 'top-right' });
			}
		},
		[currentQuery, getAutocompleteKey, redirectWithQueryBuilderData],
	);

	const handleFilterIn = useCallback(
		(args: { key: string; value: string }): void => {
			handleFilter(args, '=');
		},
		[handleFilter],
	);

	const handleFilterOut = useCallback(
		(args: { key: string; value: string }): void => {
			handleFilter(args, '!=');
		},
		[handleFilter],
	);

	const handleGroupBy = useCallback(
		async ({ key }: { key: string }): Promise<void> => {
			try {
				const autocompleteKey = await getAutocompleteKey(key);

				const nextQuery: Query = {
					...currentQuery,
					builder: {
						...currentQuery.builder,
						queryData: currentQuery.builder.queryData.map((item) => ({
							...item,
							dataSource: DataSource.TRACES,
							groupBy: [...item.groupBy, autocompleteKey],
						})),
					},
				};

				redirectWithQueryBuilderData(
					nextQuery,
					{ panelTypes: PANEL_TYPES.TIME_SERIES },
					ROUTES.TRACES_EXPLORER,
				);
			} catch {
				toast.error(SOMETHING_WENT_WRONG, { position: 'top-right' });
			}
		},
		[currentQuery, getAutocompleteKey, redirectWithQueryBuilderData],
	);

	return [
		{
			label: 'Filter for value',
			value: SPAN_ACTION.FILTER_IN,
			icon: React.createElement(ArrowDownToDot, {
				size: 14,
				style: { transform: 'rotate(90deg)' },
			}),
			callback: handleFilterIn,
			shouldHide: shouldHideForKey,
		},
		{
			label: 'Filter out value',
			value: SPAN_ACTION.FILTER_OUT,
			icon: React.createElement(ArrowUpFromDot, {
				size: 14,
				style: { transform: 'rotate(90deg)' },
			}),
			callback: handleFilterOut,
			shouldHide: shouldHideForKey,
		},
		{
			label: 'Group by attribute',
			value: SPAN_ACTION.GROUP_BY,
			icon: React.createElement(GroupByIcon),
			callback: handleGroupBy,
			shouldHide: shouldHideForKey,
		},
	];
}
