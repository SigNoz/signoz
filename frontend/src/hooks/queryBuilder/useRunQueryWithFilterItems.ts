import { useCallback } from 'react';

import { useQueryBuilder } from './useQueryBuilder';

// The shared handleRunQuery clears filters.items, where QueryBuilderSearchV2 keeps its filters.
// TODO: remove with QueryBuilderSearchV2 and move its callers back to handleRunQuery.
// QuerySearch writes filter.expression, which handleRunQuery keeps.
export const useRunQueryWithFilterItems = (): (() => void) => {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	return useCallback(
		() => redirectWithQueryBuilderData(currentQuery),
		[currentQuery, redirectWithQueryBuilderData],
	);
};
