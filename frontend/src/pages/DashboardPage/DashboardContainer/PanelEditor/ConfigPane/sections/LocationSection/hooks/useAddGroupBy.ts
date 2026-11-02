import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { withGroupBy } from '../utils/groupBy';

/** Adds keys to the query's group by and runs it; undefined unless the query builder is in use. */
export function useAddGroupBy(): ((keys: string[]) => void) | undefined {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	if (currentQuery.queryType !== EQueryType.QUERY_BUILDER) {
		return undefined;
	}
	return (keys): void =>
		redirectWithQueryBuilderData(withGroupBy(currentQuery, keys));
}
