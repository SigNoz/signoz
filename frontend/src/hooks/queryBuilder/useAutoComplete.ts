import { Option } from 'container/QueryBuilder/type';
import React, { useCallback, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

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

export const useAutoComplete = (query: IBuilderQuery): ReturnT => {
	const [searchValue, setSearchValue] = useState('');

	const handleSearch = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const { keys, results } = useFetchKeysAndValues(searchValue, query);

	const [key, operator, result] = useSetCurrentKeyAndOperator(searchValue, keys);

	const {
		isValidTag,
		isExist,
		isValidOperator,
		isMulti,
		isFreeText,
	} = useTagValidation(searchValue, operator, result);

	const { handleAddTag, handleClearTag, tags } = useTag(
		key,
		isValidTag,
		isFreeText,
		handleSearch,
	);

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
