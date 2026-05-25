import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ColumnSizingState, VisibilityState } from '@tanstack/react-table';

import { TableColumnDef } from './types';
import {
	cleanupStaleHiddenColumns as storeCleanupStaleHiddenColumns,
	hideColumn as storeHideColumn,
	initializeFromDefaults as storeInitializeFromDefaults,
	resetToDefaults as storeResetToDefaults,
	setColumnOrder as storeSetColumnOrder,
	setColumnSizing as storeSetColumnSizing,
	showColumn as storeShowColumn,
	toggleColumn as storeToggleColumn,
	useColumnOrder as useStoreOrder,
	useColumnSizing as useStoreSizing,
	useHiddenColumnIds,
} from './useColumnStore';

type UseColumnStateOptions<TData> = {
	storageKey?: string;
	columns: TableColumnDef<TData>[];
	isGrouped?: boolean;
};

type UseColumnStateResult<TData> = {
	columnVisibility: VisibilityState;
	columnSizing: ColumnSizingState;
	/** Columns sorted by persisted order (pinned first) */
	sortedColumns: TableColumnDef<TData>[];
	hiddenColumnIds: string[];
	hideColumn: (columnId: string) => void;
	showColumn: (columnId: string) => void;
	toggleColumn: (columnId: string) => void;
	setColumnSizing: (sizing: ColumnSizingState) => void;
	setColumnOrder: (columns: TableColumnDef<TData>[]) => void;
	resetToDefaults: () => void;
};

export function useColumnState<TData>({
	storageKey,
	columns,
	isGrouped = false,
}: UseColumnStateOptions<TData>): UseColumnStateResult<TData> {
	useEffect(() => {
		if (storageKey) {
			storeInitializeFromDefaults(storageKey, columns);
		}
		// Only run on mount, not when columns change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storageKey]);

	const rawHiddenColumnIds = useHiddenColumnIds(storageKey ?? '');

	useEffect(
		function cleanupHiddenColumnIdsNoLongerInDefinitions(): void {
			if (!storageKey) {
				return;
			}

			const validColumnIds = new Set(columns.map((c) => c.id));
			storeCleanupStaleHiddenColumns(storageKey, validColumnIds);
		},
		[storageKey, columns],
	);

	const columnSizing = useStoreSizing(storageKey ?? '');
	const prevColumnIdsRef = useRef<Set<string> | null>(null);

	useEffect(
		function autoShowNewlyAddedColumns(): void {
			if (!storageKey) {
				return;
			}

			const currentIds = new Set(columns.map((c) => c.id));

			// Skip first render - just record the initial columns
			if (prevColumnIdsRef.current === null) {
				prevColumnIdsRef.current = currentIds;
				return;
			}

			const prevIds = prevColumnIdsRef.current;

			// Find columns that are new (in current but not in previous)
			for (const id of currentIds) {
				if (!prevIds.has(id) && rawHiddenColumnIds.includes(id)) {
					// Column was just added and is hidden - show it
					storeShowColumn(storageKey, id);
				}
			}

			prevColumnIdsRef.current = currentIds;
		},
		[storageKey, columns, rawHiddenColumnIds],
	);

	const columnOrder = useStoreOrder(storageKey ?? '');
	const columnMap = useMemo(
		() => new Map(columns.map((c) => [c.id, c])),
		[columns],
	);

	const hiddenColumnIds = useMemo(
		() =>
			rawHiddenColumnIds.filter((id) => {
				const col = columnMap.get(id);
				return col && col.canBeHidden !== false;
			}),
		[rawHiddenColumnIds, columnMap],
	);

	const columnVisibility = useMemo((): VisibilityState => {
		const visibility: VisibilityState = {};

		for (const id of hiddenColumnIds) {
			visibility[id] = false;
		}

		for (const column of columns) {
			if (column.visibilityBehavior === 'hidden-on-expand' && isGrouped) {
				visibility[column.id] = false;
			}
			if (column.visibilityBehavior === 'hidden-on-collapse' && !isGrouped) {
				visibility[column.id] = false;
			}
		}

		return visibility;
	}, [hiddenColumnIds, columns, isGrouped]);

	const sortedColumns = useMemo((): TableColumnDef<TData>[] => {
		if (columnOrder.length === 0) {
			return columns;
		}

		const orderMap = new Map(columnOrder.map((id, i) => [id, i]));
		const pinned = columns.filter((c) => c.pin != null);
		const rest = columns.filter((c) => c.pin == null);
		const sortedRest = [...rest].sort((a, b) => {
			const ai = orderMap.get(a.id) ?? Infinity;
			const bi = orderMap.get(b.id) ?? Infinity;
			return ai - bi;
		});

		return [...pinned, ...sortedRest];
	}, [columns, columnOrder]);

	const hideColumn = useCallback(
		(columnId: string) => {
			if (!storageKey) {
				return;
			}
			// Prevent hiding columns with canBeHidden: false
			const col = columnMap.get(columnId);
			if (col && col.canBeHidden === false) {
				return;
			}
			storeHideColumn(storageKey, columnId);
		},
		[storageKey, columnMap],
	);

	const showColumn = useCallback(
		(columnId: string) => {
			if (storageKey) {
				storeShowColumn(storageKey, columnId);
			}
		},
		[storageKey],
	);

	const toggleColumn = useCallback(
		(columnId: string) => {
			if (!storageKey) {
				return;
			}
			const col = columnMap.get(columnId);
			const isCurrentlyHidden = hiddenColumnIds.includes(columnId);
			if (col && col.canBeHidden === false && !isCurrentlyHidden) {
				return;
			}
			storeToggleColumn(storageKey, columnId);
		},
		[storageKey, columnMap, hiddenColumnIds],
	);

	const setColumnSizing = useCallback(
		(sizing: ColumnSizingState) => {
			if (storageKey) {
				storeSetColumnSizing(storageKey, sizing);
			}
		},
		[storageKey],
	);

	const setColumnOrder = useCallback(
		(cols: TableColumnDef<TData>[]) => {
			if (storageKey) {
				storeSetColumnOrder(
					storageKey,
					cols.map((c) => c.id),
				);
			}
		},
		[storageKey],
	);

	const resetToDefaults = useCallback(() => {
		if (storageKey) {
			storeResetToDefaults(storageKey, columns);
		}
	}, [storageKey, columns]);

	return {
		columnVisibility,
		columnSizing,
		sortedColumns,
		hiddenColumnIds,
		hideColumn,
		showColumn,
		toggleColumn,
		setColumnSizing,
		setColumnOrder,
		resetToDefaults,
	};
}
