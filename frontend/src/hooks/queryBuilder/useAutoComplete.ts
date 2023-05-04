import {
	getRemovePrefixFromKey,
	getTagToken,
	isExistsNotExistsOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { Option } from 'container/QueryBuilder/type';
import { useCallback, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { checkStringEndsWithSpace } from 'utils/checkStringEndsWithSpace';

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

	const {
		isValidTag,
		isExist,
		isValidOperator,
		isMulti,
		isFreeText,
	} = useTagValidation(searchValue, operator, result);

	const { handleAddTag, handleClearTag, tags, updateTag } = useTag(
		key,
		isValidTag,
		isFreeText,
		handleSearch,
		query,
		setSearchKey,
	);

	const handleSelect = useCallback(
		(value: string): void => {
			if (isMulti) {
				setSearchValue((prev: string) => {
					const prevLength = prev.split(' ').length;
					if (checkStringEndsWithSpace(prev)) {
						return `${prev} ${value}, `;
					}
					return `${prev.replace(prev.split(' ')[prevLength - 1], value)}, `;
				});
			}
			if (!isMulti && isValidTag && !isExistsNotExistsOperator(value)) {
				handleAddTag(value);
			}
			if (!isMulti && isExistsNotExistsOperator(value)) {
				handleAddTag(value);
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
				if (isMulti || isFreeText) {
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
		[
			handleAddTag,
			handleClearTag,
			isFreeText,
			isMulti,
			isValidTag,
			searchValue,
			tags,
		],
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
