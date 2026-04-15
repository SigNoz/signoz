import type { CSSProperties, ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { RowKeyData, TableColumnDef } from './types';

export const getColumnId = <TData>(column: TableColumnDef<TData>): string =>
	column.id;

const DEFAULT_MIN_WIDTH = 192; // 12rem * 16px

/** Get CSS style properties for column width */
export const getColumnWidthStyle = <TData>(
	column: TableColumnDef<TData>,
	/** Persisted width from user resizing (overrides defined width) */
	persistedWidth?: number,
	/** Last column always gets width: 100% and ignores other width settings */
	isLastColumn?: boolean,
): CSSProperties => {
	// Last column always fills remaining space
	if (isLastColumn) {
		return { width: '100%' };
	}

	const { width } = column;
	if (!width) {
		return {
			width: persistedWidth ?? DEFAULT_MIN_WIDTH,
			minWidth: DEFAULT_MIN_WIDTH,
		};
	}
	// Fixed: all three properties set to the same value (ignore persisted)
	if (width.fixed != null) {
		return {
			width: width.fixed,
			minWidth: width.fixed,
			maxWidth: width.fixed,
		};
	}
	// Use persisted width if available, otherwise use defined width, fallback to min
	return {
		width: persistedWidth ?? width.default ?? width.min,
		minWidth: width.min ?? DEFAULT_MIN_WIDTH,
		maxWidth: width.max,
	};
};

/** Helper to build accessor function */
const buildAccessorFn = <TData>(
	colDef: TableColumnDef<TData>,
): ((row: TData) => unknown) => {
	return (row: TData): unknown => {
		if (colDef.accessorFn) {
			return colDef.accessorFn(row);
		}
		if (colDef.accessorKey) {
			return (row as Record<string, unknown>)[colDef.accessorKey];
		}
		return undefined;
	};
};

export function buildTanstackColumnDef<TData>(
	colDef: TableColumnDef<TData>,
	isRowActive?: (row: TData) => boolean,
	getRowKeyData?: (index: number) => RowKeyData | undefined,
): ColumnDef<TData> {
	const isFixed = colDef.width?.fixed != null;
	const headerFn =
		typeof colDef.header === 'function' ? colDef.header : undefined;

	return {
		id: colDef.id,
		header:
			typeof colDef.header === 'string'
				? colDef.header
				: (): ReactNode => headerFn?.() ?? null,
		accessorFn: buildAccessorFn(colDef),
		enableResizing: colDef.enableResize !== false && !isFixed,
		enableSorting: colDef.enableSort === true,
		cell: ({ row, getValue }): ReactNode => {
			const rowData = row.original;
			const keyData = getRowKeyData?.(row.index);
			return colDef.cell({
				row: rowData,
				value: getValue() as TData[any],
				isActive: isRowActive?.(rowData) ?? false,
				rowIndex: row.index,
				isExpanded: row.getIsExpanded(),
				canExpand: row.getCanExpand(),
				toggleExpanded: (): void => {
					row.toggleExpanded();
				},
				itemKey: keyData?.itemKey ?? '',
				groupMeta: keyData?.groupMeta,
			});
		},
	};
}
