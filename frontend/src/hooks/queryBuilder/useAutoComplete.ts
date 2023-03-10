import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { checkStringEndWIthSpace } from '../../utils/checkStringEndWIthSpace';
import { useFetchKeysAndValues } from './useFetchKeysAndValues';
import { useOperators } from './useOperators';
import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useTag } from './useTag';
import { useTagValidation } from './useTagValidation';

type Option = {
	value: string;
	selected?: boolean;
};

type ReturnT = {
	handleSearch: (value: string) => void;
	handleClearTag: (value: string) => void;
	handleSelect: (value: string) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	options: Option[];
	tags: string[];
	searchValue: string;
	isFilter: boolean;
};

export type KeyType = {
	key: string;
	dataType: 'string' | 'boolean' | 'number';
	type: string;
};

export const useAutoComplete = (): ReturnT => {
	const [searchValue, setSearchValue] = useState('');

	/**
	 * Handle change of input search.
	 * @param {string} value = input value
	 */
	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const [options, setOptions] = useState<Option[]>([]);

	/**
	 * Get suggestion keys and values from backend side.
	 * @param {string} value = input value
	 * @returns {KeyType[]} keys = suggestion keys from backend
	 * @returns {string[]} results = suggestion values from backend
	 */
	const { keys, results } = useFetchKeysAndValues(searchValue);

	/**
	 * Select key, operator and result value for tag
	 * @param {string} value
	 * @param {KeyType[]} keys
	 * @returns {string} key
	 * @returns {string} operator
	 * @returns {string} result
	 */
	const [key, operator, result] = useSetCurrentKeyAndOperator(searchValue, keys);

	/**
	 * Select key, operator and result value for tag
	 * @param {string} searchValue
	 * @param {string} operator
	 * @param {string} result
	 * @returns {boolean} isValidTag = checking if tag is valid
	 * @returns {boolean} isExist = checking if operator is equal EXIST or NOT_EXIST
	 * @returns {boolean} isValidOperator = checking if list of valid operators includes the typed operator
	 * @returns {boolean} isMulti = checking if operator is multiplied
	 * @returns {boolean} isFreeText = checking if value is free text
	 */
	const {
		isValidTag,
		isExist,
		isValidOperator,
		isMulti,
		isFreeText,
	} = useTagValidation(searchValue, operator, result);

	/**
	 * Hook give us possibility to add and to remove tags, and return array of tags.
	 * @param {string} key
	 * @param {boolean} isValidTag
	 * @param {boolean} isFreeText
	 * @param {function} handleSearch = Handle change of input search.
	 * @returns {function} handleAddTag = fn to add tag
	 * @returns {function} handleClearTag = fn to remove tag
	 * @returns {string[]} tags = array of selected tags
	 */
	const { handleAddTag, handleClearTag, tags } = useTag(
		key,
		isValidTag,
		isFreeText,
		handleSearch,
	);

	const operators = useOperators(key, keys);

	/**
	 * Set options based on the parameters
	 */
	useEffect(() => {
		if (searchValue) {
			if (!key) {
				setOptions([
					{ value: searchValue },
					...keys.map((k) => ({ value: k.key })),
				]);
			} else if (key && !operator) {
				setOptions(
					operators.map((o) => ({
						value: `${key} ${o}`,
						label: `${key} ${o.replace('_', ' ')}`,
					})),
				);
			} else if (key && operator && isMulti) {
				setOptions(results.map((r) => ({ value: `${r}` })));
			} else if (key && operator && !isMulti && !isExist && isValidOperator) {
				setOptions(results.map((r) => ({ value: `${key} ${operator} ${r}` })));
			} else if (key && operator && isExist && !isMulti) {
				setOptions([]);
			}
		} else {
			setOptions([]);
		}
	}, [
		isExist,
		isMulti,
		isValidOperator,
		key,
		keys,
		operator,
		operators,
		results,
		searchValue,
	]);

	/**
	 * Handle select of options
	 */
	const handleSelect = (value: string): void => {
		if (isMulti) {
			setSearchValue((prev) => {
				if (prev.includes(value)) {
					return prev.replace(` ${value}`, '');
				}
				return checkStringEndWIthSpace(prev)
					? `${prev}${value}`
					: `${prev} ${value}`;
			});
		} else if (!result.length) {
			setSearchValue(value);
		}
	};

	/**
	 * Handle keydown.
	 * Prevent double space.
	 * Add tag on enter click.
	 * Edit mode of tag on click backspace
	 */

	const handleKeyDown = (e: React.KeyboardEvent): void => {
		if (
			e.key === ' ' &&
			(searchValue.endsWith(' ') || searchValue.length === 0)
		) {
			e.preventDefault();
		}

		if (e.key === 'Enter' && searchValue) {
			if (isMulti || isFreeText) {
				e.stopPropagation();
			}
			e.preventDefault();
			handleAddTag(searchValue);
		}

		if (e.key === 'Backspace' && !searchValue) {
			e.stopPropagation();
			const last = tags[tags.length - 1];
			setSearchValue(last);
			handleClearTag(last);
		}
	};

	const isFilter = useMemo(() => !isMulti, [isMulti]);

	const optionsUpdated = useMemo(
		() =>
			options.map((o) => {
				if (isMulti) {
					return { ...o, selected: searchValue.includes(o.value) };
				}
				return o;
			}),
		[isMulti, options, searchValue],
	);

	return {
		handleSearch,
		handleClearTag,
		handleSelect,
		handleKeyDown,
		options: optionsUpdated,
		tags,
		searchValue,
		isFilter,
	};
};
