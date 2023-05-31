import {
	getOperatorFromValue,
	isExistsNotExistsOperator,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Papa from 'papaparse';
import { useCallback, useEffect, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

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
	key: string,
	isValidTag: boolean,
	handleSearch: (value: string) => void,
	query: IBuilderQuery,
	setSearchKey: (value: string) => void,
): IUseTag => {
	const [tags, setTags] = useState<string[]>([]);

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
			if ((value && key && isValidTag) || isExistsNotExistsOperator(value)) {
				setTags((prevTags) => [...prevTags, value]);
				handleSearch('');
				setSearchKey('');
			}
		},
		[key, isValidTag, handleSearch, setSearchKey],
	);

	/**
	 * Removes a tag from the tag list.
	 * @param {string} value - The tag value to be removed.
	 */
	const handleClearTag = useCallback((value: string): void => {
		setTags((prevTags) => prevTags.filter((v) => v !== value));
	}, []);

	useEffect(() => {
		const initialTags = (query?.filters?.items || []).map((ele) => {
			if (isInNInOperator(getOperatorFromValue(ele.op))) {
				const csvString = Papa.unparse([ele.value]);
				return `${ele.key?.key} ${getOperatorFromValue(ele.op)} ${csvString}`;
			}
			return `${ele.key?.key} ${getOperatorFromValue(ele.op)} ${ele.value}`;
		});
		setTags(initialTags);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { handleAddTag, handleClearTag, tags, updateTag };
};
