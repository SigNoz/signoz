/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Checkbox.styles.scss';

import { Button, Checkbox, Input, InputRef, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { OPERATORS } from 'constants/antlrQueryConstants';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryKeyValueSuggestions } from 'hooks/querySuggestions/useGetQueryKeyValueSuggestions';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { cloneDeep, isArray, isEqual, isFunction } from 'lodash-es';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import LogsQuickFilterEmptyState from './LogsQuickFilterEmptyState';

const SELECTED_OPERATORS = [OPERATORS['='], 'in'];
const NON_SELECTED_OPERATORS = [OPERATORS['!='], 'not in'];

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
	// null = no user action, true = user opened, false = user closed
	const [userToggleState, setUserToggleState] = useState<boolean | null>(null);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(10);

	const {
		lastUsedQuery,
		currentQuery,
		redirectWithQueryBuilderData,
		panelType,
	} = useQueryBuilder();

	// Get time range from Redux global state
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// Convert nanoseconds to milliseconds
	const startUnixMilli = useMemo(() => Math.floor(minTime / 1000000), [minTime]);
	const endUnixMilli = useMemo(() => Math.floor(maxTime / 1000000), [maxTime]);

	// Determine if we're in ListView mode
	const isListView = panelType === PANEL_TYPES.LIST;
	// In ListView mode, use index 0 for most sources; for TRACES_EXPLORER, use lastUsedQuery
	// Otherwise use lastUsedQuery for non-ListView modes
	const activeQueryIndex = useMemo(() => {
		if (isListView) {
			return source === QuickFiltersSource.TRACES_EXPLORER
				? lastUsedQuery || 0
				: 0;
		}
		return lastUsedQuery || 0;
	}, [isListView, source, lastUsedQuery]);

	// Extract current filter expression for the active query
	const currentFilterExpression = useMemo(() => {
		const queryData = currentQuery.builder.queryData?.[activeQueryIndex];
		return queryData?.filter?.expression || '';
	}, [currentQuery.builder.queryData, activeQueryIndex]);

	// Check if this filter has active filters in the query
	const isSomeFilterPresentForCurrentAttribute = useMemo(
		() =>
			currentQuery.builder.queryData?.[
				activeQueryIndex
			]?.filters?.items?.some((item) =>
				isEqual(item.key?.key, filter.attributeKey.key),
			),
		[currentQuery.builder.queryData, activeQueryIndex, filter.attributeKey.key],
	);

	// Derive isOpen from filter state + user action
	const isOpen = useMemo(() => {
		// If user explicitly toggled, respect that
		if (userToggleState !== null) {
			return userToggleState;
		}

		// Auto-open if this filter has active filters in the query
		if (isSomeFilterPresentForCurrentAttribute) {
			return true;
		}

		// Otherwise use default behavior (first 2 filters open)
		return filter.defaultOpen;
	}, [
		userToggleState,
		isSomeFilterPresentForCurrentAttribute,
		filter.defaultOpen,
	]);

	const {
		data: keyValueSuggestions,
		isLoading: isLoadingKeyValueSuggestions,
		refetch: refetchKeyValueSuggestions,
	} = useGetQueryKeyValueSuggestions({
		key: filter.attributeKey.key,
		signal: filter.dataSource || DataSource.LOGS,
		signalSource: source || '',
		startUnixMilli,
		endUnixMilli,
		searchText: searchText || '',
		existingQuery: currentFilterExpression,
		options: {
			enabled: isOpen,
			keepPreviousData: true,
		},
	});

	const searchInputRef = useRef<InputRef | null>(null);
	const searchContainerRef = useRef<HTMLDivElement | null>(null);
	const previousFiltersItemsRef = useRef(
		currentQuery.builder.queryData?.[activeQueryIndex]?.filters?.items,
	);

	// Refetch when filters.items changes (query_range API call)
	// Watch for when filters.items is different from previous value, indicating query run
	useEffect(() => {
		const currentFiltersItems =
			currentQuery.builder.queryData?.[activeQueryIndex]?.filters?.items;

		const previousFiltersItems = previousFiltersItemsRef.current;

		// Check if filters items have changed (not the same)
		const filtersWereReset = !isEqual(previousFiltersItems, currentFiltersItems);

		if (isOpen && filtersWereReset) {
			previousFiltersItemsRef.current = currentFiltersItems;
			refetchKeyValueSuggestions();
		} else {
			previousFiltersItemsRef.current = currentFiltersItems;
		}
	}, [
		activeQueryIndex,
		isOpen,
		refetchKeyValueSuggestions,
		filter.attributeKey.key,
		currentQuery.builder.queryData,
	]);

	const handleSearchPromptClick = useCallback((): void => {
		if (searchContainerRef.current) {
			searchContainerRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		}
		if (searchInputRef.current) {
			setTimeout(() => searchInputRef.current?.focus({ cursor: 'end' }), 120);
		}
	}, []);

	const isDataComplete = useMemo(() => {
		if (keyValueSuggestions) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const responseData = keyValueSuggestions?.data as any;
			return responseData.data?.complete || false;
		}
		return false;
	}, [keyValueSuggestions]);

	const attributeValues: string[] = useMemo(() => {
		// const dataType = filter.attributeKey.dataType || DataTypes.String;

		if (keyValueSuggestions) {
			// Process the response data for all pages
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const responseData = keyValueSuggestions?.data as any;
			const values = responseData.data?.values || {};
			const relatedValues = values.relatedValues || [];
			const stringValues = values.stringValues || [];
			const numberValues = values.numberValues || [];

			// Use relatedValues if present, otherwise fallback to stringValues
			const valuesToUse = relatedValues.length > 0 ? relatedValues : stringValues;

			// Generate options from string values - explicitly handle empty strings
			const stringOptions = valuesToUse
				// Strict filtering for empty string - we'll handle it as a special case if needed
				.filter(
					(value: string | null | undefined): value is string =>
						value !== null && value !== undefined && value !== '',
				);

			// Generate options from number values
			const numberOptions = numberValues
				.filter(
					(value: number | null | undefined): value is number =>
						value !== null && value !== undefined,
				)
				.map((value: number) => value.toString());

			// Combine all options and make sure we don't have duplicate labels
			return [...stringOptions, ...numberOptions];
		}
		return [];
	}, [keyValueSuggestions]);

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
			activeQueryIndex
		]?.filters?.items.find((item) =>
			isEqual(item.key?.key, filter.attributeKey.key),
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
	}, [
		attributeValues,
		currentQuery?.builder.queryData,
		filter.attributeKey,
		activeQueryIndex,
	]);

	// disable the filter when there are multiple entries of the same attribute key present in the filter bar
	const isFilterDisabled = useMemo(
		() =>
			(currentQuery?.builder?.queryData?.[
				activeQueryIndex
			]?.filters?.items?.filter((item) =>
				isEqual(item.key?.key, filter.attributeKey.key),
			)?.length || 0) > 1,

		[currentQuery?.builder?.queryData, activeQueryIndex, filter.attributeKey],
	);

	// variable to check if the current filter has multiple values to its name in the key op value section
	const isMultipleValuesTrueForTheKey =
		Object.values(currentFilterState).filter((val) => val).length > 1;

	// Sort checked items to the top; always show unchecked items beneath, regardless of pagination
	const {
		visibleCheckedValues,
		uncheckedValues,
		visibleCheckedCount,
		hasMoreChecked,
	} = useMemo(() => {
		const checkedValues = attributeValues.filter(
			(val) => currentFilterState[val],
		);
		const unchecked = attributeValues.filter((val) => !currentFilterState[val]);
		const visibleChecked = checkedValues.slice(0, visibleItemsCount);

		return {
			visibleCheckedValues: visibleChecked,
			uncheckedValues: unchecked,
			visibleCheckedCount: visibleChecked.length,
			hasMoreChecked: checkedValues.length > visibleChecked.length,
		};
	}, [attributeValues, currentFilterState, visibleItemsCount]);

	const handleClearFilterAttribute = (): void => {
		const preparedQuery: Query = {
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
										(fil) => !isEqual(fil.key?.key, filter.attributeKey.key),
								  ) || []
								: [...(item.filters?.items || [])],
						op: item.filters?.op || 'AND',
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

	const onChange = (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): void => {
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
				(q) => !isEqual(q.key?.key, filter.attributeKey.key),
			);

			if (query.filter?.expression) {
				query.filter.expression = removeKeysFromExpression(
					query.filter.expression,
					[filter.attributeKey.key],
				);
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
										if (query.filter?.expression) {
											query.filter.expression = removeKeysFromExpression(
												query.filter.expression,
												[filter.attributeKey.key],
											);
										}
									} else {
										query.filters.items = query.filters.items.map((item) => {
											if (isEqual(item.key?.key, filter.attributeKey.key)) {
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
									op: getOperatorValue('NOT_IN'),
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
					op: getOperatorValue('NOT_IN'),
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
						if (idx === activeQueryIndex) {
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
						setUserToggleState(false);
						setVisibleItemsCount(10);
					} else {
						setUserToggleState(true);
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
			{isOpen && isLoadingKeyValueSuggestions && !attributeValues.length && (
				<section className="loading">
					<Skeleton paragraph={{ rows: 4 }} />
				</section>
			)}
			{isOpen && !isLoadingKeyValueSuggestions && (
				<>
					{!isEmptyStateWithDocsEnabled && (
						<section className="search" ref={searchContainerRef}>
							<Input
								placeholder="Filter values"
								onChange={(e): void => setSearchTextDebounced(e.target.value)}
								disabled={isFilterDisabled}
								ref={searchInputRef}
							/>
						</section>
					)}
					{attributeValues.length > 0 ? (
						<section className="values">
							{visibleCheckedValues.map((value: string) => (
								<Fragment key={value}>
									<div className="value">
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
											<div className={`${filter.title} label-${value}`} />
											{filter.customRendererForValue ? (
												filter.customRendererForValue(value)
											) : (
												<Typography.Text
													className="value-string"
													ellipsis={{ tooltip: { placement: 'top' } }}
												>
													{String(value)}
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
								</Fragment>
							))}

							{hasMoreChecked && (
								<section className="show-more">
									<Typography.Text
										className="show-more-text"
										onClick={(): void => setVisibleItemsCount((prev) => prev + 10)}
									>
										Show More...
									</Typography.Text>
								</section>
							)}

							{visibleCheckedCount > 0 && uncheckedValues.length > 0 && (
								<div className="filter-separator" data-testid="filter-separator" />
							)}

							{uncheckedValues.map((value: string) => (
								<Fragment key={value}>
									<div className="value">
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
											<div className={`${filter.title} label-${value}`} />
											{filter.customRendererForValue ? (
												filter.customRendererForValue(value)
											) : (
												<Typography.Text
													className="value-string"
													ellipsis={{ tooltip: { placement: 'top' } }}
												>
													{String(value)}
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
								</Fragment>
							))}
						</section>
					) : isEmptyStateWithDocsEnabled ? (
						<LogsQuickFilterEmptyState attributeKey={filter.attributeKey.key} />
					) : (
						<section className="no-data">
							<Typography.Text>No values found</Typography.Text>{' '}
						</section>
					)}
					{visibleItemsCount >= attributeValues?.length &&
						attributeValues?.length > 0 &&
						!isDataComplete && (
							<section className="search-prompt" onClick={handleSearchPromptClick}>
								<AlertTriangle size={16} className="search-prompt__icon" />
								<span className="search-prompt__text">
									<Typography.Text className="search-prompt__subtitle">
										Tap to search and load more suggestions.
									</Typography.Text>
								</span>
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
