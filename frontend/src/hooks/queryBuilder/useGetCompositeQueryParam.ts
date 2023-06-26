import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const useGetCompositeQueryParam = (): Query | null => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const compositeQuery = urlQuery.get(COMPOSITE_QUERY);

		return compositeQuery ? JSON.parse(compositeQuery) : null;
	}, [urlQuery]);
};
