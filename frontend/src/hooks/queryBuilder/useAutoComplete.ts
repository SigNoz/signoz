import { OPERATORS } from 'constants/queryBuilder';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import {
	getRemovePrefixFromKey,
	getTagToken,
	replaceStringWithMaxLength,
	tagRegexp,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { Option } from 'container/QueryBuilder/type';
import { parse } from 'papaparse';
import { KeyboardEvent, useCallback, useState } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { useFetchKeysAndValues } from './useFetchKeysAndValues';
import { useOptions, WHERE_CLAUSE_CUSTOM_SUFFIX } from './useOptions';
import { useSetCurrentKeyAndOperator } from './useSetCurrentKeyAndOperator';
import { useTag } from './useTag';
import { useTagValidation } from './useTagValidation';

export type WhereClauseConfig = {
	customKey: string;
	customOp: string;
};

export const useAutoComplete = (
	query: IBuilderQuery,
	whereClauseConfig?: WhereClauseConfig,
	shouldUseSuggestions?: boolean,
	isInfraMonitoring?: boolean,
	entity?: K8sCategory | null,
): IAutoComplete => {
	const [searchValue, setSearchValue] = useState<string>('');
	const [searchKey, setSearchKey] = useState<string>('');

	const { keys, results, isFetching, exampleQueries } = useFetchKeysAndValues(
		searchValue,
		query,
		searchKey,
		shouldUseSuggestions,
		isInfraMonitoring,
		entity,
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
		isValidTag,
		handleSearch,
		query,
		setSearchKey,
		whereClauseConfig,
	);

	const handleSelect = useCallback(
		(value: string): void => {
			if (isMulti) {
				setSearchValue((prev: string) => {
					const matches = prev?.matchAll(tagRegexp);
					const [match] = matches ? Array.from(matches) : [];
					const [, , , matchTagValue] = match;
					const data = parse(matchTagValue).data.flat();
					return replaceStringWithMaxLength(prev, data as string[], value);
				});
			}
			if (!isMulti) {
				handleAddTag(value);
			}
		},
		[handleAddTag, isMulti],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent): void => {
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

	const handleOnBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
		event.preventDefault();
		if (searchValue) {
			if (
				key &&
				!operator &&
				whereClauseConfig?.customKey === 'body' &&
				whereClauseConfig.customOp === OPERATORS.CONTAINS
			) {
				const value = `${searchValue}${WHERE_CLAUSE_CUSTOM_SUFFIX}`;
				handleAddTag(value);
				return;
			}
			handleAddTag(searchValue);
		}
	};

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
		isFetching,
		whereClauseConfig,
	);

	return {
		updateTag,
		handleSearch,
		handleClearTag,
		handleSelect,
		handleKeyDown,
		handleOnBlur,
		options,
		tags,
		searchValue,
		isMulti,
		isFetching,
		setSearchKey,
		setSearchValue,
		searchKey,
		key,
		exampleQueries,
	};
};

interface IAutoComplete {
	updateTag: (value: string) => void;
	handleSearch: (value: string) => void;
	handleClearTag: (value: string) => void;
	handleSelect: (value: string) => void;
	handleKeyDown: (event: React.KeyboardEvent) => void;
	handleOnBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
	options: Option[];
	tags: string[];
	searchValue: string;
	isMulti: boolean;
	isFetching: boolean;
	setSearchKey: (value: string) => void;
	setSearchValue: (value: string) => void;
	searchKey: string;
	key: string;
	exampleQueries: TagFilter[];
	isInfraMonitoring?: boolean;
}
