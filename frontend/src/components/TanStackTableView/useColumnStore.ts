import { ColumnSizingState } from '@tanstack/react-table';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { create } from 'zustand';

import { TableColumnDef } from './types';

const STORAGE_PREFIX = '@signoz/table-columns/';

const persistedTableCache = new Map<
	string,
	{ raw: string; parsed: ColumnState }
>();

type ColumnState = {
	hiddenColumnIds: string[];
	columnOrder: string[];
	columnSizing: ColumnSizingState;
};

const EMPTY_STATE: ColumnState = {
	hiddenColumnIds: [],
	columnOrder: [],
	columnSizing: {},
};

type ColumnStoreState = {
	tables: Record<string, ColumnState>;
	hideColumn: (storageKey: string, columnId: string) => void;
	showColumn: (storageKey: string, columnId: string) => void;
	toggleColumn: (storageKey: string, columnId: string) => void;
	setColumnSizing: (storageKey: string, sizing: ColumnSizingState) => void;
	setColumnOrder: (storageKey: string, order: string[]) => void;
	initializeFromDefaults: <TData>(
		storageKey: string,
		columns: TableColumnDef<TData>[],
	) => void;
	resetToDefaults: <TData>(
		storageKey: string,
		columns: TableColumnDef<TData>[],
	) => void;
	cleanupStaleHiddenColumns: (
		storageKey: string,
		validColumnIds: Set<string>,
	) => void;
};

const getDefaultHiddenIds = <TData>(
	columns: TableColumnDef<TData>[],
): string[] =>
	columns.filter((c) => c.defaultVisibility === false).map((c) => c.id);

const getStorageKeyForTable = (tableKey: string): string =>
	`${STORAGE_PREFIX}${tableKey}`;

const loadTableFromStorage = (tableKey: string): ColumnState | null => {
	try {
		const raw = get(getStorageKeyForTable(tableKey));
		if (!raw) {
			persistedTableCache.delete(tableKey);
			return null;
		}

		const cached = persistedTableCache.get(tableKey);
		if (cached && cached.raw === raw) {
			return cached.parsed;
		}

		const parsed = JSON.parse(raw) as ColumnState;
		persistedTableCache.set(tableKey, { raw, parsed });
		return parsed;
	} catch {
		persistedTableCache.delete(tableKey);
		return null;
	}
};

const saveTableToStorage = (tableKey: string, state: ColumnState): void => {
	try {
		const raw = JSON.stringify(state);
		set(getStorageKeyForTable(tableKey), raw);
		persistedTableCache.set(tableKey, { raw, parsed: state });
	} catch {
		// Ignore storage errors (e.g., private browsing quota exceeded)
	}
};

