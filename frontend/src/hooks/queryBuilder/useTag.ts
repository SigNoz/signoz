import {
	isExistsNotExistsOperator,
	isInNotInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
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
 * @param {boolean} isFreeText - A boolean value to indicate whether free text is allowed.
 * @param {function} handleSearch - A callback function to handle search.
 * @returns {IUseTag} The return object containing handlers and tags.
 */
export const useTag = (
	key: string,
	isValidTag: boolean,
	isFreeText: boolean,
	handleSearch: (value: string) => void,
	query: IBuilderQuery,
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
			if (
				(value && key && isValidTag) ||
				isFreeText ||
				isExistsNotExistsOperator(value)
			) {
				setTags((prevTags) => [...prevTags, value]);
				handleSearch('');
			}
		},
		[key, isValidTag, isFreeText, handleSearch],
	);

	/**
	 * Removes a tag from the tag list.
	 * @param {string} value - The tag value to be removed.
	 */
	const handleClearTag = useCallback((value: string): void => {
		setTags((prevTags) => prevTags.filter((v) => v !== value));
	}, []);

	useEffect(() => {
		setTags(
			(query?.tagFilters?.items || []).map((obj) =>
				isInNotInOperator(obj.op)
					? `${obj.key} ${obj.op} ${obj.value.join(',')}`
					: `${obj.key} ${obj.op} ${obj.value.join(' ')}`,
			),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { handleAddTag, handleClearTag, tags, updateTag };
};
