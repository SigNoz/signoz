import { useEffect } from 'react';
import { useQueryClient } from 'react-query';

import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { GlobalTimeStoreApi } from './globalTimeStore';

/**
 * Used to keep lastRefreshTimestamp in sync after every react query refresh.
 *
 * @internal
 */
export function useQueryCacheSync(store: GlobalTimeStoreApi): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		const queryCache = queryClient.getQueryCache();

		return queryCache.subscribe((event) => {
			if (event?.type !== 'queryUpdated') {
				return;
			}

			const action = event.action as { type?: string };
			if (action?.type !== 'success') {
				return;
			}

			const queryKey = event.query.queryKey;
			if (
				!Array.isArray(queryKey) ||
				queryKey[0] !== REACT_QUERY_KEY.AUTO_REFRESH_QUERY
			) {
				return;
			}

			store.getState().updateRefreshTimestamp();
		});
	}, [queryClient, store]);
}
