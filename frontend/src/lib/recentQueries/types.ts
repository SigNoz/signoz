import type { Filter, SignalType } from 'types/api/v5/queryRange';

export interface RecentQueryEntry {
	id: string;
	signal: SignalType;
	source: string;
	filter: Filter;
	lastUsedAt: number;
}

export interface RecentQueriesStoreShape {
	version: 1;
	entries: RecentQueryEntry[];
}
