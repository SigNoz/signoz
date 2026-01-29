import { useMemo } from 'react';
import { QuerySearchParamNames } from 'components/ExplorerCard/constants';
import useUrlQuery from 'hooks/useUrlQuery';

export const useGetSearchQueryParam = (
	searchParams: QuerySearchParamNames,
): string | null => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const searchQuery = urlQuery.get(searchParams);

		return searchQuery ? JSON.parse(searchQuery) : null;
	}, [urlQuery, searchParams]);
};
