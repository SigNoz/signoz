import { useEffect } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useQueryBuilder } from './useQueryBuilder';

export type UseShareBuilderUrlParams = {
	defaultValue: Query;
	/** Force reset the query regardless of the committed query state */
	forceReset?: boolean;
};

/**
 * Seeds the query builder with a default query when nothing is committed
 * yet. In url mode this writes the `compositeQuery` URL param (preserving
 * the original "share builder url" behavior); in memory mode it commits to
 * the in-memory store without touching the URL.
 */
export const useShareBuilderUrl = ({
	defaultValue,
	forceReset = false,
}: UseShareBuilderUrlParams): void => {
	const { committedQuery, resetQuery, redirectWithQueryBuilderData } =
		useQueryBuilder();

	useEffect(() => {
		if (!committedQuery || forceReset) {
			resetQuery(defaultValue);
			redirectWithQueryBuilderData(defaultValue);
		}
	}, [
		defaultValue,
		redirectWithQueryBuilderData,
		committedQuery,
		resetQuery,
		forceReset,
	]);
};
