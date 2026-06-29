import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import type { SignalType } from 'types/api/v5/queryRange';
import { create } from 'zustand';

import { MAX_ENTRIES, STORAGE_VERSION } from './constants';
import { normalizeFilterExpression } from './normalize';
import type { RecentQueriesStoreShape, RecentQueryEntry } from './types';
import { bucketKey, makeId, normalizeSource, storageKeyFor } from './utils';

// Mirrors parsed localStorage so equal raw strings return the same array ref —
// preserves Object.is for zustand selector bail-out.
const persistedBucketCache = new Map<
	string,
	{ raw: string; parsed: RecentQueryEntry[] }
>();

function loadBucketFromStorage(
	signal: SignalType,
	source: string,
): RecentQueryEntry[] | null {
	const key = bucketKey(signal, source);
	try {
		const raw = get(storageKeyFor(signal, source));
		if (!raw) {
			persistedBucketCache.delete(key);
			return null;
		}
		const cached = persistedBucketCache.get(key);
		if (cached && cached.raw === raw) {
			return cached.parsed;
		}
		const parsedShape = JSON.parse(raw) as RecentQueriesStoreShape;
		if (
			parsedShape?.version !== STORAGE_VERSION ||
			!Array.isArray(parsedShape.entries)
		) {
			persistedBucketCache.delete(key);
			return null;
		}
		persistedBucketCache.set(key, { raw, parsed: parsedShape.entries });
		return parsedShape.entries;
	} catch {
		persistedBucketCache.delete(key);
		return null;
	}
}

function saveBucketToStorage(
	signal: SignalType,
	source: string,
	entries: RecentQueryEntry[],
): void {
	try {
		const raw = JSON.stringify({ version: STORAGE_VERSION, entries });
		if (set(storageKeyFor(signal, source), raw)) {
			persistedBucketCache.set(bucketKey(signal, source), {
				raw,
				parsed: entries,
			});
		}
	} catch {
		// Ignore storage errors (e.g. quota exceeded, JSON.stringify failure).
	}
}

export type RecentQueryInput = Omit<
	RecentQueryEntry,
	'id' | 'lastUsedAt' | 'source'
> & {
	source?: string;
};

type RecentQueriesState = {
	buckets: Record<string, RecentQueryEntry[]>;
	save: (entry: RecentQueryInput) => RecentQueryEntry | null;
	remove: (id: string, signal: SignalType, source?: string) => void;
};

export const useRecentQueriesStore = create<RecentQueriesState>()(
	(set, get) => ({
		buckets: {},

		save: (entry): RecentQueryEntry | null => {
			const normalized = normalizeFilterExpression(entry.filter.expression);
			if (!normalized) {
				return null;
			}
			const source = normalizeSource(entry.source);
			const key = bucketKey(entry.signal, source);

			const current =
				get().buckets[key] ?? loadBucketFromStorage(entry.signal, source) ?? [];
			const filtered = current.filter(
				(e) => normalizeFilterExpression(e.filter.expression) !== normalized,
			);

			const newEntry: RecentQueryEntry = {
				...entry,
				source,
				id: makeId(entry.signal, source, normalized),
				lastUsedAt: Date.now(),
			};

			const next = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
			set({ buckets: { ...get().buckets, [key]: next } });
			saveBucketToStorage(entry.signal, source, next);
			return newEntry;
		},

		remove: (id, signal, source = ''): void => {
			const key = bucketKey(signal, source);
			const current = get().buckets[key] ?? loadBucketFromStorage(signal, source);
			if (!current) {
				return;
			}
			const next = current.filter((e) => e.id !== id);
			if (next.length === current.length) {
				return;
			}
			set({ buckets: { ...get().buckets, [key]: next } });
			saveBucketToStorage(signal, source, next);
		},
	}),
);

// Plain-function wrappers for non-React callers — same pattern as useColumnStore.ts.
export function save(entry: RecentQueryInput): RecentQueryEntry | null {
	return useRecentQueriesStore.getState().save(entry);
}

export function remove(id: string, signal: SignalType, source = ''): void {
	useRecentQueriesStore.getState().remove(id, signal, source);
}

// Synchronous bucket read with localStorage fallback for non-React callers.
export function list(signal: SignalType, source = ''): RecentQueryEntry[] {
	const key = bucketKey(signal, source);
	const state = useRecentQueriesStore.getState();
	if (state.buckets[key]) {
		return state.buckets[key];
	}
	return loadBucketFromStorage(signal, source) ?? [];
}
