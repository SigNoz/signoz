import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';

import { getParsedAggregationOptionsForOrderBy } from './aggregationConverter';

export function sanitizeOrderByForExplorer(
	query: IBuilderQuery,
): OrderByPayload[] {
	const allowed = new Set<string>();
	(query.groupBy || []).forEach((g) => g?.key && allowed.add(g.key));
	getParsedAggregationOptionsForOrderBy(query).forEach((agg) => {
		// agg.key is the expression or alias (e.g., count(), avg(quantity), 'alias')
		if ((agg as any)?.key) {
			allowed.add((agg as any).key as string);
		}
	});

	const current = query.orderBy || [];

	const hasInvalidOrderBy = current.some((o) => !allowed.has(o.columnName));

	if (hasInvalidOrderBy) {
		// Loaded on demand: a static import puts all of @sentry/react (~273
		// modules) in the graph of every module that reaches this file.
		void import('@sentry/react').then((Sentry) => {
			Sentry.captureEvent({
				message: `Invalid orderBy: current: ${JSON.stringify(
					current,
				)} - allowed: ${JSON.stringify(Array.from(allowed))}`,
				level: 'warning',
			});
		});
	}
	return current.filter((o) => allowed.has(o.columnName));
}
