/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Checkbox.styles.scss';

import { Button, Checkbox, Input, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { OPERATORS } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { cloneDeep, isArray, isEmpty, isEqual, isFunction } from 'lodash-es';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import LogsQuickFilterEmptyState from './LogsQuickFilterEmptyState';

const SELECTED_OPERATORS = [OPERATORS['='], 'in'];
const NON_SELECTED_OPERATORS = [OPERATORS['!='], 'nin'];

const SOURCES_WITH_EMPTY_STATE_ENABLED = [QuickFiltersSource.LOGS_EXPLORER];

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
interface ICheckboxProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function CheckboxFilter(props: ICheckboxProps): JSX.Element {
	const { source, filter, onFilterChange } = props;
	const [searchText, setSearchText] = useState<string>('');
	const [isOpen, setIsOpen] = useState<boolean>(filter.defaultOpen);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(10);

	const {
		lastUsedQuery,
		currentQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const { data, isLoading } = useGetAggregateValues(
		{
			aggregateOperator: filter.aggregateOperator || 'noop',
			dataSource: filter.dataSource || DataSource.LOGS,
			aggregateAttribute: filter.aggregateAttribute || '',
			attributeKey: filter.attributeKey.key,
			filterAttributeKeyDataType: filter.attributeKey.dataType || DataTypes.EMPTY,
			tagType: filter.attributeKey.type || '',
			searchText: searchText ?? '',
		},
		{
			enabled: isOpen,
			keepPreviousData: true,
		},
	);

	const attributeValues: string[] = useMemo(
		() =>
			((Object.values(data?.payload || {}).find((el) => !!el) ||
				[]) as string[]).filter((val) => !isEmpty(val)),
		[data?.payload],
	);
	const currentAttributeKeys = attributeValues.slice(0, visibleItemsCount);

	const setSearchTextDebounced = useDebouncedFn((...args) => {
		setSearchText(args[0] as string);
	}, DEBOUNCE_DELAY);

	// derive the state of each filter key here in the renderer itself and keep it in sync with current query
	// also we need to keep a note of last focussed query.
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const currentFilterState = useMemo(() => {
		let filterState: Record<string, boolean> = setDefaultValues(
			attributeValues,
			false,
		);
		const filterSync = currentQuery?.builder.queryData?.[
			lastUsedQuery || 0
		]?.filters?.items.find((item) =>
			isEqual(item.key?.key, filter.attributeKey.key),
		);

		if (filterSync) {
			if (SELECTED_OPERATORS.includes(filterSync.op)) {
				if (isArray(filterSync.value)) {
					filterSync.value.forEach((val) => {
						filterState[val] = true;
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
						filterState[val] = false;
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
	}, [
		attributeValues,
		currentQuery?.builder.queryData,
		filter.attributeKey,
		lastUsedQuery,
	]);

	// disable the filter when there are multiple entries of the same attribute key present in the filter bar
	const isFilterDisabled = useMemo(
		() =>
			(currentQuery?.builder?.queryData?.[
				lastUsedQuery || 0
			]?.filters?.items?.filter((item) =>
				isEqual(item.key?.key, filter.attributeKey.key),
			)?.length || 0) > 1,

		[currentQuery?.builder?.queryData, lastUsedQuery, filter.attributeKey],
	);

	// variable to check if the current filter has multiple values to its name in the key op value section
	const isMultipleValuesTrueForTheKey =
		Object.values(currentFilterState).filter((val) => val).length > 1;

	const handleClearFilterAttribute = (): void => {
		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item, idx) => ({
					...item,
					filters: {
						...item.filters,
						items:
							idx === lastUsedQuery
								? item.filters.items.filter(
										(fil) => !isEqual(fil.key?.key, filter.attributeKey.key),
								  )
								: [...item.filters.items],
					},
				})),
			},
		};

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(preparedQuery);
		} else {
			redirectWithQueryBuilderData(preparedQuery);
		}
	};

	const isSomeFilterPresentForCurrentAttribute = currentQuery.builder.queryData?.[
		lastUsedQuery || 0
	]?.filters?.items?.some((item) =>
		isEqual(item.key?.key, filter.attributeKey.key),
	);

	const onChange = (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): void => {
		const query = cloneDeep(currentQuery.builder.queryData?.[lastUsedQuery || 0]);

		// if only or all are clicked we do not need to worry about anything just override whatever we have
		// by either adding a new IN operator value clause in case of ONLY or remove everything we have for ALL.
		if (isOnlyOrAllClicked && query?.filters?.items) {
			const isOnlyOrAll = isSomeFilterPresentForCurrentAttribute
				? currentFilterState[value] && !isMultipleValuesTrueForTheKey
					? 'All'
					: 'Only'
				: 'Only';
			query.filters.items = query.filters.items.filter(
				(q) => !isEqual(q.key?.key, filter.attributeKey.key),
			);
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
					isEqual(item.key?.key, filter.attributeKey.key),
				)
			) {
				// if there is already a running filter for the current attribute key then
				// we split the cases by which particular operator is present right now!
				const currentFilter = query.filters?.items?.find((q) =>
					isEqual(q.key?.key, filter.attributeKey.key),
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
										if (isEqual(item.key?.key, filter.attributeKey.key)) {
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
										if (isEqual(item.key?.key, filter.attributeKey.key)) {
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
											(item) => !isEqual(item.key?.key, filter.attributeKey.key),
										);
									} else {
										query.filters.items = query.filters.items.map((item) => {
											if (isEqual(item.key?.key, filter.attributeKey.key)) {
												return newFilter;
											}
											return item;
										});
									}
								} else {
									// if not an array remove the whole thing altogether!
									query.filters.items = query.filters.items.filter(
										(item) => !isEqual(item.key?.key, filter.attributeKey.key),
									);
								}
							}
							break;
						case 'nin':
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
										if (isEqual(item.key?.key, filter.attributeKey.key)) {
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
										if (isEqual(item.key?.key, filter.attributeKey.key)) {
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
											(item) => !isEqual(item.key?.key, filter.attributeKey.key),
										);
									} else {
										query.filters.items = query.filters.items.map((item) => {
											if (isEqual(item.key?.key, filter.attributeKey.key)) {
												return newFilter;
											}
											return item;
										});
									}
								} else {
									query.filters.items = query.filters.items.filter(
										(item) => !isEqual(item.key?.key, filter.attributeKey.key),
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
									if (isEqual(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							} else if (!checked) {
								query.filters.items = query.filters.items.filter(
									(item) => !isEqual(item.key?.key, filter.attributeKey.key),
								);
							}
							break;
						case '!=':
							if (!checked) {
								const newFilter = {
									...currentFilter,
									op: getOperatorValue(OPERATORS.NIN),
									value: [currentFilter.value as string, value],
								};
								query.filters.items = query.filters.items.map((item) => {
									if (isEqual(item.key?.key, filter.attributeKey.key)) {
										return newFilter;
									}
									return item;
								});
							} else if (checked) {
								query.filters.items = query.filters.items.filter(
									(item) => !isEqual(item.key?.key, filter.attributeKey.key),
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
					op: getOperatorValue(OPERATORS.NIN),
					key: filter.attributeKey,
					value,
				};
				query.filters.items = [...query.filters.items, newFilterItem];
			}
		}
		const finalQuery = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					...currentQuery.builder.queryData.map((q, idx) => {
						if (idx === lastUsedQuery) {
							return query;
						}
						return q;
					}),
				],
			},
		};

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(finalQuery);
		} else {
			redirectWithQueryBuilderData(finalQuery);
		}
	};

	const isEmptyStateWithDocsEnabled =
		SOURCES_WITH_EMPTY_STATE_ENABLED.includes(source) &&
		!searchText &&
		!attributeValues.length;

	return (
		<div className="checkbox-filter">
			<section
				className="filter-header-checkbox"
				onClick={(): void => {
					if (isOpen) {
						setIsOpen(false);
						setVisibleItemsCount(10);
					} else {
						setIsOpen(true);
					}
				}}
			>
				<section className="left-action">
					{isOpen ? (
						<ChevronDown size={13} cursor="pointer" />
					) : (
						<ChevronRight size={13} cursor="pointer" />
					)}
					<Typography.Text className="title">{filter.title}</Typography.Text>
				</section>
				<section className="right-action">
					{isOpen && !!attributeValues.length && (
						<Typography.Text
							className="clear-all"
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								handleClearFilterAttribute();
							}}
						>
							Clear All
						</Typography.Text>
					)}
				</section>
			</section>
			{isOpen && isLoading && !attributeValues.length && (
				<section className="loading">
					<Skeleton paragraph={{ rows: 4 }} />
				</section>
			)}
			{isOpen && !isLoading && (
				<>
					{!isEmptyStateWithDocsEnabled && (
						<section className="search">
							<Input
								placeholder="Filter values"
								onChange={(e): void => setSearchTextDebounced(e.target.value)}
								disabled={isFilterDisabled}
							/>
						</section>
					)}
					{attributeValues.length > 0 ? (
						<section className="values">
							{currentAttributeKeys.map((value: string) => (
								<div key={value} className="value">
									<Checkbox
										onChange={(e): void => onChange(value, e.target.checked, false)}
										checked={currentFilterState[value]}
										disabled={isFilterDisabled}
										rootClassName="check-box"
									/>

									<div
										className={cx(
											'checkbox-value-section',
											isFilterDisabled ? 'filter-disabled' : '',
										)}
										onClick={(): void => {
											if (isFilterDisabled) {
												return;
											}
											onChange(value, currentFilterState[value], true);
										}}
									>
										{filter.customRendererForValue ? (
											filter.customRendererForValue(value)
										) : (
											<Typography.Text
												className="value-string"
												ellipsis={{ tooltip: { placement: 'right' } }}
											>
												{value}
											</Typography.Text>
										)}
										<Button type="text" className="only-btn">
											{isSomeFilterPresentForCurrentAttribute
												? currentFilterState[value] && !isMultipleValuesTrueForTheKey
													? 'All'
													: 'Only'
												: 'Only'}
										</Button>
										<Button type="text" className="toggle-btn">
											Toggle
										</Button>
									</div>
								</div>
							))}
						</section>
					) : isEmptyStateWithDocsEnabled ? (
						<LogsQuickFilterEmptyState attributeKey={filter.attributeKey.key} />
					) : (
						<section className="no-data">
							<Typography.Text>No values found</Typography.Text>{' '}
						</section>
					)}
					{visibleItemsCount < attributeValues?.length && (
						<section className="show-more">
							<Typography.Text
								className="show-more-text"
								onClick={(): void => setVisibleItemsCount((prev) => prev + 10)}
							>
								Show More...
							</Typography.Text>
						</section>
					)}
				</>
			)}
		</div>
	);
}

CheckboxFilter.defaultProps = {
	onFilterChange: null,
};
