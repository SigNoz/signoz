import {
	getOperatorFromValue,
	getTagToken,
	isExistsNotExistsOperator,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { unparse } from 'papaparse';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { WhereClauseConfig } from './useAutoComplete';

/**
 * Helper for formatting a TagFilter object into filter item strings
 * @param {TagFilter} filters - query filter object to be converted
 * @returns {string[]} An array of formatted conditions. Eg: `["service = web", "severity_text = INFO"]`)
 */
export function queryFilterTags(filter: TagFilter): string[] {
	return (filter?.items || []).map((ele) => {
		if (isInNInOperator(getOperatorFromValue(ele.op))) {
			try {
				const csvString = unparse([ele.value]);
				return `${ele.key?.key} ${getOperatorFromValue(ele.op)} ${csvString}`;
			} catch {
				return `${ele.key?.key} ${getOperatorFromValue(ele.op)} ${ele.value}`;
			}
		}
		return `${ele.key?.key} ${getOperatorFromValue(ele.op)} ${ele.value}`;
	});
}

type IUseTag = {
	handleAddTag: (value: string) => void;
	handleClearTag: (value: string) => void;
	tags: string[];
	updateTag: (value: string) => void;
};

/**
 * A custom React hook for handling tags.
 * @param {string} key - A string value to identify tags.
 * @param {boolean} isValidTag - A boolean value to indicate whether the tag is valid.
 * @param {function} handleSearch - A callback function to handle search.
 * @returns {IUseTag} The return object containing handlers and tags.
 */

export const useTag = (
	isValidTag: boolean,
	handleSearch: (value: string) => void,
	query: IBuilderQuery,
	setSearchKey: (value: string) => void,
	whereClauseConfig?: WhereClauseConfig,
): IUseTag => {
	const initTagsData = useMemo(() => queryFilterTags(query?.filters), [
		query?.filters,
	]);

	const [tags, setTags] = useState<string[]>(initTagsData);

	const updateTag = (value: string): void => {
		const newTags = tags?.filter((item: string) => item !== value);
		setTags(newTags);
	};

	/**
	 * Adds a new tag to the tag list.
	 * @param {string} value - The tag value to be added.
	 */

	const handleAddTag = useCallback(
		(value: string): void => {
			const { tagKey } = getTagToken(value);
			const parts = tagKey.split('-');
			// this is done to ensure that `hello-world` also gets converted to `body CONTAINS hello-world`
			let id = parts[parts.length - 1];
			let key = parts.slice(0, -1).join('-');
			if (parts.length === 1) {
				id = '';
				[key] = parts;
			}

			if (id === 'custom') {
				const customValue = whereClauseConfig
					? `${whereClauseConfig.customKey} ${whereClauseConfig.customOp} ${key}`
					: '';
				setTags((prevTags) =>
					prevTags.includes(customValue) ? prevTags : [...prevTags, customValue],
				);
				handleSearch('');
				setSearchKey('');
				return;
			}

			if ((value && key && isValidTag) || isExistsNotExistsOperator(value)) {
				setTags((prevTags) => [...prevTags, value]);
				handleSearch('');
				setSearchKey('');
			}
		},
		[whereClauseConfig, isValidTag, handleSearch, setSearchKey],
	);

	/**
	 * Removes a tag from the tag list.
	 * @param {string} value - The tag value to be removed.
	 */
	const handleClearTag = useCallback((value: string): void => {
		setTags((prevTags) => prevTags.filter((v) => v !== value));
	}, []);

	useEffect(() => {
		setTags(initTagsData);
	}, [initTagsData]);

	return { handleAddTag, handleClearTag, tags, updateTag };
};
