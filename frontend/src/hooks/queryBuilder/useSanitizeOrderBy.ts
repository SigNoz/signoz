import * as Sentry from '@sentry/react';
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

		const hasInvalidOrderBy = current.some((o) => !allowed.has(o.columnName));

		if (hasInvalidOrderBy) {
			Sentry.captureEvent({
				message: `Invalid orderBy resolution: current: ${JSON.stringify(
					current,
				)} - allowed: ${JSON.stringify(Array.from(allowed))}`,
				level: 'warning',
			});
		}

		return current.filter((o) => allowed.has(o.columnName));
	}, [query]);
}
