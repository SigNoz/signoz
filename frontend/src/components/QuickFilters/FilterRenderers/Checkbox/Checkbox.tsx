/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Checkbox.styles.scss';

import { Button, Checkbox, Input, Skeleton, Typography } from 'antd';
import {
	FiltersType,
	IQuickFiltersConfig,
	MinMax,
} from 'components/QuickFilters/QuickFilters';
import { OPERATORS } from 'constants/queryBuilder';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isArray, isEqual } from 'lodash-es';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

const SELECTED_OPERATORS = [OPERATORS['='], OPERATORS.IN];
const NON_SELECTED_OPERATORS = [OPERATORS['!='], OPERATORS.NIN];

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
	onChange: (
		attributeKey: BaseAutocompleteData,
		value: string,
		type: FiltersType,
		selected: boolean,
		isOnlyClicked?: boolean,
		minMax?: MinMax,
	) => void;
}

export default function CheckboxFilter(props: ICheckboxProps): JSX.Element {
	const { filter, onChange } = props;
	const [searchText, setSearchText] = useState<string>('');
	const [isOpen, setIsOpen] = useState<boolean>(filter.defaultOpen);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(10);

	const {
		stagedQuery,
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
		const filterSync = stagedQuery?.builder.queryData?.[
			lastUsedQuery || 0
		]?.filters?.items.find((item) => isEqual(item.key, filter.attributeKey));

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
		filter.attributeKey,
		lastUsedQuery,
		stagedQuery?.builder.queryData,
	]);

	const isFilterDisabled = useMemo(
		() =>
			(stagedQuery?.builder?.queryData?.[
				lastUsedQuery || 0
			]?.filters?.items?.filter((item) => isEqual(item.key, filter.attributeKey))
				?.length || 0) > 1,

		[stagedQuery?.builder?.queryData, lastUsedQuery, filter.attributeKey],
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
										onChange={(e): void =>
											onChange(
												filter.attributeKey,
												value,
												filter.type,
												e.target.checked,
												false,
											)
										}
										checked={currentFilterState[value]}
										disabled={isFilterDisabled}
									/>
									{filter.customRendererForValue ? (
										filter.customRendererForValue(value)
									) : (
										<div
											className="checkbox-value-section"
											onClick={(): void =>
												onChange(
													filter.attributeKey,
													value,
													filter.type,
													currentFilterState[value],
													true,
												)
											}
										>
											<Typography.Text
												className="value-string"
												ellipsis={{ tooltip: { placement: 'right' } }}
											>
												{value}
											</Typography.Text>
											<Button type="text" className="only-btn">
												{currentFilterState[value] || isMultipleValuesTrueForTheKey
													? 'All'
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
