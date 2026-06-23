/* eslint-disable sonarjs/no-identical-functions */
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { OPERATORS } from 'constants/antlrQueryConstants';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { cloneDeep, isArray } from 'lodash-es';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { isKeyMatch } from './utils';

export const SELECTED_OPERATORS = [OPERATORS['='], 'in'];
export const NON_SELECTED_OPERATORS = [OPERATORS['!='], 'not in', 'nin'];

// Sources that use backend APIs expecting short operator format (e.g., 'nin' instead of 'not in')
const SOURCES_WITH_SHORT_OPERATORS = [QuickFiltersSource.INFRA_MONITORING];

/**
 * Returns the correct NOT_IN operator value based on source.
 * InfraMonitoring backend expects 'nin', others expect 'not in'.
 */
export function getNotInOperator(source: QuickFiltersSource): string {
	if (SOURCES_WITH_SHORT_OPERATORS.includes(source)) {
		return 'nin';
	}
	return getOperatorValue('NOT_IN');
}

function setDefaultValues(
	values: string[],
	trueOrFalse: boolean,
): Record<string, boolean> {
	const defaultState: Record<string, boolean> = {};
	values.forEach((val) => {
		defaultState[val] = trueOrFalse;
	});
	return defaultState;
}

/**
 * Derives the checked/unchecked state for each attribute value by reading the
 * active filter clause for this attribute key out of the query.
 *
 * - No matching clause -> every value is checked (all selected).
 * - IN / `=` clause     -> only the listed values are checked.
 * - NOT IN / `!=` clause -> every value is checked except the excluded ones.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function deriveCheckboxState({
	attributeValues,
	filterItems,
	filterKey,
}: {
	attributeValues: string[];
	filterItems: TagFilterItem[] | undefined;
	filterKey: string;
}): Record<string, boolean> {
	let filterState: Record<string, boolean> = setDefaultValues(
		attributeValues,
		false,
	);
	const filterSync = filterItems?.find((item) =>
		isKeyMatch(item.key?.key, filterKey),
	);

	if (filterSync) {
		if (SELECTED_OPERATORS.includes(filterSync.op)) {
			if (isArray(filterSync.value)) {
				filterSync.value.forEach((val) => {
					filterState[String(val)] = true;
				});
			} else if (typeof filterSync.value === 'string') {
				filterState[filterSync.value] = true;
			} else if (typeof filterSync.value === 'boolean') {
				filterState[String(filterSync.value)] = true;
			} else if (typeof filterSync.value === 'number') {
				filterState[String(filterSync.value)] = true;
			}
		} else if (NON_SELECTED_OPERATORS.includes(filterSync.op)) {
			filterState = setDefaultValues(attributeValues, true);
			if (isArray(filterSync.value)) {
				filterSync.value.forEach((val) => {
					filterState[String(val)] = false;
				});
			} else if (typeof filterSync.value === 'string') {
				filterState[filterSync.value] = false;
			} else if (typeof filterSync.value === 'boolean') {
				filterState[String(filterSync.value)] = false;
			} else if (typeof filterSync.value === 'number') {
				filterState[String(filterSync.value)] = false;
			}
		}
	} else {
		filterState = setDefaultValues(attributeValues, true);
	}
	return filterState;
}

/**
 * Returns a new query with every clause for this attribute key removed, both
 * from the structured filter items and the raw filter expression.
 */
