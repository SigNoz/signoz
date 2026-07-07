import { useEffect } from 'react';
import { useQueryClient } from 'react-query';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { GlobalTimeStoreApi } from './globalTimeStore';

/**
 * Used to keep lastRefreshTimestamp in sync after every react query refresh.
 * For named stores, only tracks queries with matching store name.
 * For unnamed stores, tracks all AUTO_REFRESH_QUERY queries (backward compatible).
 *
 * @internal
 */
export function useQueryCacheSync(store: GlobalTimeStoreApi): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		const queryCache = queryClient.getQueryCache();
		const storeName = store.getState().name;

		return queryCache.subscribe((event) => {
			if (event?.type !== 'queryUpdated') {
				return;
			}

			const action = event.action as { type?: string };
			if (action?.type !== 'success') {
				return;
			}

			const queryKey = event.query.queryKey;
			if (!Array.isArray(queryKey)) {
				return;
			}

			// this is created by getAutoRefreshQueryKey inside the store,
			// to track usages of global time store and autoRefresh
			if (queryKey[0] !== REACT_QUERY_KEY.AUTO_REFRESH_QUERY) {
				return;
			}

			// Named store: only track queries with matching name at position [1]
			if (storeName && queryKey[1] !== storeName) {
				return;
			}
			// Unnamed store: track all AUTO_REFRESH_QUERY queries (backward compatible)
			store.getState().updateRefreshTimestamp();
		});
	}, [queryClient, store]);
}
