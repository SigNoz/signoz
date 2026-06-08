import { create } from 'zustand';
import type { SignalType } from 'types/api/v5/queryRange';

import { normalizeFilterExpression } from './normalize';
import type { RecentQueriesStoreShape, RecentQueryEntry } from './types';

const STORAGE_KEY_PREFIX = 'qb_recent_v1';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 10;

function normalizeSource(source: string | undefined): string {
	return source ?? '';
}

function bucketKey(signal: SignalType, source: string): string {
	return `${signal}:${source}`;
}

function storageKeyFor(signal: SignalType, source: string): string {
	return `${STORAGE_KEY_PREFIX}:${bucketKey(signal, source)}`;
}

function hasLocalStorage(): boolean {
	return (
		typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
	);
}

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
	if (!hasLocalStorage()) {
		return null;
	}
	const key = bucketKey(signal, source);
	try {
		const raw = window.localStorage.getItem(storageKeyFor(signal, source));
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
	if (!hasLocalStorage()) {
		return;
	}
	try {
		const raw = JSON.stringify({ version: STORAGE_VERSION, entries });
		window.localStorage.setItem(storageKeyFor(signal, source), raw);
		persistedBucketCache.set(bucketKey(signal, source), { raw, parsed: entries });
	} catch {
		// Persistence failed; zustand state still reflects the user's intent in-session.
	}
}

// Same (signal, source, normalized filter) ⇒ same id ⇒ upsert.
function makeId(
	signal: SignalType,
	source: string,
	normalizedFilter: string,
): string {
	return `${signal}|${source}|${normalizedFilter}`;
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

// Test escape hatch: clears state, cache, and qb_recent_v1:* localStorage keys.
export function __resetForTests(): void {
	useRecentQueriesStore.setState({ buckets: {} });
	persistedBucketCache.clear();
	if (!hasLocalStorage()) {
		return;
	}
	const toRemove: string[] = [];
	for (let i = 0; i < window.localStorage.length; i += 1) {
		const k = window.localStorage.key(i);
		if (k && k.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
			toRemove.push(k);
		}
	}
	toRemove.forEach((k) => window.localStorage.removeItem(k));
}

// Test escape hatch: drops in-memory state but leaves localStorage — exercises cold-read.
export function __dropCacheForTests(): void {
	useRecentQueriesStore.setState({ buckets: {} });
	persistedBucketCache.clear();
}
