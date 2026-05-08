import { useIsFetching } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGlobalTime } from './hooks';

/**
 * Use when you want to know if any query tracked by {@link REACT_QUERY_KEY.AUTO_REFRESH_QUERY} is refreshing
 *
 * For named stores, only checks queries matching the store's name.
 * For unnamed stores, checks all AUTO_REFRESH_QUERY queries.
 *
 * @public
 */
export function useIsGlobalTimeQueryRefreshing(): boolean {
	const name = useGlobalTime((s) => s.name);

	const queryKey = name
		? [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, name]
		: [REACT_QUERY_KEY.AUTO_REFRESH_QUERY];

	return useIsFetching({ queryKey }) > 0;
}
