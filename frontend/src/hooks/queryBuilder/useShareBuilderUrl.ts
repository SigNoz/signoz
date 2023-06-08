import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useQueryBuilder } from './useQueryBuilder';

type UseShareBuilderUrlParams = { defaultValue: Query };
type UseShareBuilderUrlReturnType = { compositeQuery: Query | null };

export const useShareBuilderUrl = ({
	defaultValue,
}: UseShareBuilderUrlParams): UseShareBuilderUrlReturnType => {
	const { redirectWithQueryBuilderData } = useQueryBuilder();
	const urlQuery = useUrlQuery();

	const compositeQuery: Query | null = useMemo(() => {
		const query = urlQuery.get(COMPOSITE_QUERY);
		if (query) {
			return JSON.parse(query);
		}

		return null;
	}, [urlQuery]);

	useEffect(() => {
		if (!compositeQuery) {
			redirectWithQueryBuilderData(defaultValue);
		}
	}, [defaultValue, urlQuery, redirectWithQueryBuilderData, compositeQuery]);

	return { compositeQuery };
};
