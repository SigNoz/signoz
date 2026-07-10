import { QuerySearchParamNames } from 'components/ExplorerCard/constants';
import useUrlQuery from 'hooks/useUrlQuery';

export const useGetSearchQueryParam = (
	searchParams: QuerySearchParamNames,
): string | null => {
	const urlQuery = useUrlQuery();
	const searchQuery = urlQuery.get(searchParams);

	return searchQuery ? JSON.parse(searchQuery) : null;
};
