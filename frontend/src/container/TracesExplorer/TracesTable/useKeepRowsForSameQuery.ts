import { useEffect, useState } from 'react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

/**
 * Whether rows kept from the previous request may stay on screen: yes while the
 * same query refetches (refresh, next page), no once a new query runs, so the
 * table shows its loader instead of the old query's rows.
 */
export function useKeepRowsForSameQuery(isPreviousData: boolean): boolean {
	const { stagedQuery } = useQueryBuilder();
	const queryId = stagedQuery?.id;
	const [loadedQueryId, setLoadedQueryId] = useState(queryId);

	useEffect(() => {
		if (!isPreviousData) {
			setLoadedQueryId(queryId);
		}
	}, [isPreviousData, queryId]);

	return !isPreviousData || loadedQueryId === queryId;
}
