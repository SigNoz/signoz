/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Checkbox.styles.scss';

import { Button, Checkbox, Input, Skeleton, Typography } from 'antd';
import { IQuickFiltersConfig } from 'components/QuickFilters/QuickFilters';
import { OPERATORS } from 'constants/queryBuilder';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep, isArray, isEqual } from 'lodash-es';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

const SELECTED_OPERATORS = [OPERATORS['='], 'in'];
const NON_SELECTED_OPERATORS = [OPERATORS['!='], 'nin'];

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
}

export default function CheckboxFilter(props: ICheckboxProps): JSX.Element {
	const { filter } = props;
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
			aggregateOperator: 'noop',
			dataSource: DataSource.LOGS,
			aggregateAttribute: '',
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
			(Object.values(data?.payload || {}).find((el) => !!el) || []) as string[],
		[data?.payload],
	);
	const currentAttributeKeys = attributeValues.slice(0, visibleItemsCount);

	// derive the state of each filter key here in the renderer itself and keep it in sync with staged query
	// also we need to keep a note of last focussed query.
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const currentFilterState = useMemo(() => {
		let filterState: Record<string, boolean> = setDefaultValues(
			attributeValues,
			false,
		);
		const filterSync = currentQuery?.builder.queryData?.[
			lastUsedQuery || 0
		]?.filters?.items.find((item) => isEqual(item.key, filter.attributeKey));

		if (filterSync) {
			console.log(filterSync.op);
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

	const isFilterDisabled = useMemo(
		() =>
			(currentQuery?.builder?.queryData?.[
				lastUsedQuery || 0
			]?.filters?.items?.filter((item) => isEqual(item.key, filter.attributeKey))
				?.length || 0) > 1,

		[currentQuery?.builder?.queryData, lastUsedQuery, filter.attributeKey],
	);

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
										(fil) => !isEqual(fil.key, filter.attributeKey),
								  )
								: [...item.filters.items],
					},
				})),
			},
		};
		redirectWithQueryBuilderData(preparedQuery);
	};

	const isSomeFilterPresentForCurrentAttribute = currentQuery.builder.queryData?.[
		lastUsedQuery || 0
	]?.filters?.items?.some((item) => isEqual(item.key, filter.attributeKey));

	const onChange = (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): void => {
		const query = cloneDeep(currentQuery.builder.queryData?.[lastUsedQuery || 0]);

		if (isOnlyOrAllClicked && query.filters.items) {
			const isOnlyOrAll = isSomeFilterPresentForCurrentAttribute
				? currentFilterState[value] || isMultipleValuesTrueForTheKey
					? 'All'
					: 'Only'
				: 'Only';
			query.filters.items = query.filters.items.filter(
				(q) => !isEqual(q.key, filter.attributeKey),
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
		} else if (query.filters.items) {
			if (
				query.filters.items.some((item) => isEqual(item.key, filter.attributeKey))
			) {
				const currentFilter = query.filters.items.find((q) =>
					isEqual(q.key, filter.attributeKey),
				);
				if (currentFilter) {
					const runningOperator = currentFilter?.op;
					switch (runningOperator) {
						case 'in':
							if (checked) {
								if (isArray(currentFilter.value)) {
									const newFilter = {
										...currentFilter,
										value: [...currentFilter.value, value],
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								} else {
									const newFilter = {
										...currentFilter,
										value: [currentFilter.value as string, value],
									};
									// eslint-disable-next-line sonarjs/no-identical-functions
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								}
							} else if (!checked) {
								if (isArray(currentFilter.value)) {
									const newFilter = {
										...currentFilter,
										value: currentFilter.value.filter((val) => val !== value),
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								} else {
									const newFilter = {
										...currentFilter,
										value: [],
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								}
							}
							break;
						case 'nin':
							if (!checked) {
								if (isArray(currentFilter.value)) {
									const newFilter = {
										...currentFilter,
										value: [...currentFilter.value, value],
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								} else {
									const newFilter = {
										...currentFilter,
										value: [currentFilter.value as string, value],
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								}
							} else if (checked) {
								if (isArray(currentFilter.value)) {
									const newFilter = {
										...currentFilter,
										value: currentFilter.value.filter((val) => val !== value),
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								} else {
									const newFilter = {
										...currentFilter,
										value: [],
									};
									query.filters.items = query.filters.items.map((item) => {
										if (isEqual(item.key, filter.attributeKey)) {
											return newFilter;
										}
										return item;
									});
								}
							}
							break;
						case '=':
						case '!=':
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

		redirectWithQueryBuilderData(finalQuery);
	};

	return (
		<div className="checkbox-filter">
			<section className="filter-header-checkbox">
				<section className="left-action">
					{isOpen ? (
						<ChevronDown
							size={13}
							cursor="pointer"
							onClick={(): void => {
								setIsOpen(false);
								setVisibleItemsCount(10);
							}}
						/>
					) : (
						<ChevronRight
							size={13}
							onClick={(): void => setIsOpen(true)}
							cursor="pointer"
						/>
					)}
					<Typography.Text className="title">
						{filter.attributeKey.key?.split('.')?.join(' ')}
					</Typography.Text>
				</section>
				<section className="right-action">
					{isOpen && (
						<Typography.Text
							className="clear-all"
							onClick={handleClearFilterAttribute}
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
					<section className="search">
						<Input
							placeholder="Filter values"
							onChange={(e): void => setSearchText(e.target.value)}
						/>
					</section>
					{attributeValues.length > 0 ? (
						<section className="values">
							{currentAttributeKeys.map((value: string) => (
								<div key={value} className="value">
									<Checkbox
										onChange={(e): void => onChange(value, e.target.checked, false)}
										checked={currentFilterState[value]}
										disabled={isFilterDisabled}
									/>
									{filter.customRendererForValue ? (
										filter.customRendererForValue(value)
									) : (
										<div
											className="checkbox-value-section"
											onClick={(): void =>
												onChange(value, currentFilterState[value], true)
											}
										>
											<Typography.Text
												className="value-string"
												ellipsis={{ tooltip: { placement: 'right' } }}
											>
												{value}
											</Typography.Text>
											<Button type="text" className="only-btn">
												{isSomeFilterPresentForCurrentAttribute
													? currentFilterState[value] || isMultipleValuesTrueForTheKey
														? 'All'
														: 'Only'
													: 'Only'}
											</Button>
										</div>
									)}
								</div>
							))}
						</section>
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
