import { useIsFetching } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

/**
 * Use when you want to know if any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY} is refreshing
 */
export function useIsGlobalTimeQueryRefreshing(): boolean {
	return useIsFetching([REACT_QUERY_KEY.AUTO_REFRESH_QUERY]) > 0;
}
