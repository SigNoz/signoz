import { useCallback, useSyncExternalStore } from 'react';
import type { SignalType } from 'types/api/v5/queryRange';

import * as store from 'lib/recentQueries/store';
import type { RecentQueryEntry } from 'lib/recentQueries/types';

export interface UseRecentQueriesReturn {
	entries: RecentQueryEntry[];
	remove: (id: string) => void;
}

/**
 * Returns the recent-query entries for a given signal, sorted by
 * most-recently-used first (the underlying store already maintains that
 * order). Subscribes to the store so saves and removes — including those
 * driven by another tab via the `storage` event — re-render the consumer.
 */
export function useRecentQueries(
	signal: SignalType,
): UseRecentQueriesReturn {
	const getSnapshot = useCallback((): RecentQueryEntry[] => store.list(signal), [
		signal,
	]);

	const entries = useSyncExternalStore(
		store.subscribe,
		getSnapshot,
		getSnapshot,
	);

	const remove = useCallback(
		(id: string): void => {
			store.remove(id, signal);
		},
		[signal],
	);

	return { entries, remove };
}
