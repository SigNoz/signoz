import getKeysAutoComplete from 'api/queryBuilder/getKeysAutoComplete';
import getValuesAutoComplete from 'api/queryBuilder/getValuesAutoComplete';
import {
	EXISTS,
	NOT_EXISTS,
	QUERY_BUILDER_OPERATORS,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useSeparateSearchString } from './useSeparateSearchString';

type OptionType = {
	value: string;
};

type ReturnT = {
	handleSearch: (value: string) => void;
	handleClear: (value: string) => void;
	handleAddTags: (value: string) => void;
	handleFetchOption: (value: string) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	options: OptionType[];
	tags: string[];
	searchValue: string;
};

export const useAutoComplete = (): ReturnT => {
	const { pathname } = useLocation();
	const operators = useMemo(() => {
		switch (pathname) {
			case ROUTES.TRACE:
				return QUERY_BUILDER_OPERATORS.TRACES;
			case ROUTES.LOGS:
				return QUERY_BUILDER_OPERATORS.LOGS;
			default:
				return QUERY_BUILDER_OPERATORS.UNIVERSAL;
		}
	}, [pathname]);

	const [searchValue, setSearchValue] = useState('');

	// FOUND KEYS
	const [keys, setKeys] = useState<string[]>([]);
	// FOUND VALUES
	const [results, setResults] = useState([]);
	// OPTIONS
	const [options, setOptions] = useState<OptionType[]>([]);
	// SELECTED OPTIONS
	const [tags, setTags] = useState<string[]>([]);

	const [key, operator] = useSeparateSearchString(searchValue, keys, operators);

	const handleAddTags = (value: string): void => {
		if (value) {
			if (key && operator) {
				setTags((prev) => [...prev, value]);
				setSearchValue('');
			} else {
				setSearchValue(value);
			}
		}
	};

	// SET OPTIONS
	useEffect(() => {
		if (searchValue) {
			if (!key) {
				setOptions(keys.map((k) => ({ value: k })));
			} else if (key && !operator) {
				setOptions(
					operators.map((o) => ({
						value: `${key} ${o}`,
						label: `${key} ${o.replace('_', ' ')}`,
					})),
				);
			} else if (
				key &&
				operator &&
				operator !== EXISTS &&
				operator !== NOT_EXISTS
			) {
				setOptions(results.map((r) => ({ value: `${key} ${operator} ${r}` })));
			}
		} else {
			setOptions([]);
		}
	}, [key, keys, operator, operators, results, searchValue]);

	// HANDLE INPUT SEARCH
	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
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
						setKeys(payload.map((p) => p.key) as []);
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
		handleKeyDown,
		options,
		tags,
		searchValue,
	};
};
