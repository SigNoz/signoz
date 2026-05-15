import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import remove from 'api/browser/localstorage/remove';
import { create } from 'zustand';

const STORAGE_PREFIX = '@signoz/table-columns/';
const STORAGE_SUFFIX = '-preferred-page-size';

type PreferredPageSizeState = {
	tables: Record<string, number | null>;
	setPreferredPageSize: (storageKey: string, pageSize: number | null) => void;
};

const getStorageKey = (tableKey: string): string =>
	`${STORAGE_PREFIX}${tableKey}${STORAGE_SUFFIX}`;

const loadFromStorage = (tableKey: string): number | null => {
	try {
		const raw = get(getStorageKey(tableKey));
		if (!raw) {
			return null;
		}
		const parsed = parseInt(raw, 10);
		return Number.isNaN(parsed) ? null : parsed;
	} catch {
		return null;
	}
};

const saveToStorage = (tableKey: string, pageSize: number | null): void => {
	try {
		const key = getStorageKey(tableKey);
		if (pageSize === null) {
			remove(key);
		} else {
			set(key, String(pageSize));
		}
	} catch {
		// Ignore storage errors
	}
};

export const usePreferredPageSizeStore = create<PreferredPageSizeState>()(
	(set, get) => ({
		tables: {},
		setPreferredPageSize: (storageKey, pageSize): void => {
			set({ tables: { ...get().tables, [storageKey]: pageSize } });
			saveToStorage(storageKey, pageSize);
		},
	}),
);

export function usePreferredPageSize(
	storageKey: string | undefined,
): [number | null, (pageSize: number | null) => void] {
	const pageSize = usePreferredPageSizeStore((s) => {
		if (!storageKey) {
			return null;
		}
		const cached = s.tables[storageKey];
		if (cached !== undefined) {
			return cached;
		}
		return loadFromStorage(storageKey);
	});

	const setPageSize = usePreferredPageSizeStore((s) => s.setPreferredPageSize);

	const setPreferred = (size: number | null): void => {
		if (storageKey) {
			setPageSize(storageKey, size);
		}
	};

	return [pageSize, setPreferred];
}

export function getPreferredPageSize(storageKey: string): number | null {
	// oxlint-disable-next-line signoz/no-zustand-getstate-in-hooks
	const state = usePreferredPageSizeStore.getState();
	const cached = state.tables[storageKey];
	if (cached !== undefined) {
		return cached;
	}

	const stored = loadFromStorage(storageKey);
	if (stored !== null) {
		state.setPreferredPageSize(storageKey, stored);
	}
	return stored;
}
