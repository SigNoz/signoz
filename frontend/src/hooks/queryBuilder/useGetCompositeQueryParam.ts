import useUrlQuery from 'hooks/useUrlQuery';
import { deserialize } from 'lib/compositeQuery/serializer';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const useGetCompositeQueryParam = (): Query | null => {
	const urlQuery = useUrlQuery();

	return useMemo(() => deserialize(urlQuery), [urlQuery]);
};