export function clearFilterFromQuery({
	currentQuery,
	filter,
	activeQueryIndex,
}: {
	currentQuery: Query;
	filter: IQuickFiltersConfig;
	activeQueryIndex: number;
}): Query {
	return {
		...currentQuery,
		builder: {
			...currentQuery.builder,
			queryData: currentQuery.builder.queryData.map((item, idx) => ({
				...item,
				filter: {
					expression: removeKeysFromExpression(item.filter?.expression ?? '', [
						filter.attributeKey.key,
					]),
				},
				filters: {
					...item.filters,
					items:
						idx === activeQueryIndex
							? item.filters?.items?.filter(
									(fil) => !isKeyMatch(fil.key?.key, filter.attributeKey.key),
								) || []
							: [...(item.filters?.items || [])],
					op: item.filters?.op || 'AND',
				},
			})),
		},
	};
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function applyCheckboxToggle({
	currentQuery,
	activeQueryIndex,
	filter,
	source,
	attributeValues,
	value,
	checked,
	isOnlyOrAllClicked,
}: {
	currentQuery: Query;
	activeQueryIndex: number;
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	attributeValues: string[];
	value: string;
	checked: boolean;
	isOnlyOrAllClicked: boolean;
}): Query {
	const activeItems =
		currentQuery.builder.queryData?.[activeQueryIndex]?.filters?.items;

	const isSomeFilterPresentForCurrentAttribute = !!activeItems?.some((item) =>
		isKeyMatch(item.key?.key, filter.attributeKey.key),
	);

	const currentFilterState = deriveCheckboxState({
		attributeValues,
		filterItems: activeItems,
		filterKey: filter.attributeKey.key,
	});

	const isMultipleValuesTrueForTheKey =
		Object.values(currentFilterState).filter((val) => val).length > 1;

	const query = cloneDeep(currentQuery.builder.queryData?.[activeQueryIndex]);

	// if only or all are clicked we do not need to worry about anything just override whatever we have
	// by either adding a new IN operator value clause in case of ONLY or remove everything we have for ALL.
	if (isOnlyOrAllClicked && query?.filters?.items) {
		const isOnlyOrAll = isSomeFilterPresentForCurrentAttribute
			? currentFilterState[value] && !isMultipleValuesTrueForTheKey
				? 'All'
				: 'Only'
			: 'Only';
		query.filters.items = query.filters.items.filter(
			(q) => !isKeyMatch(q.key?.key, filter.attributeKey.key),
		);

		if (query.filter?.expression) {
			query.filter.expression = removeKeysFromExpression(query.filter.expression, [
				filter.attributeKey.key,
			]);
		}

		if (isOnlyOrAll === 'Only') {
			const newFilterItem: TagFilterItem = {
				id: uuid(),
				op: getOperatorValue(OPERATORS.IN),
				key: filter.attributeKey,
				value,
			};
			query.filters.items = [...query.filters.items, newFilterItem];
		}
	} else if (query?.filters?.items) {
		if (
			query.filters?.items?.some((item) =>
				isKeyMatch(item.key?.key, filter.attributeKey.key),
			)
		) {
			// if there is already a running filter for the current attribute key then
			// we split the cases by which particular operator is present right now!
			const currentFilter = query.filters?.items?.find((q) =>
				isKeyMatch(q.key?.key, filter.attributeKey.key),
			);
			if (currentFilter) {
				const runningOperator = currentFilter?.op;
				switch (runningOperator) {
					case 'in':
						if (checked) {
							// if it's an IN operator then if we are checking another value it get's added to the
							// filter clause. example -  key IN [value1, currentSelectedValue]
							if (isArray(currentFilter.value)) {
								const newFilter = {
									...currentFilter,
									value: [...currentFilter.value, value],
								};
								query.filters.items = query.filters.items.map((item) => {
									if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							} else {
								// if the current state wasn't an array we make it one and add our value
								const newFilter = {
									...currentFilter,
									value: [currentFilter.value as string, value],
								};
								query.filters.items = query.filters.items.map((item) => {
									if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							}
						} else if (!checked) {
							// if we are removing some value when the running operator is IN we filter.
							// example - key IN [value1,currentSelectedValue] becomes key IN [value1] in case of array
							if (isArray(currentFilter.value)) {
								const newFilter = {
									...currentFilter,
									value: currentFilter.value.filter((val) => val !== value),
								};

								if (newFilter.value.length === 0) {
									query.filters.items = query.filters.items.filter(
										(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
									);
								} else {
									query.filters.items = query.filters.items.map((item) => {
										if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
											return newFilter;
										}
										return item;
									});
								}
							} else {
								// if not an array remove the whole thing altogether!
								query.filters.items = query.filters.items.filter(
									(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
								);
							}
						}
						break;
					case 'nin':
					case 'not in':
						// if the current running operator is NIN then when unchecking the value it gets
						// added to the clause like key NIN [value1 , currentUnselectedValue]
						if (!checked) {
							// in case of array add the currentUnselectedValue to the list.
							if (isArray(currentFilter.value)) {
								const newFilter = {
									...currentFilter,
									value: [...currentFilter.value, value],
								};
								query.filters.items = query.filters.items.map((item) => {
									if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							} else {
								// in case of not an array make it one!
								const newFilter = {
									...currentFilter,
									value: [currentFilter.value as string, value],
								};
								query.filters.items = query.filters.items.map((item) => {
									if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							}
						} else if (checked) {
							// opposite of above!
							if (isArray(currentFilter.value)) {
								const newFilter = {
									...currentFilter,
									value: currentFilter.value.filter((val) => val !== value),
								};
								if (newFilter.value.length === 0) {
									query.filters.items = query.filters.items.filter(
										(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
									);
									if (query.filter?.expression) {
										query.filter.expression = removeKeysFromExpression(
											query.filter.expression,
											[filter.attributeKey.key],
										);
									}
								} else {
									query.filters.items = query.filters.items.map((item) => {
										if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
											return newFilter;
										}
										return item;
									});
								}
							} else {
								const newFilter = {
									...currentFilter,
									value: currentFilter.value === value ? null : currentFilter.value,
								};
								if (newFilter.value === null && query.filter?.expression) {
									query.filter.expression = removeKeysFromExpression(
										query.filter.expression,
										[filter.attributeKey.key],
									);
								}
								query.filters.items = query.filters.items.filter(
									(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
								);
							}
						}
						break;
					case '=':
						if (checked) {
							const newFilter = {
								...currentFilter,
								op: getOperatorValue(OPERATORS.IN),
								value: [currentFilter.value as string, value],
							};
							query.filters.items = query.filters.items.map((item) => {
								if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
									return newFilter;
								}
								return item;
							});
						} else if (!checked) {
							query.filters.items = query.filters.items.filter(
								(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
							);
						}
						break;
					case '!=':
						if (!checked) {
							const newFilter = {
								...currentFilter,
								op: getNotInOperator(source),
								value: [currentFilter.value as string, value],
							};
							query.filters.items = query.filters.items.map((item) => {
								if (isKeyMatch(item.key?.key, filter.attributeKey.key)) {
									return newFilter;
								}
								return item;
							});
						} else if (checked) {
							query.filters.items = query.filters.items.filter(
								(item) => !isKeyMatch(item.key?.key, filter.attributeKey.key),
							);
						}
						break;
					default:
						break;
				}
			}
		} else {
			// case  - when there is no filter for the current key that means all are selected right now.
			const newFilterItem: TagFilterItem = {
				id: uuid(),
				op: getNotInOperator(source),
				key: filter.attributeKey,
				value,
			};
			query.filters.items = [...query.filters.items, newFilterItem];
		}
	}

	return {
		...currentQuery,
		builder: {
			...currentQuery.builder,
			queryData: [
				...currentQuery.builder.queryData.map((q, idx) => {
					if (idx === activeQueryIndex) {
						return query;
					}
					return q;
				}),
			],
		},
	};
}
