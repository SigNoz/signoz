import { useCallback, useMemo, useState } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';

import {
	deserializeKeyPath,
	keyPathToDisplayString,
	resolveValueByKeys,
	serializeKeyPath,
} from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const STORAGE_PREFIX = 'pinnedFields';

function loadFromStorage(storageKey: string): string[] {
	try {
		const stored = getLocalStorageKey(storageKey);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function saveToStorage(storageKey: string, keys: string[]): void {
	setLocalStorageKey(storageKey, JSON.stringify(keys));
}

export interface PinnedEntry {
	serializedKey: string;
	displayKey: string;
	forwardPath: (string | number)[];
	value: unknown;
}

export interface UsePinnedFieldsReturn {
	isPinned: (serializedKey: string) => boolean;
	togglePin: (forwardPath: (string | number)[]) => void;
	pinnedEntries: PinnedEntry[];
	pinnedData: AnyRecord;
	displayKeyToForwardPath: Record<string, (string | number)[]>;
}

function usePinnedFields(
	data: AnyRecord,
	drawerKey: string,
): UsePinnedFieldsReturn {
	const storageKey = `${STORAGE_PREFIX}:${drawerKey}`;

	// Stored as serialized keyPath arrays (JSON strings)
	const [pinnedSerializedKeys, setPinnedSerializedKeys] = useState<Set<string>>(
		() => new Set(loadFromStorage(storageKey)),
	);

	const togglePin = useCallback(
		(forwardPath: (string | number)[]): void => {
			const serialized = serializeKeyPath(forwardPath);
			setPinnedSerializedKeys((prev) => {
				const next = new Set(prev);
				if (next.has(serialized)) {
					next.delete(serialized);
				} else {
					next.add(serialized);
				}
				saveToStorage(storageKey, Array.from(next));
				return next;
			});
		},
		[storageKey],
	);

	const isPinned = useCallback(
		(serializedKey: string): boolean => pinnedSerializedKeys.has(serializedKey),
		[pinnedSerializedKeys],
	);

	const pinnedEntries = useMemo(
		(): PinnedEntry[] =>
			Array.from(pinnedSerializedKeys)
				.map((serializedKey) => {
					const forwardPath = deserializeKeyPath(serializedKey);
					if (!forwardPath) {
						return null;
					}
					return {
						serializedKey,
						displayKey: keyPathToDisplayString(
							[...forwardPath].reverse() as readonly (string | number)[],
						),
						forwardPath,
						value: resolveValueByKeys(data, forwardPath),
					};
				})
				.filter(
					(entry): entry is PinnedEntry =>
						entry !== null && entry.value !== undefined,
				),
		[pinnedSerializedKeys, data],
	);

	// Flat object for the pinned JSONTree — use display key as the object key
	const pinnedData = useMemo(
		() =>
			Object.fromEntries(
				pinnedEntries.map((entry) => [entry.displayKey, entry.value]),
			),
		[pinnedEntries],
	);

	// Map from display key to original forward path — for unpin from pinned tree
	const displayKeyToForwardPath = useMemo(
		(): Record<string, (string | number)[]> =>
			Object.fromEntries(
				pinnedEntries.map((entry) => [entry.displayKey, entry.forwardPath]),
			),
		[pinnedEntries],
	);

	return {
		isPinned,
		togglePin,
		pinnedEntries,
		pinnedData,
		displayKeyToForwardPath,
	};
}

export default usePinnedFields;
