import './QueryBuilderSearchV2.styles.scss';

import { Input, Popover, Typography } from 'antd';
import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import useDebounceValue from 'hooks/useDebounce';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { getTagToken } from '../QueryBuilderSearch/utils';
import Suggestions from './Suggestions';

export interface Tag {
	key: BaseAutocompleteData;
	operator: string;
	value: string;
}

interface QueryBuilderSearchV2Props {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
}

export interface Option {
	label: string;
	value: BaseAutocompleteData | string;
}

export enum DropdownState {
	ATTRIBUTE_KEY = 'ATTRIBUTE_KEY',
	OPERATOR = 'OPERATOR',
	ATTRIBUTE_VALUE = 'ATTRIBUTE_VALUE',
}

function getInitTags(query: IBuilderQuery): Tag[] {
	return query.filters.items.map((item) => ({
		// TODO check why this is optional
		key: item.key as BaseAutocompleteData,
		operator: item.op,
		value: `${item.value}`,
	}));
}

function QueryBuilderSearchV2(
	props: QueryBuilderSearchV2Props,
): React.ReactElement {
	const { query, onChange } = props;

	// create the tags from the initial query here, this should only be computed on the first load as post that tags and query will be always in sync.
	const [tags, setTags] = useState<Tag[]>(() => getInitTags(query));

	// this will maintain the current state of in process filter item
	const [currentFilterItem, setCurrentFilterItem] = useState<Tag | undefined>();

	const [currentState, setCurrentState] = useState<DropdownState>(
		DropdownState.ATTRIBUTE_KEY,
	);

	// to maintain the current running state until the tokenization happens
	const [searchValue, setSearchValue] = useState<string>('');

	const [dropdownOptions, setDropdownOptions] = useState<Option[]>([]);

	const memoizedSearchParams = useMemo(
		() => [
			// TODO update the search value here as well based on the running state of the filter
			searchValue,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		[
			searchValue,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
	);

	const memoizedValueParams = useMemo(
		() => [
			query.aggregateOperator,
			query.dataSource,
			query.aggregateAttribute.key,
			currentFilterItem?.key.key || '',
			currentFilterItem?.key.dataType,
			currentFilterItem?.key?.type ?? '',
			currentFilterItem?.value,
		],
		[
			query.aggregateOperator,
			query.dataSource,
			query.aggregateAttribute.key,
			currentFilterItem?.key.key,
			currentFilterItem?.key.dataType,
			currentFilterItem?.key?.type,
			currentFilterItem?.value,
		],
	);

	const searchParams = useDebounceValue(memoizedSearchParams, DEBOUNCE_DELAY);

	const valueParams = useDebounceValue(memoizedValueParams, DEBOUNCE_DELAY);

	const isQueryEnabled = useMemo(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			return query.dataSource === DataSource.METRICS
				? !!query.aggregateOperator &&
						!!query.dataSource &&
						!!query.aggregateAttribute.dataType
				: true;
		}
		return false;
	}, [
		currentState,
		query.aggregateAttribute.dataType,
		query.aggregateOperator,
		query.dataSource,
	]);

	const { data, isFetching } = useGetAggregateKeys(
		{
			// TODO : this should be dependent on what is the current running state for the filter
			searchText: searchValue,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			aggregateAttribute: query.aggregateAttribute.key,
			tagType: query.aggregateAttribute.type ?? null,
		},
		{
			queryKey: [searchParams],
			enabled: isQueryEnabled,
		},
	);

	const {
		data: attributeValues,
		isFetching: isFetchingAttributeValues,
	} = useGetAggregateValues(
		{
			aggregateOperator: query.aggregateOperator,
			dataSource: query.dataSource,
			aggregateAttribute: query.aggregateAttribute.key,
			attributeKey: currentFilterItem?.key.key || '',
			filterAttributeKeyDataType:
				currentFilterItem?.key.dataType ?? DataTypes.EMPTY,
			tagType: currentFilterItem?.key?.type ?? '',
			searchText: currentFilterItem?.value || '',
		},
		{
			enabled: currentState === DropdownState.ATTRIBUTE_VALUE,
			queryKey: [valueParams],
		},
	);

	const handleDropdownSelect = useCallback(
		(value: Option['value']) => {
			if (currentState === DropdownState.ATTRIBUTE_KEY) {
				setCurrentFilterItem((prev) => ({
					...prev,
					key: value as BaseAutocompleteData,
					operator: '',
					value: '',
				}));
				setCurrentState(DropdownState.OPERATOR);
			}

			if (currentState === DropdownState.OPERATOR) {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					operator: value as string,
					value: '',
				}));
				setCurrentState(DropdownState.ATTRIBUTE_VALUE);
			}

			if (currentState === DropdownState.ATTRIBUTE_VALUE) {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					operator: prev?.operator as string,
					value: value as string,
				}));

				setTags((prev) => [
					...prev,
					{
						key: currentFilterItem?.key,
						operator: currentFilterItem?.operator,
						value,
					} as Tag,
				]);

				setCurrentState(DropdownState.ATTRIBUTE_KEY);
			}
			// update the current running filter item based on the current state of the dropdown and update that as well to next
		},
		[currentFilterItem, currentState],
	);

	// the aim of this use effect is to do the tokenisation once the search value has been updated
	// eslint-disable-next-line sonarjs/cognitive-complexity

	// TODO pending changes for space back
	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			let currentRunningAttributeKey;
			const isSuggestedKeyInAutocomplete = data?.payload?.attributeKeys?.some(
				(value) => value.key === searchValue,
			);

			if (isSuggestedKeyInAutocomplete) {
				const allAttributesMatchingTheKey =
					data?.payload?.attributeKeys?.filter(
						(value) => value.key === searchValue,
					) || [];

				if (allAttributesMatchingTheKey?.length === 1) {
					[currentRunningAttributeKey] = allAttributesMatchingTheKey;
				}
				if (allAttributesMatchingTheKey?.length > 1) {
					[currentRunningAttributeKey] = allAttributesMatchingTheKey;
				}

				if (currentRunningAttributeKey) {
					setCurrentFilterItem({
						key: currentRunningAttributeKey,
						operator: '',
						value: '',
					});

					setCurrentState(DropdownState.OPERATOR);
				}
			}
			if (data?.payload?.attributeKeys?.length === 0) {
				setCurrentFilterItem({
					key: {
						key: searchValue,
						// update this for has and nhas operator
						dataType: DataTypes.EMPTY,
						type: '',
						isColumn: false,
						isJSON: false,
					},
					operator: '',
					value: '',
				});
				setCurrentState(DropdownState.OPERATOR);
			}
		}
		if (currentState === DropdownState.OPERATOR) {
			const { tagOperator } = getTagToken(searchValue);

			if (tagOperator) {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					operator: tagOperator,
					value: '',
				}));

				setCurrentState(DropdownState.ATTRIBUTE_VALUE);
			}
		}
	}, [currentState, data?.payload?.attributeKeys, searchValue]);

	useEffect(() => {
		// all the logic for setting the options based on tokenisation goes here
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			setDropdownOptions(
				data?.payload?.attributeKeys?.map((key) => ({
					label: key.key,
					value: key,
				})) || [],
			);
		}
		if (currentState === DropdownState.OPERATOR) {
			// the filtering of operators based on current typed value also occurs here

			const keyOperator = searchValue.split(' ');
			const partialOperator = keyOperator?.[1];

			let operatorOptions;
			if (currentFilterItem?.key.dataType) {
				operatorOptions = QUERY_BUILDER_OPERATORS_BY_TYPES[
					currentFilterItem.key
						.dataType as keyof typeof QUERY_BUILDER_OPERATORS_BY_TYPES
				].map((operator) => ({
					label: operator,
					value: operator,
				}));

				if (partialOperator) {
					operatorOptions = operatorOptions.filter((op) =>
						op.label.startsWith(partialOperator.toLocaleUpperCase()),
					);
				}
				setDropdownOptions(operatorOptions);
			} else {
				operatorOptions = QUERY_BUILDER_OPERATORS_BY_TYPES.universal.map(
					(operator) => ({
						label: operator,
						value: operator,
					}),
				);

				if (partialOperator) {
					operatorOptions = operatorOptions.filter((op) =>
						op.label.startsWith(partialOperator.toLocaleUpperCase()),
					);
				}
				setDropdownOptions(operatorOptions);
			}
		}

		if (currentState === DropdownState.ATTRIBUTE_VALUE) {
			const values: string[] =
				Object.values(attributeValues?.payload || {}).find((el) => !!el) || [];

			setDropdownOptions(
				values.map((val) => ({
					label: val,
					value: val,
				})),
			);
		}
	}, [
		attributeValues?.payload,
		currentFilterItem?.key.dataType,
		currentState,
		data?.payload?.attributeKeys,
		searchValue,
	]);

	console.log(dropdownOptions);

	useEffect(() => {
		// handle the on change for query here
	}, [tags]);

	const loading = useMemo(() => isFetching || isFetchingAttributeValues, [
		isFetching,
		isFetchingAttributeValues,
	]);

	return (
		<div className="query-builder-search-v2">
			<section className="tags">
				{tags?.map((tag) => (
					<div className="tag" key={tag.key.id}>
						<Typography.Text>{`${tag.key.key} ${tag.operator} ${tag.value}`}</Typography.Text>
					</div>
				))}
			</section>
			<section className="search-bar">
				<Popover
					trigger="click"
					arrow={false}
					getPopupContainer={popupContainer}
					placement="bottom"
					content={
						loading ? (
							<Typography.Text>Loading please wait!!</Typography.Text>
						) : (
							<Suggestions
								searchValue={searchValue}
								currentFilterItem={currentFilterItem}
								currentState={currentState}
								options={dropdownOptions}
								onChange={handleDropdownSelect}
							/>
						)
					}
				>
					<Input
						placeholder='Search Filter : select options from suggested values, for IN/NOT IN operators - press "Enter" after selecting options'
						value={searchValue}
						onChange={(event): void => {
							setSearchValue(event.target.value);
						}}
					/>
				</Popover>
			</section>
		</div>
	);
}

export default QueryBuilderSearchV2;
