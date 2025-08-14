import { useCallback } from 'react';
import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { getParsedAggregationOptionsForOrderBy } from 'utils/aggregationConverter';

export function useSanitizeOrderBy(
	query: IBuilderQuery,
): () => OrderByPayload[] {
	return useCallback(() => {
		const allowed = new Set<string>();
		(query.groupBy || []).forEach((g) => g?.key && allowed.add(g.key));
		getParsedAggregationOptionsForOrderBy(query).forEach((agg) => {
			if (agg?.key) allowed.add(agg.key);
		});
		const current = query.orderBy || [];
		return current.filter((o) => allowed.has(o.columnName));
	}, [query]);
}
