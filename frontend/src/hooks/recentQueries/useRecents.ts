import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import { useRecentQueriesStore } from 'lib/recentQueries/recentQueriesStore';
import type { RecentQueryEntry } from 'lib/recentQueries/types';
import { bucketKey } from 'lib/recentQueries/utils';
import type { SignalType } from 'types/api/v5/queryRange';

// Stable empty reference so the selector returns the same array when a bucket
// has no entries — avoids re-renders via zustand's Object.is comparison.
const EMPTY: RecentQueryEntry[] = [];

// Subscribes the calling component to the recent-queries store and returns the
// entries for the given (signal, source) bucket. On cold reads, falls back to
// localStorage (via the store's cached loader) so the first render after a
// reload doesn't show empty before zustand state hydrates.
export function useRecents(
	signal: SignalType,
	source: string,
): RecentQueryEntry[] {
	return useRecentQueriesStore((s) => {
		const key = bucketKey(signal, source);
		const fromState = s.buckets[key];
		if (fromState) {
			return fromState;
		}
		// `list` returns [] for an unknown bucket; we hand back EMPTY to keep
		// reference identity stable across selector invocations.
		const fromStorage = recentQueriesStore.list(signal, source);
		return fromStorage.length > 0 ? fromStorage : EMPTY;
	});
}
