import React, { useCallback } from 'react';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearchV2/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { ArrowDownToDot, ArrowUpFromDot } from '@signozhq/icons';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export interface SpanAttributeAction {
	label: string;
	value: string;
	icon?: React.ReactElement;
	disabled?: boolean;
	hidden?: boolean;
	callback: (args: { key: string; value: string }) => void;
	/**
	 * Returns true if this action should be hidden. Receives the leaf key and
	 * the full path so we can hide based on ancestor segments too.
	 */
	shouldHide: (key: string, fieldKeyPath: (string | number)[]) => boolean;
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

// Keys whose entire subtree is non-queryable. Hides filter/group-by for the
// key itself AND any descendant leaf. Used for nested data that exists on the
// span payload but isn't queryable as a trace attribute (e.g. span events, links).
export const NON_FILTERABLE_ANCESTOR_KEYS = new Set(['events', 'references']);

const shouldHideForKey = (
	leafKey: string,
	fieldKeyPath: (string | number)[],
): boolean =>
	NON_FILTERABLE_KEYS.has(leafKey) ||
	fieldKeyPath.some(
		(seg) => typeof seg === 'string' && NON_FILTERABLE_ANCESTOR_KEYS.has(seg),
	);

// Action identifiers
export const SPAN_ACTION = {
	FILTER_IN: 'filter-in',
	FILTER_OUT: 'filter-out',
	GROUP_BY: 'group-by',
} as const;

export function useSpanAttributeActions(): SpanAttributeAction[] {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const handleFilter = useCallback(
		({ key, value }: { key: string; value: string }, operator: string): void => {
			const filterKey = chooseAutocompleteFromCustomValue([], key);
			const resolvedOperator = getOperatorValue(operator);

			const nextQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => {
						const cleanedFilters = (item.filters?.items || []).filter(
							(f) => f.key?.key !== filterKey.key,
						);
						const newFilters = [
							...cleanedFilters,
							{
								id: uuid(),
								key: filterKey,
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
		},
		[currentQuery, redirectWithQueryBuilderData],
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
		({ key }: { key: string }): void => {
			const groupByKey = chooseAutocompleteFromCustomValue([], key);

			const nextQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => ({
						...item,
						dataSource: DataSource.TRACES,
						groupBy: [...item.groupBy, groupByKey],
					})),
				},
			};

			redirectWithQueryBuilderData(
				nextQuery,
				{ panelTypes: PANEL_TYPES.TIME_SERIES },
				ROUTES.TRACES_EXPLORER,
			);
		},
		[currentQuery, redirectWithQueryBuilderData],
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
