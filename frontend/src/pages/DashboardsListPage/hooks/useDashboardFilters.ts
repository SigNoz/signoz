import { useCallback } from 'react';
import { type Options, parseAsString, useQueryState } from 'nuqs';

import { isQueryEmpty } from '../utils/filterQuery';

const opts: Options = { history: 'push' };

export interface UseDashboardFiltersResult {
	// The last-run backend list-filter query string — the source of truth for
	// fetching. The editable draft lives in FilterZone; this only changes when a
	// query is actually run (or a view is applied).
	query: string;
	isEmpty: boolean;
	setQuery: (value: string) => void;
}

// Owns the run dashboards-list query, synced to the URL (shareable links,
// back/forward). Sort/order/page live in their own query-param hooks.
export function useDashboardFilters(): UseDashboardFiltersResult {
	const [query, setQueryState] = useQueryState(
		'query',
		parseAsString.withDefault('').withOptions(opts),
	);

	const setQuery = useCallback(
		(value: string): void => {
			void setQueryState(value.trim() ? value : null);
		},
		[setQueryState],
	);

	return { query, isEmpty: isQueryEmpty(query), setQuery };
}
