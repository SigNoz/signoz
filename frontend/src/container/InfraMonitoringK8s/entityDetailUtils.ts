import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

export const filterDuplicateFilters = (
	filters: TagFilterItem[],
): TagFilterItem[] => {
	const uniqueFilters = [];
	const seenIds = new Set();

	// eslint-disable-next-line no-restricted-syntax
	for (const filter of filters) {
		if (!seenIds.has(filter.id)) {
			seenIds.add(filter.id);
			uniqueFilters.push(filter);
		}
	}

	return uniqueFilters;
};
