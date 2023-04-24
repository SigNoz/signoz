import { isExistsNotExistsOperator } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useCallback, useState } from 'react';

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

	return { handleAddTag, handleClearTag, tags, updateTag };
};
