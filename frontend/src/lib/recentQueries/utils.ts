import type { SignalType } from 'types/api/v5/queryRange';

import { STORAGE_KEY_PREFIX } from './constants';

export function normalizeSource(source: string | undefined): string {
	return source ?? '';
}

export function bucketKey(signal: SignalType, source: string): string {
	return `${signal}:${source}`;
}

export function storageKeyFor(signal: SignalType, source: string): string {
	return `${STORAGE_KEY_PREFIX}:${bucketKey(signal, source)}`;
}

// Same (signal, source, normalized filter) ⇒ same id ⇒ upsert.
export function makeId(
	signal: SignalType,
	source: string,
	normalizedFilter: string,
): string {
	return `${signal}|${source}|${normalizedFilter}`;
}
