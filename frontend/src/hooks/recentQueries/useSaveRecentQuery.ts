import { useEffect, useRef } from 'react';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type { SignalType } from 'types/api/v5/queryRange';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from 'lib/recentQueries/store';

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

// Build a stable signature of the staged filter expressions so the effect
// knows when a re-save is genuinely warranted vs. when we're seeing the same
// state across renders.
function buildSignature(stagedQuery: Query | null | undefined): string | null {
	if (!stagedQuery) {
		return null;
	}
	const queryData = stagedQuery.builder?.queryData;
	if (!Array.isArray(queryData) || queryData.length === 0) {
		return null;
	}
	return JSON.stringify(
		queryData.map((q) => ({
			ds: q.dataSource,
			f: q.filter?.expression ?? '',
		})),
	);
}

export function useSaveRecentQuery(
	stagedQuery: Query | null | undefined,
): void {
	const lastSavedSignatureRef = useRef<string | null>(null);

	useEffect(() => {
		const signature = buildSignature(stagedQuery);
		if (!signature || signature === lastSavedSignatureRef.current) {
			return;
		}

		const queryData = stagedQuery?.builder?.queryData ?? [];
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
				filter: q.filter ?? { expression: '' },
			});
		});

		lastSavedSignatureRef.current = signature;
	}, [stagedQuery]);
}
