import type {
	IBuilderQuery,
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import type { SignalType } from 'types/api/v5/queryRange';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from './recentQueriesStore';

function toSignal(dataSource: IBuilderQuery['dataSource']): SignalType | null {
	if (
		dataSource === 'logs' ||
		dataSource === 'traces' ||
		dataSource === 'metrics'
	) {
		return dataSource;
	}
	return null;
}

// Persists each builder query's filter expression as a recent search, partitioned
// by signal (and source). Call this on an explicit Stage & Run — not on staged-query
// changes — so page loads, navigation, and correlation redirects don't pollute recents.
// The store dedups by normalized filter, so re-running a query just bumps it to the front.
export function saveRecentQuery(
	query: Query | QueryState | null | undefined,
): void {
	const queryData = query?.builder?.queryData ?? [];
	queryData.forEach((q) => {
		const expression = q.filter?.expression?.trim();
		if (!expression) {
			return;
		}
		if (!validateQuery(expression).isValid) {
			return;
		}
		const signal = toSignal(q.dataSource);
		if (!signal) {
			return;
		}
		store.save({
			signal,
			source: q.source ?? '',
			filter: q.filter ?? { expression: '' },
		});
	});
}
