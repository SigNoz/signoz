/* eslint-disable sonarjs/cognitive-complexity */
import './QueryBuilderSearchV2.styles.scss';

import { Select, Spin, Tag, Tooltip } from 'antd';
import cx from 'classnames';
import {
	OPERATORS,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
	QUERY_BUILDER_SEARCH_VALUES,
} from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { WhereClauseConfig } from 'hooks/queryBuilder/useAutoComplete';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useGetAttributeSuggestions } from 'hooks/queryBuilder/useGetAttributeSuggestions';
import { validationMapper } from 'hooks/queryBuilder/useIsValidTag';
import { operatorTypeMapper } from 'hooks/queryBuilder/useOperatorType';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebounceValue from 'hooks/useDebounce';
import {
	cloneDeep,
	isArray,
	isEmpty,
	isEqual,
	isObject,
	isUndefined,
	unset,
} from 'lodash-es';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import {
	KeyboardEvent,
	ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
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
import { v4 as uuid } from 'uuid';

import { selectStyle } from '../QueryBuilderSearch/config';
import { PLACEHOLDER } from '../QueryBuilderSearch/constant';
import { TypographyText } from '../QueryBuilderSearch/style';
import {
	checkCommaInValue,
	getOperatorFromValue,
	getOperatorValue,
	getTagToken,
	isInNInOperator,
} from '../QueryBuilderSearch/utils';
import QueryBuilderSearchDropdown from './QueryBuilderSearchDropdown';
import Suggestions from './Suggestions';

export interface ITag {
	id?: string;
	key: BaseAutocompleteData;
	op: string;
	value: string[] | string | number | boolean;
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
	whereClauseConfig?: WhereClauseConfig;
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
		id: item.id,
		key: item.key as BaseAutocompleteData,
		op: getOperatorFromValue(item.op),
		value: item.value,
	}));
}

