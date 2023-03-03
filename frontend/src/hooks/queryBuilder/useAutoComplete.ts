import getKeysAutoComplete from 'api/queryBuilder/getKeysAutoComplete';
import getValuesAutoComplete from 'api/queryBuilder/getValuesAutoComplete';
import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useValidTag } from './useValidTag';

type OptionType = {
	value: string;
};

type ReturnT = {
	handleSearch: (value: string) => void;
	handleClear: (value: string) => void;
	handleAddTags: (value: string) => void;
	handleSelect: (value: string) => void;
	handleFetchOption: (value: string) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	options: OptionType[];
	tags: string[];
	searchValue: string;
};

export type KeyType = {
	key: string;
	dataType: 'STRING' | 'BOOLEAN' | 'NUMBER';
	type: string;
};

export const useAutoComplete = (): ReturnT => {
	const [searchValue, setSearchValue] = useState('');

	// FOUND KEYS
	const [keys, setKeys] = useState<KeyType[]>([]);
	// FOUND VALUES
	const [results, setResults] = useState([]);
	// OPTIONS
	const [options, setOptions] = useState<OptionType[]>([]);
	// SELECTED OPTIONS
	const [tags, setTags] = useState<string[]>([]);

	const [key, operator, result] = useSetCurrentKeyAndOperator(searchValue, keys);

	const { isValidTag, isExist, isValidOperator } = useValidTag(operator, result);

	const operators = useMemo(() => {
		const currentKey = keys.find((el) => el.key === key);
		return currentKey
			? QUERY_BUILDER_OPERATORS_BY_TYPES[currentKey.dataType]
			: QUERY_BUILDER_OPERATORS_BY_TYPES.UNIVERSAL;
	}, [keys, key]);

	const handleAddTags = (value: string): void => {
		if (value && key && isValidTag) {
			setTags((prev) => [...prev, value]);
			setSearchValue('');
		}
	};

	const handleSelect = (value: string): void => {
		setSearchValue(value);
	};

	// SET OPTIONS
	useEffect(() => {
		if (searchValue) {
			if (!key) {
				setOptions(keys.map((k) => ({ value: k.key })));
			} else if (key && !operator) {
				setOptions(
					operators.map((o) => ({
						value: `${key} ${o}`,
						label: `${key} ${o.replace('_', ' ')}`,
					})),
				);
			} else if (key && operator && !isExist && isValidOperator) {
				setOptions(results.map((r) => ({ value: `${key} ${operator} ${r}` })));
			} else if (key && operator && isExist) {
				setOptions([]);
			}
		} else {
			setOptions([]);
		}
	}, [
		isExist,
		isValidOperator,
		key,
		keys,
		operator,
		operators,
		results,
		searchValue,
	]);

	// HANDLE INPUT SEARCH
	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	useEffect(() => {
		getKeysAutoComplete().then(({ payload }) => {
			if (payload) {
				setKeys(payload);
			}
		});
	}, []);

	// FETCH OPTIONS
	const handleFetchOption = useCallback(
		async (value: string) => {
			if (value) {
				if (key) {
					const val = value.split(' ')[2] || '';
					const { payload } = await getValuesAutoComplete(key, val);
					if (payload) {
						setResults(payload as []);
					} else {
						setResults([]);
					}
				}

				if (!key) {
					const { payload } = await getKeysAutoComplete(value);
					if (payload) {
						setKeys(payload);
					} else {
						setKeys([]);
					}
				}
			}
		},
		[key],
	);

	useEffect(() => {
		handleFetchOption(searchValue).then();
	}, [handleFetchOption, searchValue]);

	// REMOVE TAGS
	const handleClear = (value: string): void => {
		setTags((prev) => prev.filter((v) => v !== value));
	};

	// HANDLE BACKSPACE
	const handleKeyDown = (e: React.KeyboardEvent): void => {
		if (e.key === ' ' && searchValue.endsWith(' ')) {
			e.preventDefault();
		}

		if (e.key === 'Enter' && searchValue) {
			e.preventDefault();
			handleAddTags(searchValue);
		}

		if (e.key === 'Backspace' && !searchValue) {
			e.stopPropagation();
			const last = tags[tags.length - 1];
			setSearchValue(last);
			handleClear(last);
		}
	};

	return {
		handleFetchOption,
		handleSearch,
		handleClear,
		handleAddTags,
		handleSelect,
		handleKeyDown,
		options,
		tags,
		searchValue,
	};
};
