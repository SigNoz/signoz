import type { SignalType } from 'types/api/v5/queryRange';

import * as store from './recentQueriesStore';
import type { RecentQueryEntry } from './types';

// Non-subscribing read of recent searches for a (signal, source) bucket.
// Deliberately not the zustand hook — subscribing would reconfigure CodeMirror
// and close the open completion popup on every store change.
export function getRecentQueries(
	signal: SignalType,
	source: string,
): RecentQueryEntry[] {
	return store.list(signal, source);
}
