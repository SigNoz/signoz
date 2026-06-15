import type { SignalType } from 'types/api/v5/queryRange';

import * as store from './recentQueriesStore';
import type { RecentQueryEntry } from './types';

// Synchronous, non-subscribing read of the recent-queries bucket for a given
// (signal, source). Read-on-demand by design — subscribing here would
// reconfigure CodeMirror on every store change and close any open completion
// popup. Pair with saveQuery() for the write path.
export function getRecentQueries(
	signal: SignalType,
	source = '',
): RecentQueryEntry[] {
	return store.list(signal, source);
}
