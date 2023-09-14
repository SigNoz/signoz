import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useGetCompositeQueryParam } from './useGetCompositeQueryParam';
import { useQueryBuilder } from './useQueryBuilder';

export type UseShareBuilderUrlParams = { defaultValue: Query };

export const useShareBuilderUrl = (defaultQuery: Query): void => {
	const { resetQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const urlQuery = useUrlQuery();

	const compositeQuery = useGetCompositeQueryParam();

	useEffect(() => {
		if (!compositeQuery) {
			resetQuery(defaultQuery);
			redirectWithQueryBuilderData(defaultQuery);
		}
	}, [
		defaultQuery,
		urlQuery,
		redirectWithQueryBuilderData,
		compositeQuery,
		resetQuery,
	]);
};
