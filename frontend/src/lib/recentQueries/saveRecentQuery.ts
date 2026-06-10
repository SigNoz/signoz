import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
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

type CompositeWithBuilder = {
	builder?: { queryData?: IBuilderQuery[] };
};

// Persists each builder query in the composite as a recent entry. Call this
// only from explicit user-driven Run triggers — reacting to stagedQuery or any
// other derived state pollutes recents with navigation/refresh/go-to traffic.
export function saveRecentQuery(
	query: CompositeWithBuilder | null | undefined,
): void {
	const queryData = query?.builder?.queryData;
	if (!Array.isArray(queryData) || queryData.length === 0) {
		return;
	}

	queryData.forEach((q) => {
		const expression = q.filter?.expression?.trim();
		if (!expression) {
			return;
		}
		const validation = validateQuery(expression);
		if (!validation.isValid) {
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
