import type { Filter, SignalType } from 'types/api/v5/queryRange';

// A stored recent search. We persist only the where-clause expression — the
// rest of the query bundle (groupBy/orderBy/having/limit) lives on the
// current builder query and is left untouched when a recent is selected.
export interface RecentQueryEntry {
	id: string;
	signal: SignalType;
	filter: Filter;
	lastUsedAt: number;
}

export interface RecentQueriesStoreShape {
	version: 1;
	entries: RecentQueryEntry[];
}
