/* eslint-disable sonarjs/cognitive-complexity */

import './ClientSideQBSearch.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Select, Tag, Tooltip } from 'antd';
import {
	OPERATORS,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
	QUERY_BUILDER_SEARCH_VALUES,
} from 'constants/queryBuilder';
import { CustomTagProps } from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { selectStyle } from 'container/QueryBuilder/filters/QueryBuilderSearch/config';
import { PLACEHOLDER } from 'container/QueryBuilder/filters/QueryBuilderSearch/constant';
import { TypographyText } from 'container/QueryBuilder/filters/QueryBuilderSearch/style';
import {
	checkCommaInValue,
	getOperatorFromValue,
	getOperatorValue,
	getTagToken,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import {
	DropdownState,
	ITag,
	Option,
} from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import Suggestions from 'container/QueryBuilder/filters/QueryBuilderSearchV2/Suggestions';
import { WhereClauseConfig } from 'hooks/queryBuilder/useAutoComplete';
import { validationMapper } from 'hooks/queryBuilder/useIsValidTag';
import { operatorTypeMapper } from 'hooks/queryBuilder/useOperatorType';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { isArray, isEmpty, isEqual, isObject } from 'lodash-es';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import {
	KeyboardEvent,
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
import { popupContainer } from 'utils/selectPopupContainer';
import { v4 as uuid } from 'uuid';

export interface AttributeKey {
	key: string;
}

export interface AttributeValuesMap {
	[key: string]: AttributeValue;
}

interface ClientSideQBSearchProps {
	filters: TagFilter;
	onChange: (value: TagFilter) => void;
	whereClauseConfig?: WhereClauseConfig;
	placeholder?: string;
	className?: string;
	suffixIcon?: React.ReactNode;
	attributeValuesMap?: AttributeValuesMap;
	attributeKeys: BaseAutocompleteData[];
}

interface AttributeValue {
	stringAttributeValues: string[] | [];
	numberAttributeValues: number[] | [];
	boolAttributeValues: boolean[] | [];
}

function ClientSideQBSearch(
	props: ClientSideQBSearchProps,
): React.ReactElement {
	const {
		onChange,
		placeholder,
		className,
		suffixIcon,
		whereClauseConfig,
		attributeValuesMap,
		attributeKeys,
		filters,
	} = props;

	const isDarkMode = useIsDarkMode();

	const selectRef = useRef<BaseSelectRef>(null);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	// create the tags from the initial query here, this should only be computed on the first load as post that tags and query will be always in sync.
	const [tags, setTags] = useState<ITag[]>(filters.items as ITag[]);

	// this will maintain the current state of in process filter item
	const [currentFilterItem, setCurrentFilterItem] = useState<ITag | undefined>();

	const [currentState, setCurrentState] = useState<DropdownState>(
		DropdownState.ATTRIBUTE_KEY,
	);

	// to maintain the current running state until the tokenization happens for the tag
	const [searchValue, setSearchValue] = useState<string>('');

	const [dropdownOptions, setDropdownOptions] = useState<Option[]>([]);

	const attributeValues = useMemo(() => {
		if (currentFilterItem?.key?.key) {
			return attributeValuesMap?.[currentFilterItem.key.key];
		}
		return {
			stringAttributeValues: [],
			numberAttributeValues: [],
			boolAttributeValues: [],
		};
	}, [attributeValuesMap, currentFilterItem?.key?.key]);

	const handleDropdownSelect = useCallback(
		(value: string) => {
			let parsedValue: BaseAutocompleteData | string;

			try {
				parsedValue = JSON.parse(value);
			} catch {
				parsedValue = value;
			}
			if (currentState === DropdownState.ATTRIBUTE_KEY) {
				setCurrentFilterItem((prev) => ({
					...prev,
					key: parsedValue as BaseAutocompleteData,
					op: '',
					value: '',
				}));
				setCurrentState(DropdownState.OPERATOR);
				setSearchValue((parsedValue as BaseAutocompleteData)?.key);
			} else if (currentState === DropdownState.OPERATOR) {
				if (value === OPERATORS.EXISTS || value === OPERATORS.NOT_EXISTS) {
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
					setSearchValue(`${currentFilterItem?.key?.key} ${value}`);
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
		},
		[searchValue],
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

		if (
			// Case 1 - if key is defined but the search text doesn't match with the set key,
			// can happen when user selects from dropdown and then deletes a few characters
			currentFilterItem?.key &&
			currentFilterItem?.key?.key !== tagKey.split(' ')[0]
		) {
			setCurrentFilterItem(undefined);
			setCurrentState(DropdownState.ATTRIBUTE_KEY);
		} else if (tagOperator && isEmpty(currentFilterItem?.op)) {
			// Case 2 -> key is set and now typing for the operator
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
			// Case 3 -> selected operator from dropdown and then erased a part of it
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
			// Case 4 -> the final value state where we set the current filter values and the tokenisation happens on either
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
		searchValue,
		currentState,
	]);

	// the useEffect takes care of setting the dropdown values correctly on change of the current state
	useEffect(() => {
		if (currentState === DropdownState.ATTRIBUTE_KEY) {
			const filteredAttributeKeys = attributeKeys.filter((key) =>
				key.key.startsWith(searchValue),
			);
			setDropdownOptions(
				filteredAttributeKeys?.map(
					(key) =>
						({
							label: key.key,
							value: key,
						} as Option),
				) || [],
			);
		}
		if (currentState === DropdownState.OPERATOR) {
			const keyOperator = searchValue.split(' ');
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
				setDropdownOptions(operatorOptions);
			} else if (strippedKey.endsWith('[*]') && strippedKey.startsWith('body.')) {
				operatorOptions = [OPERATORS.HAS, OPERATORS.NHAS].map((operator) => ({
					label: operator,
					value: operator,
				}));
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
			const values: Array<string | number | boolean> = [];
			const { tagValue } = getTagToken(searchValue);
			if (isArray(tagValue)) {
				if (!isEmpty(tagValue[tagValue.length - 1]))
					values.push(tagValue[tagValue.length - 1]);
			} else if (!isEmpty(tagValue)) values.push(tagValue);

			const currentAttributeValues =
				attributeValues?.stringAttributeValues ||
				attributeValues?.numberAttributeValues ||
				attributeValues?.boolAttributeValues ||
				[];

			values.push(...currentAttributeValues);

			if (attributeValuesMap) {
				setDropdownOptions(
					values.map(
						(val) =>
							({
								label: checkCommaInValue(String(val)),
								value: val,
							} as Option),
					),
				);
			} else {
				// If attributeValuesMap is not provided, don't set dropdown options
				setDropdownOptions([]);
			}
		}
	}, [
		attributeValues,
		currentFilterItem?.key?.dataType,
		currentState,
		attributeKeys,
		searchValue,
		attributeValuesMap,
	]);

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

		if (!isEqual(filters, filterTags)) {
			onChange(filterTags);
			setTags(
				filterTags.items.map((tag) => ({
					...tag,
					op: getOperatorFromValue(tag.op),
				})) as ITag[],
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tags]);

	const queryTags = useMemo(
		() => tags.map((tag) => `${tag.key.key} ${tag.op} ${tag.value}`),
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

	const suffixIconContent = useMemo(() => {
		if (suffixIcon) {
			return suffixIcon;
		}
		return isOpen ? (
			<ChevronUp
				size={14}
				color={isDarkMode ? Color.TEXT_VANILLA_100 : Color.TEXT_INK_100}
			/>
		) : (
			<ChevronDown
				size={14}
				color={isDarkMode ? Color.TEXT_VANILLA_100 : Color.TEXT_INK_100}
			/>
		);
	}, [isDarkMode, isOpen, suffixIcon]);

	return (
		<div className="query-builder-search-v2 ">
			<Select
				ref={selectRef}
				getPopupContainer={popupContainer}
				virtual={false}
				showSearch
				tagRender={onTagRender}
				transitionName=""
				choiceTransitionName=""
				filterOption={false}
				open={isOpen}
				suffixIcon={suffixIconContent}
				onDropdownVisibleChange={setIsOpen}
				autoClearSearchValue={false}
				mode="multiple"
				placeholder={placeholder}
				value={queryTags}
				searchValue={searchValue}
				className={className}
				rootClassName="query-builder-search client-side-qb-search"
				disabled={!attributeKeys.length}
				style={selectStyle}
				onSearch={handleSearch}
				onSelect={handleDropdownSelect}
				onInputKeyDown={onInputKeyDownHandler}
				notFoundContent={null}
				showAction={['focus']}
				onBlur={handleOnBlur}
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

ClientSideQBSearch.defaultProps = {
	placeholder: PLACEHOLDER,
	className: '',
	suffixIcon: null,
	whereClauseConfig: {},
	attributeValuesMap: {},
};

export default ClientSideQBSearch;
