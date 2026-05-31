import { useEffect, useRef } from 'react';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type { SignalType } from 'types/api/v5/queryRange';
import { validateQuery } from 'utils/queryValidationUtils';

import * as store from 'lib/recentQueries/store';

// Legacy `IBuilderQuery.dataSource` uses the `DataSource` enum, whose string
// values match `SignalType`. Narrow with a runtime check rather than blindly
// casting — guards against any future drift.
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

/**
 * Save each builder query's filter expression in
 * `stagedQuery.builder.queryData[]` to the recent-queries store.
 *
 * Gate: frontend grammar — `validateQuery(expression)` must accept it.
 *
 * We intentionally do NOT gate on a backend `isSuccess` flag. An
 * investigation often runs queries that return zero results (e.g. searching
 * for a rare error condition that doesn't currently exist in the data),
 * and the user still wants to replay that query later. The frontend
 * grammar check rejects expressions that don't parse; everything else is
 * the user's intent worth preserving.
 *
 * The hook saves only the filter expression. Selecting a recent restores
 * only the filter; the rest of the user's builder query (groupBy/orderBy/
 * having/limit) is left untouched.
 */
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
