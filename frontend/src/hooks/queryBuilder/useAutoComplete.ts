import {
	getRemovePrefixFromKey,
	getTagToken,
	isExistsNotExistsOperator,
	replaceStringWithMaxLength,
	tagRegexp,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { Option } from 'container/QueryBuilder/type';
import * as Papa from 'papaparse';
import { useCallback, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { useFetchKeysAndValues } from './useFetchKeysAndValues';
import { useOptions } from './useOptions';
import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useTag } from './useTag';
import { useTagValidation } from './useTagValidation';

interface IAutoComplete {
	updateTag: (value: string) => void;
	handleSearch: (value: string) => void;
	handleClearTag: (value: string) => void;
	handleSelect: (value: string) => void;
	handleKeyDown: (event: React.KeyboardEvent) => void;
	options: Option[];
	tags: string[];
	searchValue: string;
	isMulti: boolean;
	isFetching: boolean;
	setSearchKey: (value: string) => void;
	searchKey: string;
}

export const useAutoComplete = (query: IBuilderQuery): IAutoComplete => {
	const [searchValue, setSearchValue] = useState<string>('');
	const [searchKey, setSearchKey] = useState<string>('');

	const { keys, results, isFetching } = useFetchKeysAndValues(
		searchValue,
		query,
		searchKey,
	);

	const [key, operator, result] = useSetCurrentKeyAndOperator(searchValue, keys);

	const handleSearch = (value: string): void => {
		const prefixFreeValue = getRemovePrefixFromKey(getTagToken(value).tagKey);
		setSearchValue(value);
		setSearchKey(prefixFreeValue);
	};

	const { isValidTag, isExist, isValidOperator, isMulti } = useTagValidation(
		operator,
		result,
	);

	const { handleAddTag, handleClearTag, tags, updateTag } = useTag(
		key,
		isValidTag,
		handleSearch,
		query,
		setSearchKey,
	);

	const handleSelect = useCallback(
		(value: string): void => {
			if (isMulti) {
				setSearchValue((prev: string) => {
					const matches = prev?.matchAll(tagRegexp);
					const [match] = matches ? Array.from(matches) : [];
					const [, , , matchTagValue] = match;
					const data = Papa.parse(matchTagValue).data.flat();
					return replaceStringWithMaxLength(prev, data as string[], value);
				});
			}
			if (!isMulti) {
				if (isExistsNotExistsOperator(value)) handleAddTag(value);
				if (isValidTag && !isExistsNotExistsOperator(value)) handleAddTag(value);
			}
		},
		[handleAddTag, isMulti, isValidTag],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent): void => {
			if (
				event.key === ' ' &&
				(searchValue.endsWith(' ') || searchValue.length === 0)
			) {
				event.preventDefault();
			}

			if (event.key === 'Enter' && searchValue && isValidTag) {
				if (isMulti) {
					event.stopPropagation();
				}
				event.preventDefault();
				handleAddTag(searchValue);
			}

			if (event.key === 'Backspace' && !searchValue) {
				event.stopPropagation();
				const last = tags[tags.length - 1];
				handleClearTag(last);
			}
		},
		[handleAddTag, handleClearTag, isMulti, isValidTag, searchValue, tags],
	);

	const options = useOptions(
		key,
		keys,
		operator,
		searchValue,
		isMulti,
		isValidOperator,
		isExist,
		results,
		result,
	);

	return {
		updateTag,
		handleSearch,
		handleClearTag,
		handleSelect,
		handleKeyDown,
		options,
		tags,
		searchValue,
		isMulti,
		isFetching,
		setSearchKey,
		searchKey,
	};
};
