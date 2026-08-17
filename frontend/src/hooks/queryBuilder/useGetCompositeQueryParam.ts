import { useMemo } from 'react';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { parseCompositeQueryParam } from 'lib/compositeQuery/compositeQuerySerialization';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const useGetCompositeQueryParam = (): Query | null => {
	const urlQuery = useUrlQuery();

	return useMemo(
		() => parseCompositeQueryParam(urlQuery.get(QueryParams.compositeQuery)),
		[urlQuery],
	);
};
