import type { SetStateAction } from 'react';
import { useCallback } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';

import { TableColumnDef } from './types';

export interface UseColumnHandlersOptions<TData> {
	/** Storage key for persisting column state (enables store mode) */
	columnStorageKey?: string;
	effectiveSizing: ColumnSizingState;
	storeSetSizing: (sizing: ColumnSizingState) => void;
	storeSetOrder: (columns: TableColumnDef<TData>[]) => void;
	hideColumn: (columnId: string) => void;
	onColumnSizingChange?: (sizing: ColumnSizingState) => void;
	onColumnOrderChange?: (columns: TableColumnDef<TData>[]) => void;
	onColumnRemove?: (columnId: string) => void;
}

export interface UseColumnHandlersResult<TData> {
	handleColumnSizingChange: (updater: SetStateAction<ColumnSizingState>) => void;
	handleColumnOrderChange: (columns: TableColumnDef<TData>[]) => void;
	handleRemoveColumn: (columnId: string) => void;
}

/**
 * Creates handlers for column state changes that delegate to either
 * the store (when columnStorageKey is provided) or prop callbacks.
 */
export function useColumnHandlers<TData>({
	columnStorageKey,
	effectiveSizing,
	storeSetSizing,
	storeSetOrder,
	hideColumn,
	onColumnSizingChange,
	onColumnOrderChange,
	onColumnRemove,
}: UseColumnHandlersOptions<TData>): UseColumnHandlersResult<TData> {
	const handleColumnSizingChange = useCallback(
		(updater: SetStateAction<ColumnSizingState>) => {
			const next =
				typeof updater === 'function' ? updater(effectiveSizing) : updater;
			if (columnStorageKey) {
				storeSetSizing(next);
			}
			onColumnSizingChange?.(next);
		},
		[columnStorageKey, effectiveSizing, storeSetSizing, onColumnSizingChange],
	);

	const handleColumnOrderChange = useCallback(
		(cols: TableColumnDef<TData>[]) => {
			if (columnStorageKey) {
				storeSetOrder(cols);
			}
			onColumnOrderChange?.(cols);
		},
		[columnStorageKey, storeSetOrder, onColumnOrderChange],
	);

	const handleRemoveColumn = useCallback(
		(columnId: string) => {
			if (columnStorageKey) {
				hideColumn(columnId);
			}
			onColumnRemove?.(columnId);
		},
		[columnStorageKey, hideColumn, onColumnRemove],
	);

	return {
		handleColumnSizingChange,
		handleColumnOrderChange,
		handleRemoveColumn,
	};
}