export const useColumnStore = create<ColumnStoreState>()((set, get) => {
	return {
		tables: {},
		hideColumn: (storageKey, columnId): void => {
			const state = get();
			let table = state.tables[storageKey];

			// Lazy load from storage if not in memory
			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				if (persisted) {
					table = persisted;
					set({ tables: { ...state.tables, [storageKey]: table } });
				} else {
					return;
				}
			}

			if (table.hiddenColumnIds.includes(columnId)) {
				return;
			}

			const nextTable = {
				...table,
				hiddenColumnIds: [...table.hiddenColumnIds, columnId],
			};
			set({ tables: { ...get().tables, [storageKey]: nextTable } });
			saveTableToStorage(storageKey, nextTable);
		},
		showColumn: (storageKey, columnId): void => {
			const state = get();
			let table = state.tables[storageKey];

			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				if (persisted) {
					table = persisted;
					set({ tables: { ...state.tables, [storageKey]: table } });
				} else {
					return;
				}
			}

			if (!table.hiddenColumnIds.includes(columnId)) {
				return;
			}

			const nextTable = {
				...table,
				hiddenColumnIds: table.hiddenColumnIds.filter((id) => id !== columnId),
			};
			set({ tables: { ...get().tables, [storageKey]: nextTable } });
			saveTableToStorage(storageKey, nextTable);
		},
		toggleColumn: (storageKey, columnId): void => {
			const state = get();
			let table = state.tables[storageKey];

			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				if (persisted) {
					table = persisted;
					set({ tables: { ...state.tables, [storageKey]: table } });
				}
			}

			if (!table) {
				return;
			}

			const isHidden = table.hiddenColumnIds.includes(columnId);
			if (isHidden) {
				get().showColumn(storageKey, columnId);
			} else {
				get().hideColumn(storageKey, columnId);
			}
		},
		setColumnSizing: (storageKey, sizing): void => {
			const state = get();
			let table = state.tables[storageKey];

			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				table = persisted ?? { ...EMPTY_STATE };
			}

			const nextTable = {
				...table,
				columnSizing: sizing,
			};
			set({ tables: { ...get().tables, [storageKey]: nextTable } });
			saveTableToStorage(storageKey, nextTable);
		},
		setColumnOrder: (storageKey, order): void => {
			const state = get();
			let table = state.tables[storageKey];

			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				table = persisted ?? { ...EMPTY_STATE };
			}

			const nextTable = {
				...table,
				columnOrder: order,
			};
			set({ tables: { ...get().tables, [storageKey]: nextTable } });
			saveTableToStorage(storageKey, nextTable);
		},
		initializeFromDefaults: (storageKey, columns): void => {
			const state = get();

			if (state.tables[storageKey]) {
				return;
			}

			const persisted = loadTableFromStorage(storageKey);
			if (persisted) {
				set({ tables: { ...state.tables, [storageKey]: persisted } });
				return;
			}

			const newTable: ColumnState = {
				hiddenColumnIds: getDefaultHiddenIds(columns),
				columnOrder: [],
				columnSizing: {},
			};
			set({ tables: { ...state.tables, [storageKey]: newTable } });
			saveTableToStorage(storageKey, newTable);
		},

		resetToDefaults: (storageKey, columns): void => {
			const newTable: ColumnState = {
				hiddenColumnIds: getDefaultHiddenIds(columns),
				columnOrder: [],
				columnSizing: {},
			};
			set({ tables: { ...get().tables, [storageKey]: newTable } });
			saveTableToStorage(storageKey, newTable);
		},

		cleanupStaleHiddenColumns: (storageKey, validColumnIds): void => {
			const state = get();
			let table = state.tables[storageKey];

			if (!table) {
				const persisted = loadTableFromStorage(storageKey);
				if (!persisted) {
					return;
				}
				table = persisted;
			}

			const filteredHiddenIds = table.hiddenColumnIds.filter((id) =>
				validColumnIds.has(id),
			);

			// Only update if something changed
			if (filteredHiddenIds.length === table.hiddenColumnIds.length) {
				return;
			}

			const nextTable = {
				...table,
				hiddenColumnIds: filteredHiddenIds,
			};
			set({ tables: { ...get().tables, [storageKey]: nextTable } });
			saveTableToStorage(storageKey, nextTable);
		},
	};
});

// Stable empty references to avoid `Object.is` false-negatives when a key
// does not exist yet (returning a new `[]` / `{}` on every selector call
// would trigger React's useSyncExternalStore tearing detection).
const EMPTY_ARRAY: string[] = [];
const EMPTY_SIZING: ColumnSizingState = {};

export const useHiddenColumnIds = (storageKey: string): string[] =>
	useColumnStore((s) => {
		const table = s.tables[storageKey];
		if (table) {
			return table.hiddenColumnIds;
		}
		const persisted = loadTableFromStorage(storageKey);
		return persisted?.hiddenColumnIds ?? EMPTY_ARRAY;
	});

export const useColumnSizing = (storageKey: string): ColumnSizingState =>
	useColumnStore((s) => {
		const table = s.tables[storageKey];
		if (table) {
			return table.columnSizing;
		}
		const persisted = loadTableFromStorage(storageKey);
		return persisted?.columnSizing ?? EMPTY_SIZING;
	});

export const useColumnOrder = (storageKey: string): string[] =>
	useColumnStore((s) => {
		const table = s.tables[storageKey];
		if (table) {
			return table.columnOrder;
		}
		const persisted = loadTableFromStorage(storageKey);
		return persisted?.columnOrder ?? EMPTY_ARRAY;
	});

export const initializeFromDefaults = <TData>(
	storageKey: string,
	columns: TableColumnDef<TData>[],
): void =>
	useColumnStore.getState().initializeFromDefaults(storageKey, columns);

export const hideColumn = (storageKey: string, columnId: string): void =>
	useColumnStore.getState().hideColumn(storageKey, columnId);

export const showColumn = (storageKey: string, columnId: string): void =>
	useColumnStore.getState().showColumn(storageKey, columnId);

export const toggleColumn = (storageKey: string, columnId: string): void =>
	useColumnStore.getState().toggleColumn(storageKey, columnId);

export const setColumnSizing = (
	storageKey: string,
	sizing: ColumnSizingState,
): void => useColumnStore.getState().setColumnSizing(storageKey, sizing);

export const setColumnOrder = (storageKey: string, order: string[]): void =>
	useColumnStore.getState().setColumnOrder(storageKey, order);

export const resetToDefaults = <TData>(
	storageKey: string,
	columns: TableColumnDef<TData>[],
): void => useColumnStore.getState().resetToDefaults(storageKey, columns);

export const cleanupStaleHiddenColumns = (
	storageKey: string,
	validColumnIds: Set<string>,
): void =>
	useColumnStore
		.getState()
		.cleanupStaleHiddenColumns(storageKey, validColumnIds);
