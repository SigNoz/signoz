import type { SignalType } from 'types/api/v5/queryRange';

import { normalizeFilterExpression } from './normalize';
import type {
	RecentQueriesStoreShape,
	RecentQueryEntry,
} from './types';

const STORAGE_KEY_PREFIX = 'qb_recent_v1';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 10;
const QUOTA_RETRY_FRACTION = 0.8;
const SIGNALS: readonly SignalType[] = ['logs', 'traces', 'metrics'];

const storageKey = (signal: SignalType): string =>
	`${STORAGE_KEY_PREFIX}:${signal}`;

const cache = new Map<SignalType, RecentQueryEntry[]>();
const subscribers = new Set<() => void>();

function hasLocalStorage(): boolean {
	return (
		typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
	);
}

function readFromStorage(signal: SignalType): RecentQueryEntry[] {
	if (!hasLocalStorage()) {
		return [];
	}
	try {
		const raw = window.localStorage.getItem(storageKey(signal));
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

// Attempts to persist; on write failure (typically QuotaExceededError), drops
// the oldest fraction and retries once. Returns the entries that were actually
// written (caller should mirror this into the in-memory cache so reads stay
// consistent).
function writeToStorage(
	signal: SignalType,
	entries: RecentQueryEntry[],
): RecentQueryEntry[] {
	if (!hasLocalStorage()) {
		return entries;
	}

	const persist = (toWrite: RecentQueryEntry[]): boolean => {
		try {
			window.localStorage.setItem(
				storageKey(signal),
				JSON.stringify({ version: STORAGE_VERSION, entries: toWrite }),
			);
			return true;
		} catch {
			// Swallow quota and other write errors. Caller retries with a trimmed
			// list when this returns false.
			return false;
		}
	};

	if (persist(entries)) {
		return entries;
	}

	const trimmed = entries.slice(
		0,
		Math.max(1, Math.floor(entries.length * QUOTA_RETRY_FRACTION)),
	);
	if (persist(trimmed)) {
		return trimmed;
	}
	return entries;
}

function getCache(signal: SignalType): RecentQueryEntry[] {
	const existing = cache.get(signal);
	if (existing) {
		return existing;
	}
	const fresh = readFromStorage(signal);
	cache.set(signal, fresh);
	return fresh;
}

function notify(): void {
	subscribers.forEach((cb) => cb());
}

// Deterministic id derived from the dedup key. Two saves with the same
// (signal, normalized filter) produce the same id and upsert.
function makeId(signal: SignalType, normalizedFilter: string): string {
	return `${signal}|${normalizedFilter}`;
}

export type RecentQueryInput = Omit<RecentQueryEntry, 'id' | 'lastUsedAt'>;

export function list(signal: SignalType): RecentQueryEntry[] {
	return getCache(signal);
}

export function save(entry: RecentQueryInput): RecentQueryEntry | null {
	const normalized = normalizeFilterExpression(entry.filter.expression);
	if (!normalized) {
		return null;
	}

	const id = makeId(entry.signal, normalized);
	const current = getCache(entry.signal);
	const filtered = current.filter((e) => e.id !== id);

	const newEntry: RecentQueryEntry = {
		...entry,
		id,
		lastUsedAt: Date.now(),
	};

	const next = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
	const persisted = writeToStorage(entry.signal, next);
	cache.set(entry.signal, persisted);
	notify();
	return newEntry;
}

export function remove(id: string, signal: SignalType): void {
	const current = getCache(signal);
	const next = current.filter((e) => e.id !== id);
	if (next.length === current.length) {
		return;
	}
	const persisted = writeToStorage(signal, next);
	cache.set(signal, persisted);
	notify();
}

export function subscribe(cb: () => void): () => void {
	subscribers.add(cb);
	return (): void => {
		subscribers.delete(cb);
	};
}

function handleCrossTabStorageEvent(event: StorageEvent): void {
	if (!event.key || !event.key.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
		return;
	}
	const signal = event.key.slice(STORAGE_KEY_PREFIX.length + 1) as SignalType;
	if (!SIGNALS.includes(signal)) {
		return;
	}
	cache.set(signal, readFromStorage(signal));
	notify();
}

if (
	typeof window !== 'undefined' &&
	typeof window.addEventListener === 'function'
) {
	window.addEventListener('storage', handleCrossTabStorageEvent);
}

// Test-only escape hatch. Clears in-memory cache, subscribers, and the
// localStorage keys we own. Should not be called from production code.
export function __resetForTests(): void {
	cache.clear();
	subscribers.clear();
	if (hasLocalStorage()) {
		SIGNALS.forEach((s) => window.localStorage.removeItem(storageKey(s)));
	}
}

// Test-only escape hatch. Drops the in-memory cache without touching
// localStorage, letting tests simulate a fresh page load that rehydrates from
// persisted data. Should not be called from production code.
export function __dropCacheForTests(): void {
	cache.clear();
}
