import type { SignalType } from 'types/api/v5/queryRange';

import { normalizeFilterExpression } from './normalize';
import type { RecentQueriesStoreShape, RecentQueryEntry } from './types';

const STORAGE_KEY_PREFIX = 'qb_recent_v1';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 10;
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

function writeToStorage(signal: SignalType, entries: RecentQueryEntry[]): void {
	if (!hasLocalStorage()) {
		return;
	}
	try {
		window.localStorage.setItem(
			storageKey(signal),
			JSON.stringify({ version: STORAGE_VERSION, entries }),
		);
	} catch {
		console.warn('Failed to persist recent queries to localStorage');
		// Persistence failed; cache still reflects the user's intent in-session.
	}
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
	const filtered = current.filter(
		(e) => normalizeFilterExpression(e.filter.expression) !== normalized,
	);

	const newEntry: RecentQueryEntry = {
		...entry,
		id,
		lastUsedAt: Date.now(),
	};

	const next = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
	cache.set(entry.signal, next);
	writeToStorage(entry.signal, next);
	notify();
	return newEntry;
}

export function remove(id: string, signal: SignalType): void {
	const current = getCache(signal);
	const next = current.filter((e) => e.id !== id);
	if (next.length === current.length) {
		return;
	}
	cache.set(signal, next);
	writeToStorage(signal, next);
	notify();
}

export function subscribe(cb: () => void): () => void {
	subscribers.add(cb);
	return (): void => {
		subscribers.delete(cb);
	};
}

function parseSignalFromStorageKey(key: string): SignalType | null {
	return SIGNALS.find((s) => storageKey(s) === key) ?? null;
}

function handleCrossTabStorageEvent(event: StorageEvent): void {
	if (!event.key) {
		return;
	}
	const signal = parseSignalFromStorageKey(event.key);
	if (!signal) {
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

// Test-only escape hatch.
export function __resetForTests(): void {
	cache.clear();
	subscribers.clear();
	if (hasLocalStorage()) {
		SIGNALS.forEach((s) => window.localStorage.removeItem(storageKey(s)));
	}
}

// Test-only escape hatch.
export function __dropCacheForTests(): void {
	cache.clear();
}
