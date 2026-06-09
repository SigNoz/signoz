import { useCallback } from 'react';
import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import type { RecentQueryEntry } from 'lib/recentQueries/types';
import type { SignalType } from 'types/api/v5/queryRange';

// Returns a stable getter that reads the latest entries on each call.
// Intentionally non-subscribing — a subscription would reconfigure CodeMirror
// on every store change and close any open completion popup.
export function useGetRecents(
	signal: SignalType,
	source: string,
): () => RecentQueryEntry[] {
	return useCallback(
		() => recentQueriesStore.list(signal, source),
		[signal, source],
	);
}
