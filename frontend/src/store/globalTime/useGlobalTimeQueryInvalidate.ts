import { useCallback } from 'react';
import { useQueryClient } from 'react-query';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGlobalTime } from './hooks';

/**
 * Use when you want to invalidate any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY}
 *
 * This hook computes fresh time values before invalidating queries,
 * ensuring all queries use the same min/max time during a refresh cycle.
 *
 * For named stores, only invalidates queries matching the store's name.
 * For unnamed stores, invalidates all AUTO_REFRESH_QUERY queries.
 *
 * @public
 */
export function useGlobalTimeQueryInvalidate(): () => Promise<void> {
	const queryClient = useQueryClient();
	const computeAndStoreMinMax = useGlobalTime((s) => s.computeAndStoreMinMax);
	const name = useGlobalTime((s) => s.name);

	return useCallback(async () => {
		// Compute fresh time values BEFORE invalidating
		// This ensures all queries that re-run will use the same time values
		// If refresh is enabled, this will just be skipped
		computeAndStoreMinMax();

		// Build scoped query key prefix
		const queryKey = name
			? [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, name]
			: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY];

		return await queryClient.invalidateQueries({ queryKey });
	}, [queryClient, computeAndStoreMinMax, name]);
}
