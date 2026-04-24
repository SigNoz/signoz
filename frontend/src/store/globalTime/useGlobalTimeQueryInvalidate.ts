import { useCallback } from 'react';
import { useQueryClient } from 'react-query';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGlobalTime } from './hooks';

/**
 * Use when you want to invalidate any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY}
 *
 * This hook computes fresh time values before invalidating queries,
 * ensuring all queries use the same min/max time during a refresh cycle.
 */
export function useGlobalTimeQueryInvalidate(): () => Promise<void> {
	const queryClient = useQueryClient();
	const computeAndStoreMinMax = useGlobalTime((s) => s.computeAndStoreMinMax);

	return useCallback(async () => {
		// Compute fresh time values BEFORE invalidating
		// This ensures all queries that re-run will use the same time values
		computeAndStoreMinMax();

		return await queryClient.invalidateQueries({
			queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY],
		});
	}, [queryClient, computeAndStoreMinMax]);
}
