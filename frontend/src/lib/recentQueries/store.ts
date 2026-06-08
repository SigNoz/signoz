import type { SignalType } from 'types/api/v5/queryRange';

import { normalizeFilterExpression } from './normalize';
import type { RecentQueriesStoreShape, RecentQueryEntry } from './types';

const STORAGE_KEY_PREFIX = 'qb_recent_v1';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 10;
const SIGNALS: readonly SignalType[] = ['logs', 'traces', 'metrics'];

function normalizeSource(source: string | undefined): string {
	return source ?? '';
}

function bucketKey(signal: SignalType, source: string): string {
	return `${signal}:${source}`;
}

const storageKey = (signal: SignalType, source: string): string =>
	`${STORAGE_KEY_PREFIX}:${bucketKey(signal, source)}`;

const cache = new Map<string, RecentQueryEntry[]>();
const subscribers = new Set<() => void>();

function hasLocalStorage(): boolean {
	return (
		typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
	);
}

function readFromStorage(
	signal: SignalType,
	source: string,
): RecentQueryEntry[] {
	if (!hasLocalStorage()) {
		return [];
	}
	try {
		const raw = window.localStorage.getItem(storageKey(signal, source));
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw) as RecentQueriesStoreShape;
		if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.entries)) {
			return [];
		}
		return parsed.entries;
	} catch {
		return [];
	}
}

function writeToStorage(
	signal: SignalType,
	source: string,
	entries: RecentQueryEntry[],
): void {
	if (!hasLocalStorage()) {
		return;
	}
	try {
		window.localStorage.setItem(
			storageKey(signal, source),
			JSON.stringify({ version: STORAGE_VERSION, entries }),
		);
	} catch {
		console.warn('Failed to persist recent queries to localStorage');
		// Persistence failed; cache still reflects the user's intent in-session.
	}
}

function getCache(signal: SignalType, source: string): RecentQueryEntry[] {
	const key = bucketKey(signal, source);
	const existing = cache.get(key);
	if (existing) {
		return existing;
	}
	const fresh = readFromStorage(signal, source);
	cache.set(key, fresh);
	return fresh;
}

function notify(): void {
	subscribers.forEach((cb) => cb());
}

// Deterministic id derived from the dedup key. Two saves with the same
// (signal, source, normalized filter) produce the same id and upsert.
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

export function list(signal: SignalType, source = ''): RecentQueryEntry[] {
	return getCache(signal, source);
}

export function save(entry: RecentQueryInput): RecentQueryEntry | null {
	const normalized = normalizeFilterExpression(entry.filter.expression);
	if (!normalized) {
		return null;
	}

	const source = normalizeSource(entry.source);
	const id = makeId(entry.signal, source, normalized);
	const current = getCache(entry.signal, source);
	const filtered = current.filter(
		(e) => normalizeFilterExpression(e.filter.expression) !== normalized,
	);

	const newEntry: RecentQueryEntry = {
		...entry,
		source,
		id,
		lastUsedAt: Date.now(),
	};

	const next = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
	cache.set(bucketKey(entry.signal, source), next);
	writeToStorage(entry.signal, source, next);
	notify();
	return newEntry;
}

export function remove(id: string, signal: SignalType, source = ''): void {
	const current = getCache(signal, source);
	const next = current.filter((e) => e.id !== id);
	if (next.length === current.length) {
		return;
	}
	cache.set(bucketKey(signal, source), next);
	writeToStorage(signal, source, next);
	notify();
}

export function subscribe(cb: () => void): () => void {
	subscribers.add(cb);
	return (): void => {
		subscribers.delete(cb);
	};
}

function parseBucketFromStorageKey(
	key: string,
): { signal: SignalType; source: string } | null {
	const prefix = `${STORAGE_KEY_PREFIX}:`;
	if (!key.startsWith(prefix)) {
		return null;
	}
	const remainder = key.slice(prefix.length);
	const colonIdx = remainder.indexOf(':');
	if (colonIdx === -1) {
		return null;
	}
	const signal = remainder.slice(0, colonIdx) as SignalType;
	if (!SIGNALS.includes(signal)) {
		return null;
	}
	const source = remainder.slice(colonIdx + 1);
	return { signal, source };
}

function handleCrossTabStorageEvent(event: StorageEvent): void {
	if (!event.key) {
		return;
	}
	const bucket = parseBucketFromStorageKey(event.key);
	if (!bucket) {
		return;
	}
	cache.set(
		bucketKey(bucket.signal, bucket.source),
		readFromStorage(bucket.signal, bucket.source),
	);
	notify();
}

if (
	typeof window !== 'undefined' &&
	typeof window.addEventListener === 'function'
) {
	window.addEventListener('storage', handleCrossTabStorageEvent);
}

// Test-only escape hatch.
export function __resetForTests(): void {
	cache.clear();
	subscribers.clear();
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

// Test-only escape hatch.
export function __dropCacheForTests(): void {
	cache.clear();
}
