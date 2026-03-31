import { useCallback } from 'react';
import { useIsFetching, useQueryClient } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

/**
 * Use when you want to know if any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY} is refreshing
 */
export function useIsGlobalTimeQueryRefreshing(): boolean {
	return (
		useIsFetching({
			queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY],
		}) > 0
	);
}

/**
 * Use when you want to invalida any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY}
 */
export function useGlobalTimeQueryInvalidate(): () => Promise<void> {
	const queryClient = useQueryClient();

	return useCallback(async () => {
		return await queryClient.invalidateQueries({
			queryKey: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY],
		});
	}, [queryClient]);
}
