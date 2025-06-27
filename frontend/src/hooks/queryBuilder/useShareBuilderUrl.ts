import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useGetCompositeQueryParam } from './useGetCompositeQueryParam';
import { useQueryBuilder } from './useQueryBuilder';

export type UseShareBuilderUrlParams = {
	defaultValue: Query;
	/** Force reset the query regardless of URL state */
	forceReset?: boolean;
};

export const useShareBuilderUrl = ({
	defaultValue,
	forceReset = false,
}: UseShareBuilderUrlParams): void => {
	const { resetQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const urlQuery = useUrlQuery();

	const compositeQuery = useGetCompositeQueryParam();

	useEffect(() => {
		if (!compositeQuery || forceReset) {
			resetQuery(defaultValue);
			redirectWithQueryBuilderData(defaultValue);
		}
	}, [
		defaultValue,
		urlQuery,
		redirectWithQueryBuilderData,
		compositeQuery,
		resetQuery,
		forceReset,
	]);
};
