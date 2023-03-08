import { useCallback, useState } from 'react';

type ReturnT = {
	handleAddTag: (value: string) => void;
	handleClearTag: (value: string) => void;
	tags: string[];
};

export const useTag = (
	key: string,
	isValidTag: boolean,
	isFreeText: boolean,
	handleSearch: (value: string) => void,
): ReturnT => {
	const [tags, setTags] = useState<string[]>([]);

	const handleAddTag = useCallback(
		(value: string): void => {
			if ((value && key && isValidTag) || isFreeText) {
				setTags((prev) => [...prev, value]);
				handleSearch('');
			}
		},
		[key, isValidTag, isFreeText, handleSearch],
	);

	// REMOVE TAGS
	const handleClearTag = useCallback((value: string): void => {
		setTags((prev) => prev.filter((v) => v !== value));
	}, []);

	return { handleAddTag, handleClearTag, tags };
};
