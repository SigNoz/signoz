import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { ColumnSizingState } from '@tanstack/react-table';
import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';

import { TableColumnDef, TableColumnsState } from './types';

const DEBOUNCE_MS = 250;

type PersistedState = {
	columnOrder: string[];
	columnSizing: ColumnSizingState;
	removedColumnIds: string[];
};

const EMPTY: PersistedState = {
	columnOrder: [],
	columnSizing: {},
	removedColumnIds: [],
};

function readStorage(storageKey: string): PersistedState {
	const raw = getFromLocalstorage(storageKey);
	if (!raw) {
		return EMPTY;
	}
	try {
		const parsed = JSON.parse(raw) as PersistedState;
		return {
			columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [],
			columnSizing:
				parsed.columnSizing && typeof parsed.columnSizing === 'object'
					? Object.fromEntries(
							Object.entries(parsed.columnSizing).filter(
								([, v]) => typeof v === 'number' && Number.isFinite(v) && v > 0,
							),
						)
					: {},
			removedColumnIds: Array.isArray(parsed.removedColumnIds)
				? parsed.removedColumnIds
				: [],
		};
	} catch (e) {
		console.error('useTableColumns: failed to parse storage', e);
		return EMPTY;
	}
}

type UseTableColumnsOptions = { storageKey?: string };

type UseTableColumnsResult<TData> = {
	tableProps: TableColumnsState<TData>;
	activeColumnIds: string[];
};

export function useTableColumns<TData>(
	definitions: TableColumnDef<TData>[],
	options?: UseTableColumnsOptions,
): UseTableColumnsResult<TData> {
	const { storageKey } = options ?? {};

	const [persisted, setPersisted] = useState<PersistedState>(() =>
		storageKey ? readStorage(storageKey) : EMPTY,
	);

	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
		() => persisted.columnSizing,
	);

	const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const persistedRef = useRef(persisted);
	persistedRef.current = persisted;
	const columnSizingRef = useRef(columnSizing);
	columnSizingRef.current = columnSizing;

	const scheduleWrite = useCallback(() => {
		if (!storageKey) {
			return;
		}
		if (pendingRef.current !== null) {
			clearTimeout(pendingRef.current);
		}
		pendingRef.current = setTimeout(() => {
			setToLocalstorage(
				storageKey,
				JSON.stringify({
					...persistedRef.current,
					columnSizing: columnSizingRef.current,
				}),
			);
		}, DEBOUNCE_MS);
	}, [storageKey]);

	useEffect(() => {
		scheduleWrite();
		return (): void => {
			if (pendingRef.current !== null) {
				clearTimeout(pendingRef.current);
			}
		};
	}, [columnSizing, scheduleWrite]);

	const handleColumnSizingChange: Dispatch<
		SetStateAction<ColumnSizingState>
	> = useCallback((updater) => {
		setColumnSizing((prev) =>
			typeof updater === 'function' ? updater(prev) : updater,
		);
	}, []);

	const handleColumnOrderChange = useCallback(
		(updated: TableColumnDef<TData>[]) => {
			const newOrder = updated.map((c) => c.id);
			setPersisted((prev) => {
				const next = { ...prev, columnOrder: newOrder };
				if (storageKey) {
					setToLocalstorage(
						storageKey,
						JSON.stringify({
							...next,
							columnSizing: columnSizingRef.current,
						}),
					);
				}
				return next;
			});
		},
		[storageKey],
	);

	const handleRemoveColumn = useCallback(
		(id: string) => {
			setPersisted((prev) => {
				if (prev.removedColumnIds.includes(id)) {
					return prev;
				}
				const next = {
					...prev,
					removedColumnIds: [...prev.removedColumnIds, id],
				};
				if (storageKey) {
					if (pendingRef.current !== null) {
						clearTimeout(pendingRef.current);
					}
					pendingRef.current = setTimeout(() => {
						setToLocalstorage(
							storageKey,
							JSON.stringify({
								...next,
								columnSizing: columnSizingRef.current,
							}),
						);
					}, DEBOUNCE_MS);
				}
				return next;
			});
		},
		[storageKey],
	);

	const columns = useMemo<TableColumnDef<TData>[]>(() => {
		const removedSet = new Set(persisted.removedColumnIds);
		const active = definitions.filter((d) => !removedSet.has(d.id));

		if (persisted.columnOrder.length === 0) {
			return active;
		}

		const orderMap = new Map(persisted.columnOrder.map((id, i) => [id, i]));
		const pinned = active.filter((c) => c.pin != null);
		const rest = active.filter((c) => c.pin == null);
		const sortedRest = [...rest].sort((a, b) => {
			const ai = orderMap.get(a.id) ?? Infinity;
			const bi = orderMap.get(b.id) ?? Infinity;
			return ai - bi;
		});
		return [...pinned, ...sortedRest];
	}, [definitions, persisted]);

	const activeColumnIds = useMemo(() => columns.map((c) => c.id), [columns]);

	return {
		tableProps: {
			columns,
			columnSizing,
			onColumnSizingChange: handleColumnSizingChange,
			onColumnOrderChange: handleColumnOrderChange,
			onRemoveColumn: handleRemoveColumn,
		},
		activeColumnIds,
	};
}
