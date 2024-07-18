import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { adjustQueryForTracesPage } from './utils';

export const useGetCompositeQueryParam = (): Query | null => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();

	return useMemo(() => {
		const compositeQuery = urlQuery.get(QueryParams.compositeQuery);
		let parsedCompositeQuery: Query | null = null;

		try {
			if (!compositeQuery) return null;

			parsedCompositeQuery = JSON.parse(decodeURIComponent(compositeQuery));

			const panelTypes = JSON.parse(urlQuery.get(QueryParams.panelTypes) ?? '""');

			return adjustQueryForTracesPage(pathname, parsedCompositeQuery, panelTypes);
		} catch (e) {
			parsedCompositeQuery = null;
		}

		return parsedCompositeQuery;
	}, [pathname, urlQuery]);
};
