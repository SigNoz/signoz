import { Option } from 'container/QueryBuilder/type';
import React, { useCallback, useState } from 'react';

import { checkStringEndWIthSpace } from '../../utils/checkStringEndWIthSpace';
import { useFetchKeysAndValues } from './useFetchKeysAndValues';
import { useOptions } from './useOptions';
import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useTag } from './useTag';
import { useTagValidation } from './useTagValidation';

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

export const useAutoComplete = (): ReturnT => {
	const [searchValue, setSearchValue] = useState('');

	/**
	 * Handle change of input search.
	 * @param {string} value = input value
	 */
	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

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

	const isFilter = !isMulti;
	/**
	 * Set and get options
	 */
	const options = useOptions(
		key,
		keys,
		operator,
		searchValue,
		isMulti,
		isValidOperator,
		isExist,
		results,
	);

	return {
		handleSearch,
		handleClearTag,
		handleSelect,
		handleKeyDown,
		options,
		tags,
		searchValue,
		isFilter,
	};
};
