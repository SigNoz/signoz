import { useEffect, useRef } from 'react';
import useUrlQuery from 'hooks/useUrlQuery';
import { useAppLocation } from 'lib/router/useAppLocation';
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
	const { pathname } = useAppLocation();
	// The page that owns this query. A caller can keep rendering for a beat after
	// a sibling pushes the next route (tab switches do this), and publishing then
	// writes this page's query onto the URL of the page being entered.
	const ownerPathname = useRef(pathname);

	const compositeQuery = useGetCompositeQueryParam();

	useEffect(() => {
		if (pathname !== ownerPathname.current) {
			return;
		}

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
		pathname,
	]);
};
