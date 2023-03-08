import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { checkStringEndWIthSpace } from '../../utils/checkStringEndWIthSpace';
import { useFetchKeysAndValues } from './useFetchKeysAndValues';
import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useTag } from './useTag';
import { useTagValidation } from './useTagValidation';

type Option = {
	value: string;
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

	// HANDLE INPUT SEARCH
	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const [options, setOptions] = useState<Option[]>([]);

	// GET SUGGESTION KEYS AND VALUES
	const { keys, results } = useFetchKeysAndValues(searchValue);

	// SELECT KEY, OPERATOR AND RESULT
	const [key, operator, result] = useSetCurrentKeyAndOperator(searchValue, keys);

	// VALIDATION OF TAG AND OPERATOR
	const {
		isValidTag,
		isExist,
		isValidOperator,
		isMulti,
		isFreeText,
	} = useTagValidation(searchValue, operator, result);

	// SET AND CLEAR TAGS
	const { handleAddTag, handleClearTag, tags } = useTag(
		key,
		isValidTag,
		isFreeText,
		handleSearch,
	);

	// GET OPERATORS BY KEY TYPE
	const operators = useMemo(() => {
		const currentKey = keys.find((el) => el.key === key);
		return currentKey
			? QUERY_BUILDER_OPERATORS_BY_TYPES[currentKey.dataType]
			: QUERY_BUILDER_OPERATORS_BY_TYPES.universal;
	}, [keys, key]);

	// SET OPTIONS
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

	// HANDLE OPTION SELECT
	const handleSelect = (value: string): void => {
		if (isMulti) {
			setSearchValue((prev) =>
				checkStringEndWIthSpace(prev) ? `${prev}${value}` : `${prev} ${value}`,
			);
		} else if (!result.length) {
			setSearchValue(value);
		}
	};

	// HANDLE KEY DOWN. PREVENT DOUBLE SPACE, ADD TAG ON ENTER CLICK, EDIT MODE FOR TAG ON CLICK BACKSPACE
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