function QueryBuilderSearchV2(
	props: QueryBuilderSearchV2Props,
): React.ReactElement {
	const {
		query,
		onChange,
		placeholder,
		className,
		suffixIcon,
		whereClauseConfig,
	} = props;

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const { handleRunQuery, currentQuery } = useQueryBuilder();

	const selectRef = useRef<BaseSelectRef>(null);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	// create the tags from the initial query here, this should only be computed on the first load as post that tags and query will be always in sync.
	const [tags, setTags] = useState<ITag[]>(() => getInitTags(query));

	// this will maintain the current state of in process filter item
	const [currentFilterItem, setCurrentFilterItem] = useState<ITag | undefined>();

	const [currentState, setCurrentState] = useState<DropdownState>(
		DropdownState.ATTRIBUTE_KEY,
	);

	// to maintain the current running state until the tokenization happens for the tag
	const [searchValue, setSearchValue] = useState<string>('');

	const [dropdownOptions, setDropdownOptions] = useState<Option[]>([]);

	const [showAllFilters, setShowAllFilters] = useState<boolean>(false);

	const isLogsDataSource = useMemo(() => query.dataSource === DataSource.LOGS, [
		query.dataSource,
	]);

	const memoizedSearchParams = useMemo(
		() => [
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

	const queryFiltersWithoutId = useMemo(
		() => ({
			...query.filters,
			items: query.filters.items.map((item) => {
				const filterWithoutId = cloneDeep(item);
				unset(filterWithoutId, 'id');
				return filterWithoutId;
			}),
		}),
		[query.filters],
	);

	const memoizedSuggestionsParams = useMemo(
		() => [searchValue, query.dataSource, queryFiltersWithoutId],
		[query.dataSource, queryFiltersWithoutId, searchValue],
	);

	const memoizedValueParams = useMemo(
		() => [
			query.aggregateOperator,
			query.dataSource,
			query.aggregateAttribute.key,
			currentFilterItem?.key?.key || '',
			currentFilterItem?.key?.dataType,
			currentFilterItem?.key?.type ?? '',
			isArray(currentFilterItem?.value)
				? currentFilterItem?.value?.[currentFilterItem.value.length - 1]
				: currentFilterItem?.value,
		],
		[
			query.aggregateOperator,
			query.dataSource,
			query.aggregateAttribute.key,
			currentFilterItem?.key?.key,
			currentFilterItem?.key?.dataType,
			currentFilterItem?.key?.type,
			currentFilterItem?.value,
		],
	);

	const searchParams = useDebounceValue(memoizedSearchParams, DEBOUNCE_DELAY);

	const valueParams = useDebounceValue(memoizedValueParams, DEBOUNCE_DELAY);

	const suggestionsParams = useDebounceValue(
		memoizedSuggestionsParams,
		DEBOUNCE_DELAY,
	);

	const isQueryEnabled = useMemo(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			return query.dataSource === DataSource.METRICS
				? !!query.dataSource && !!query.aggregateAttribute.dataType
				: true;
		}
		return false;
	}, [currentState, query.aggregateAttribute.dataType, query.dataSource]);

	const { data, isFetching } = useGetAggregateKeys(
		{
			searchText: searchValue?.split(' ')[0],
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			aggregateAttribute: query.aggregateAttribute.key,
			tagType: query.aggregateAttribute.type ?? null,
		},
		{
			queryKey: [searchParams],
			enabled: isQueryEnabled && !isLogsDataSource,
		},
	);

	const {
		data: suggestionsData,
		isFetching: isFetchingSuggestions,
	} = useGetAttributeSuggestions(
		{
			searchText: searchValue?.split(' ')[0],
			dataSource: query.dataSource,
			filters: query.filters,
		},
		{
			queryKey: [suggestionsParams],
			enabled: isQueryEnabled && isLogsDataSource,
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
			attributeKey: currentFilterItem?.key?.key || '',
			filterAttributeKeyDataType:
				currentFilterItem?.key?.dataType ?? DataTypes.EMPTY,
			tagType: currentFilterItem?.key?.type ?? '',
			searchText: isArray(currentFilterItem?.value)
				? currentFilterItem?.value?.[currentFilterItem.value.length - 1] || ''
				: currentFilterItem?.value?.toString() || '',
		},
		{
			enabled: currentState === DropdownState.ATTRIBUTE_VALUE,
			queryKey: [valueParams],
		},
	);

	const handleDropdownSelect = useCallback(
		(value: string) => {
			let parsedValue: BaseAutocompleteData | string;

			try {
				parsedValue = JSON.parse(value);
			} catch {
				parsedValue = value;
			}
			if (currentState === DropdownState.ATTRIBUTE_KEY) {
				// Case - convert abc def ghi type attribute keys directly to body contains abc def ghi
				if (
					isObject(parsedValue) &&
					parsedValue?.key &&
					parsedValue?.key?.split(' ').length > 1
				) {
					setTags((prev) => [
						...prev,
						{
							key: {
								key: 'body',
								dataType: DataTypes.String,
								type: '',
								isColumn: true,
								isJSON: false,
								// eslint-disable-next-line sonarjs/no-duplicate-string
								id: 'body--string----true',
							},
							op: OPERATORS.CONTAINS,
							value: (parsedValue as BaseAutocompleteData)?.key,
						},
					]);
					setCurrentFilterItem(undefined);
					setSearchValue('');
					setCurrentState(DropdownState.ATTRIBUTE_KEY);
				} else {
					setCurrentFilterItem((prev) => ({
						...prev,
						key: parsedValue as BaseAutocompleteData,
						op: '',
						value: '',
					}));
					setCurrentState(DropdownState.OPERATOR);
					setSearchValue(`${(parsedValue as BaseAutocompleteData)?.key} `);
				}
			} else if (currentState === DropdownState.OPERATOR) {
				if (isEmpty(value) && currentFilterItem?.key?.key) {
					setTags((prev) => [
						...prev,
						{
							key: {
								key: 'body',
								dataType: DataTypes.String,
								type: '',
								isColumn: true,
								isJSON: false,
								id: 'body--string----true',
							},
							op: OPERATORS.CONTAINS,
							value: currentFilterItem?.key?.key,
						},
					]);
					setCurrentFilterItem(undefined);
					setSearchValue('');
					setCurrentState(DropdownState.ATTRIBUTE_KEY);
				} else if (value === OPERATORS.EXISTS || value === OPERATORS.NOT_EXISTS) {
					setTags((prev) => [
						...prev,
						{
							key: currentFilterItem?.key,
							op: value,
							value: '',
						} as ITag,
					]);
					setCurrentFilterItem(undefined);
					setSearchValue('');
					setCurrentState(DropdownState.ATTRIBUTE_KEY);
				} else {
					setCurrentFilterItem((prev) => ({
						key: prev?.key as BaseAutocompleteData,
						op: value as string,
						value: '',
					}));
					setCurrentState(DropdownState.ATTRIBUTE_VALUE);
					setSearchValue(`${currentFilterItem?.key?.key} ${value} `);
				}
			} else if (currentState === DropdownState.ATTRIBUTE_VALUE) {
				const operatorType =
					operatorTypeMapper[currentFilterItem?.op || ''] || 'NOT_VALID';
				const isMulti = operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY;

				if (isMulti) {
					const { tagKey, tagOperator, tagValue } = getTagToken(searchValue);
					// this condition takes care of adding the IN/NIN multi values when pressed enter on an already existing value.
					// not the best interaction but in sync with what we have today!
					if (tagValue.includes(String(value))) {
						setSearchValue('');
						setCurrentState(DropdownState.ATTRIBUTE_KEY);
						setCurrentFilterItem(undefined);
						setTags((prev) => [
							...prev,
							{
								key: currentFilterItem?.key,
								op: currentFilterItem?.op,
								value: tagValue,
							} as ITag,
						]);
						return;
					}
					// this is for adding subsequent comma seperated values
					const newSearch = [...tagValue];
					newSearch[newSearch.length === 0 ? 0 : newSearch.length - 1] = value;
					const newSearchValue = newSearch.join(',');
					setSearchValue(`${tagKey} ${tagOperator} ${newSearchValue},`);
				} else {
					setSearchValue('');
					setCurrentState(DropdownState.ATTRIBUTE_KEY);
					setCurrentFilterItem(undefined);
					setTags((prev) => [
						...prev,
						{
							key: currentFilterItem?.key,
							op: currentFilterItem?.op,
							value,
						} as ITag,
					]);
				}
			}
		},
		[currentFilterItem?.key, currentFilterItem?.op, currentState, searchValue],
	);

	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const onInputKeyDownHandler = useCallback(
		(event: KeyboardEvent<Element>): void => {
			if (event.key === 'Backspace' && !searchValue) {
				event.stopPropagation();
				setTags((prev) => prev.slice(0, -1));
			}

			if ((event.ctrlKey || event.metaKey) && event.key === '/') {
				event.preventDefault();
				event.stopPropagation();
				setShowAllFilters((prev) => !prev);
			}
			if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				handleRunQuery();
				setIsOpen(false);
			}
		},
		[handleRunQuery, searchValue],
	);

	const handleOnBlur = useCallback((): void => {
		if (searchValue) {
			const operatorType =
				operatorTypeMapper[currentFilterItem?.op || ''] || 'NOT_VALID';
			// if key is added and operator is not present then convert to body CONTAINS key
			if (
				currentFilterItem?.key &&
				isEmpty(currentFilterItem?.op) &&
				whereClauseConfig?.customKey === 'body' &&
				whereClauseConfig?.customOp === OPERATORS.CONTAINS
			) {
				// eslint-disable-next-line sonarjs/no-identical-functions
				setTags((prev) => [
					...prev,
					{
						key: {
							key: 'body',
							dataType: DataTypes.String,
							type: '',
							isColumn: true,
							isJSON: false,
							id: 'body--string----true',
						},
						op: OPERATORS.CONTAINS,
						value: currentFilterItem?.key?.key,
					},
				]);
				setCurrentFilterItem(undefined);
				setSearchValue('');
				setCurrentState(DropdownState.ATTRIBUTE_KEY);
			} else if (
				currentFilterItem?.op === OPERATORS.EXISTS ||
				currentFilterItem?.op === OPERATORS.NOT_EXISTS
			) {
				// is exists and not exists operator is present then convert directly to tag! no need of value here
				setTags((prev) => [
					...prev,
					{
						key: currentFilterItem?.key,
						op: currentFilterItem?.op,
						value: '',
					},
				]);
				setCurrentFilterItem(undefined);
				setSearchValue('');
				setCurrentState(DropdownState.ATTRIBUTE_KEY);
			} else if (
				// if the current state is in sync with the kind of operator used then convert into a tag
				validationMapper[operatorType]?.(
					isArray(currentFilterItem?.value)
						? currentFilterItem?.value.length || 0
						: 1,
				)
			) {
				setTags((prev) => [
					...prev,
					{
						key: currentFilterItem?.key as BaseAutocompleteData,
						op: currentFilterItem?.op as string,
						value: currentFilterItem?.value || '',
					},
				]);
				setCurrentFilterItem(undefined);
				setSearchValue('');
				setCurrentState(DropdownState.ATTRIBUTE_KEY);
			}
		}
	}, [
		currentFilterItem?.key,
		currentFilterItem?.op,
		currentFilterItem?.value,
		searchValue,
		whereClauseConfig?.customKey,
		whereClauseConfig?.customOp,
	]);

	// this useEffect takes care of tokenisation based on the search state
	useEffect(() => {
		// if there is no search value reset to the default state
		if (!searchValue) {
			setCurrentFilterItem(undefined);
			setCurrentState(DropdownState.ATTRIBUTE_KEY);
		}

		// split the current search value based on delimiters
		const { tagKey, tagOperator, tagValue } = getTagToken(searchValue);

		// Case 1 -> when typing an attribute key (not selecting from dropdown)
		if (tagKey && isUndefined(currentFilterItem?.key)) {
			let currentRunningAttributeKey;
			const isSuggestedKeyInAutocomplete = suggestionsData?.payload?.attributes?.some(
				(value) => value.key === tagKey.split(' ')[0],
			);

			if (isSuggestedKeyInAutocomplete) {
				const allAttributesMatchingTheKey =
					suggestionsData?.payload?.attributes?.filter(
						(value) => value.key === tagKey.split(' ')[0],
					) || [];

				if (allAttributesMatchingTheKey?.length === 1) {
					[currentRunningAttributeKey] = allAttributesMatchingTheKey;
				}
				if (allAttributesMatchingTheKey?.length > 1) {
					// when there are multiple options let the user choose it until they do not select an operator
					if (tagOperator) {
						// if they select the operator then pick the first one from the ranked list
						setCurrentFilterItem({
							key: allAttributesMatchingTheKey?.[0],
							op: tagOperator,
							value: '',
						});
						setCurrentState(DropdownState.ATTRIBUTE_VALUE);
					}
					return;
				}

				if (currentRunningAttributeKey) {
					setCurrentFilterItem({
						key: currentRunningAttributeKey,
						op: '',
						value: '',
					});

					setCurrentState(DropdownState.OPERATOR);
				}
			}
			// again let's not auto select anything for the user
			if (tagOperator) {
				setCurrentFilterItem({
					key: {
						key: tagKey,
						dataType: DataTypes.EMPTY,
						type: '',
						isColumn: false,
						isJSON: false,
					},
					op: tagOperator,
					value: '',
				});
				setCurrentState(DropdownState.ATTRIBUTE_VALUE);
			}
		} else if (
			// Case 2 - if key is defined but the search text doesn't match with the set key,
			// can happen when user selects from dropdown and then deletes a few characters
			currentFilterItem?.key &&
			currentFilterItem?.key?.key !== tagKey.split(' ')[0]
		) {
			setCurrentFilterItem(undefined);
			setCurrentState(DropdownState.ATTRIBUTE_KEY);
		} else if (tagOperator && isEmpty(currentFilterItem?.op)) {
			// Case 3 -> key is set and now typing for the operator
			if (
				tagOperator === OPERATORS.EXISTS ||
				tagOperator === OPERATORS.NOT_EXISTS
			) {
				setTags((prev) => [
					...prev,
					{
						key: currentFilterItem?.key,
						op: tagOperator,
						value: '',
					} as ITag,
				]);
				setCurrentFilterItem(undefined);
				setSearchValue('');
				setCurrentState(DropdownState.ATTRIBUTE_KEY);
			} else {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					op: tagOperator,
					value: '',
				}));

				setCurrentState(DropdownState.ATTRIBUTE_VALUE);
			}
		} else if (
			// Case 4 -> selected operator from dropdown and then erased a part of it
			!isEmpty(currentFilterItem?.op) &&
			tagOperator !== currentFilterItem?.op
		) {
			setCurrentFilterItem((prev) => ({
				key: prev?.key as BaseAutocompleteData,
				op: '',
				value: '',
			}));
			setCurrentState(DropdownState.OPERATOR);
		} else if (currentState === DropdownState.ATTRIBUTE_VALUE) {
			// Case 5 -> the final value state where we set the current filter values and the tokenisation happens on either
			// dropdown click or blur event
			const currentValue = {
				key: currentFilterItem?.key as BaseAutocompleteData,
				op: currentFilterItem?.op as string,
				value: tagValue,
			};
			if (!isEqual(currentValue, currentFilterItem)) {
				setCurrentFilterItem((prev) => ({
					key: prev?.key as BaseAutocompleteData,
					op: prev?.op as string,
					value: tagValue,
				}));
			}
		}
	}, [
		currentFilterItem,
		currentFilterItem?.key,
		currentFilterItem?.op,
		suggestionsData?.payload?.attributes,
		searchValue,
		isFetchingSuggestions,
		currentState,
	]);

	// the useEffect takes care of setting the dropdown values correctly on change of the current state
	useEffect(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			const { tagKey } = getTagToken(searchValue);
			if (isLogsDataSource) {
				// add the user typed option in the dropdown to select that and move ahead irrespective of the matches and all
				setDropdownOptions([
					...(!isEmpty(tagKey) &&
					!suggestionsData?.payload?.attributes?.some((val) =>
						isEqual(val.key, tagKey),
					)
						? [
								{
									label: tagKey,
									value: {
										key: tagKey,
										dataType: DataTypes.EMPTY,
										type: '',
										isColumn: false,
										isJSON: false,
									},
								},
						  ]
						: []),
					...(suggestionsData?.payload?.attributes?.map((key) => ({
						label: key.key,
						value: key,
					})) || []),
				]);
			} else {
				setDropdownOptions(
					data?.payload?.attributeKeys?.map((key) => ({
						label: key.key,
						value: key,
					})) || [],
				);
			}
		}
		if (currentState === DropdownState.OPERATOR) {
			const keyOperator = searchValue?.split(' ');
			const partialOperator = keyOperator?.[1];
			const strippedKey = keyOperator?.[0];

			let operatorOptions;
			if (currentFilterItem?.key?.dataType) {
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
				operatorOptions = [{ label: '', value: '' }, ...operatorOptions];
				setDropdownOptions(operatorOptions);
			} else if (strippedKey.endsWith('[*]') && strippedKey.startsWith('body.')) {
				operatorOptions = [OPERATORS.HAS, OPERATORS.NHAS].map((operator) => ({
					label: operator,
					value: operator,
				}));
				operatorOptions = [{ label: '', value: '' }, ...operatorOptions];
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
				operatorOptions = [{ label: '', value: '' }, ...operatorOptions];
				setDropdownOptions(operatorOptions);
			}
		}

		if (currentState === DropdownState.ATTRIBUTE_VALUE) {
			const values: string[] = [];
			const { tagValue } = getTagToken(searchValue);
			if (isArray(tagValue)) {
				if (!isEmpty(tagValue[tagValue.length - 1]))
					values.push(tagValue[tagValue.length - 1]);
			} else if (!isEmpty(tagValue)) values.push(tagValue);

			values.push(
				...(Object.values(attributeValues?.payload || {}).find((el) => !!el) || []),
			);

			setDropdownOptions(
				values.map((val) => ({
					label: checkCommaInValue(String(val)),
					value: val,
				})),
			);
		}
	}, [
		attributeValues?.payload,
		currentFilterItem?.key?.dataType,
		currentState,
		data?.payload?.attributeKeys,
		isLogsDataSource,
		searchValue,
		suggestionsData?.payload?.attributes,
	]);

	// keep the query in sync with the selected tags in logs explorer page
	useEffect(() => {
		const filterTags: IBuilderQuery['filters'] = {
			op: 'AND',
			items: [],
		};
		tags.forEach((tag) => {
			const computedTagValue =
				tag.value &&
				Array.isArray(tag.value) &&
				tag.value[tag.value.length - 1] === ''
					? tag.value?.slice(0, -1)
					: tag.value ?? '';
			filterTags.items.push({
				id: tag.id || uuid().slice(0, 8),
				key: tag.key,
				op: getOperatorValue(tag.op),
				value: computedTagValue,
			});
		});

		if (!isEqual(query.filters, filterTags)) {
			onChange(filterTags);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tags]);

	// keep the use effects pure!
	// if the tags lacks the ID then the above use effect will add it to query
	// and then the below use effect will take care of adding it to the tags.
	// keep the tags in sycn with current query.
	useEffect(() => {
		// convert the query and tags to same format before comparison
		if (!isEqual(getInitTags(query), tags)) {
			setTags(getInitTags(query));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	const isLastQuery = useMemo(
		() =>
			isEqual(
				currentQuery.builder.queryData[currentQuery.builder.queryData.length - 1],
				query,
			),
		[currentQuery, query],
	);

	useEffect(() => {
		if (isLastQuery) {
			registerShortcut(LogsExplorerShortcuts.FocusTheSearchBar, () => {
				// set timeout is needed here else the select treats the hotkey as input value
				setTimeout(() => {
					selectRef.current?.focus();
				}, 0);
			});
		}

		return (): void =>
			deregisterShortcut(LogsExplorerShortcuts.FocusTheSearchBar);
	}, [deregisterShortcut, isLastQuery, registerShortcut]);

	const loading = useMemo(
		() => isFetching || isFetchingAttributeValues || isFetchingSuggestions,
		[isFetching, isFetchingAttributeValues, isFetchingSuggestions],
	);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	const queryTags = useMemo(
		() => tags.map((tag) => `${tag.key?.key} ${tag.op} ${tag.value}`),
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

		const indexInQueryTags = queryTags.findIndex((qTag) => isEqual(qTag, value));
		const tagDetails = tags[indexInQueryTags];

		const onCloseHandler = (): void => {
			onClose();
			setSearchValue('');
			setTags((prev) => prev.filter((t) => !isEqual(t, tagDetails)));
		};

		const tagEditHandler = (value: string): void => {
			setCurrentFilterItem(tagDetails);
			setSearchValue(value);
			setCurrentState(DropdownState.ATTRIBUTE_VALUE);
			setTags((prev) => prev.filter((t) => !isEqual(t, tagDetails)));
		};

		const isDisabled = !!searchValue;

		return (
			<span className="qb-search-bar-tokenised-tags">
				<Tag
					closable={!searchValue && closable}
					onClose={onCloseHandler}
					className={tagDetails?.key?.type || ''}
				>
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
			</span>
		);
	};

	return (
		<div className="query-builder-search-v2">
			<Select
				ref={selectRef}
				getPopupContainer={popupContainer}
				key={queryTags.join('.')}
				virtual={false}
				showSearch
				tagRender={onTagRender}
				transitionName=""
				choiceTransitionName=""
				filterOption={false}
				autoFocus={isOpen}
				open={isOpen}
				suffixIcon={
					// eslint-disable-next-line no-nested-ternary
					!isUndefined(suffixIcon) ? (
						suffixIcon
					) : isOpen ? (
						<ChevronUp size={14} />
					) : (
						<ChevronDown size={14} />
					)
				}
				onDropdownVisibleChange={setIsOpen}
				autoClearSearchValue={false}
				mode="multiple"
				placeholder={placeholder}
				value={queryTags}
				searchValue={searchValue}
				className={cx(
					!currentFilterItem?.key && !showAllFilters && dropdownOptions.length > 3
						? 'show-all-filters'
						: '',
					className,
				)}
				rootClassName="query-builder-search"
				disabled={isMetricsDataSource && !query.aggregateAttribute.key}
				style={selectStyle}
				onSearch={handleSearch}
				onSelect={handleDropdownSelect}
				onInputKeyDown={onInputKeyDownHandler}
				notFoundContent={loading ? <Spin size="small" /> : null}
				showAction={['focus']}
				onBlur={handleOnBlur}
				// eslint-disable-next-line react/no-unstable-nested-components
				dropdownRender={(menu): ReactElement => (
					<QueryBuilderSearchDropdown
						menu={menu}
						options={dropdownOptions}
						onChange={(val: TagFilter): void => {
							setTags((prev) => [...prev, ...(val.items as ITag[])]);
						}}
						searchValue={searchValue}
						exampleQueries={suggestionsData?.payload?.example_queries || []}
						tags={tags}
						currentFilterItem={currentFilterItem}
					/>
				)}
			>
				{dropdownOptions.map((option) => {
					let val = option.value;
					try {
						if (isObject(option.value)) {
							val = JSON.stringify(option.value);
						} else {
							val = option.value;
						}
					} catch {
						val = option.value;
					}
					return (
						<Select.Option key={isObject(val) ? `select-option` : val} value={val}>
							<Suggestions
								label={option.label}
								value={option.value}
								option={currentState}
								searchValue={searchValue}
							/>
						</Select.Option>
					);
				})}
			</Select>
		</div>
	);
}

QueryBuilderSearchV2.defaultProps = {
	placeholder: PLACEHOLDER,
	className: '',
	suffixIcon: null,
	whereClauseConfig: {},
};

export default QueryBuilderSearchV2;
