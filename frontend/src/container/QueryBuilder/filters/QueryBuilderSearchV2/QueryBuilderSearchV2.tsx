/* eslint-disable sonarjs/cognitive-complexity */
import './QueryBuilderSearchV2.styles.scss';

import { Select, Spin, Tag, Tooltip } from 'antd';
import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import useDebounceValue from 'hooks/useDebounce';
import { isEmpty, isUndefined } from 'lodash-es';
import type { BaseSelectRef } from 'rc-select';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { selectStyle } from '../QueryBuilderSearch/config';
import { PLACEHOLDER } from '../QueryBuilderSearch/constant';
import { TypographyText } from '../QueryBuilderSearch/style';
import { getTagToken, isInNInOperator } from '../QueryBuilderSearch/utils';

export interface ITag {
	key: BaseAutocompleteData;
	operator: string;
	value: string;
}

interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	disabled: boolean;
	onClose: () => void;
	closable: boolean;
}

interface QueryBuilderSearchV2Props {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
	placeholder?: string;
	className?: string;
	suffixIcon?: React.ReactNode;
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

function getInitTags(query: IBuilderQuery): ITag[] {
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
	const { query, onChange, placeholder, className, suffixIcon } = props;

	console.log(onChange);

	const selectRef = useRef<BaseSelectRef>(null);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	// create the tags from the initial query here, this should only be computed on the first load as post that tags and query will be always in sync.
	const [tags, setTags] = useState<ITag[]>(() => getInitTags(query));

	// this will maintain the current state of in process filter item
	const [currentFilterItem, setCurrentFilterItem] = useState<ITag | undefined>();

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
			// correct this
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
				setSearchValue((value as BaseAutocompleteData).key);
			}

			if (currentState === DropdownState.OPERATOR) {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					operator: value as string,
					value: '',
				}));
				setCurrentState(DropdownState.ATTRIBUTE_VALUE);
				setSearchValue((prev) => prev + value);
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
					} as ITag,
				]);
				// handle the multi tag thing here while adding the values or creating the tag
				setCurrentState(DropdownState.ATTRIBUTE_KEY);
				setSearchValue('');
			}
		},
		[currentFilterItem, currentState],
	);

	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const onChangeHandler = useCallback((value: string[]): void => {
		console.log(value);
	}, []);

	const onInputKeyDownHandler = useCallback((): void => {}, []);

	const handleDeselect = useCallback((): void => {}, []);

	const handleOnBlur = useCallback((): void => {}, []);

	// this useEffect takes care of tokenisation based on the search state
	useEffect(() => {
		const { tagKey, tagOperator } = getTagToken(searchValue);

		console.log(tagKey, tagOperator, searchValue, currentFilterItem);
		if (tagKey && isUndefined(currentFilterItem?.key)) {
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

		if (tagOperator && isEmpty(currentFilterItem?.operator)) {
			setCurrentFilterItem((prev) => ({
				key: prev?.key as BaseAutocompleteData,
				operator: tagOperator,
				value: '',
			}));

			setCurrentState(DropdownState.ATTRIBUTE_VALUE);
		}

		// handle value changes here
	}, [
		currentFilterItem,
		currentFilterItem?.key,
		currentFilterItem?.operator,
		data?.payload?.attributeKeys,
		searchValue,
	]);

	// the useEffect takes care of setting the dropdown values correctly on change of the current state
	useEffect(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			setDropdownOptions(
				data?.payload?.attributeKeys?.map((key) => ({
					label: key.key,
					value: key,
				})) || [],
			);
		}
		if (currentState === DropdownState.OPERATOR) {
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

	// useEffect(() => {
	// 	// TODO handle the query update from the tags state here
	// 	onChange((tags as unknown) as TagFilter);
	// }, [onChange, tags]);

	const loading = useMemo(() => isFetching || isFetchingAttributeValues, [
		isFetching,
		isFetchingAttributeValues,
	]);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	// TODO do the processing here if required for has / nhas / in / nin
	const queryTags = useMemo(
		() => tags.map((tag) => `${tag.key.key} ${tag.operator} ${tag.value}`),
		[tags],
	);

	const onTagRender = ({
		value,
		closable,
		onClose,
	}: CustomTagProps): React.ReactElement => {
		const { tagOperator } = getTagToken(value);
		const isInNin = isInNInOperator(tagOperator);
		const chipValue = isInNin
			? value?.trim()?.replace(/,\s*$/, '')
			: value?.trim();

		const onCloseHandler = (): void => {
			onClose();
			// TODO's to check what needs to be done here
			// setSearchValue('');
		};

		const tagEditHandler = (value: string): void => {
			console.log(value);
			// TODO's to check what needs to be done here
			// updateTag(value);
			// handleSearch(value);
		};

		const isDisabled = !!searchValue;

		return (
			<Tag closable={!searchValue && closable} onClose={onCloseHandler}>
				<Tooltip title={chipValue}>
					<TypographyText
						ellipsis
						$isInNin={isInNin}
						disabled={isDisabled}
						$isEnabled={!!searchValue}
						onClick={(): void => {
							if (!isDisabled) tagEditHandler(value);
						}}
					>
						{chipValue}
					</TypographyText>
				</Tooltip>
			</Tag>
		);
	};

	return (
		<div className="query-builder-search-v2">
			<Select
				ref={selectRef}
				getPopupContainer={popupContainer}
				virtual
				showSearch
				tagRender={onTagRender}
				filterOption={false}
				open={isOpen}
				onDropdownVisibleChange={setIsOpen}
				autoClearSearchValue={false}
				mode="multiple"
				placeholder={placeholder}
				value={queryTags}
				searchValue={searchValue}
				className={className}
				rootClassName="query-builder-search"
				disabled={isMetricsDataSource && !query.aggregateAttribute.key}
				style={selectStyle}
				onSearch={handleSearch}
				onChange={onChangeHandler}
				onSelect={handleDropdownSelect}
				onDeselect={handleDeselect}
				onInputKeyDown={onInputKeyDownHandler}
				notFoundContent={loading ? <Spin size="small" /> : null}
				suffixIcon={suffixIcon}
				showAction={['focus']}
				onBlur={handleOnBlur}
			>
				{dropdownOptions.map((option) => (
					// check why the select component is not being rendered with the value being objects
					<Select.Option key={option.label} value={option.label}>
						<div>{option.label}</div>
					</Select.Option>
				))}
			</Select>
		</div>
	);
}

QueryBuilderSearchV2.defaultProps = {
	placeholder: PLACEHOLDER,
	className: '',
	suffixIcon: null,
};

export default QueryBuilderSearchV2;
