import { useEffect } from 'react';
import { useQueryClient } from 'react-query';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { GlobalTimeStoreApi } from './globalTimeStore';

/**
 * Subscribes to QueryCache events and updates the store's lastRefreshTimestamp
 * when auto-refresh queries complete successfully.
 */
export function useQueryCacheSync(store: GlobalTimeStoreApi): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		const queryCache = queryClient.getQueryCache();

		return queryCache.subscribe((event) => {
			// Only react to successful query updates
			if (event?.type !== 'queryUpdated') {
				return;
			}

			const action = event.action as { type?: string };
			if (action?.type !== 'success') {
				return;
			}

			// Check if it's an auto-refresh query by key prefix
			const queryKey = event.query.queryKey;
			if (
				!Array.isArray(queryKey) ||
				queryKey[0] !== REACT_QUERY_KEY.AUTO_REFRESH_QUERY
			) {
				return;
			}

			// Update the refresh timestamp in store
			store.getState().updateRefreshTimestamp();
		});
	}, [queryClient, store]);
}
