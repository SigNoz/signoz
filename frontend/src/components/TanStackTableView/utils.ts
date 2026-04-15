import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { RowKeyData, TableColumnDef } from './types';

export const getColumnId = <TData>(column: TableColumnDef<TData>): string =>
	column.id;

const REM_PX = 16;
const MIN_WIDTH_DEFAULT_REM = 12;

export const getColumnMinWidthPx = <TData>(
	column: TableColumnDef<TData>,
): number => {
	if (column.width?.fixed != null) {
		return column.width.fixed;
	}
	if (column.width?.min != null) {
		return column.width.min;
	}
	return MIN_WIDTH_DEFAULT_REM * REM_PX;
};

/**
 * Get the initial column size from a column definition.
 * Matches the logic used by TanStack Table's size property.
 */
export const getColumnInitialSize = <TData>(
	column: TableColumnDef<TData>,
): number => {
	const minWidthPx = getColumnMinWidthPx(column);
	if (column.width?.fixed != null) {
		return column.width.fixed;
	}
	return column.width?.default ?? column.width?.min ?? minWidthPx;
};

/**
 * Get the max width for a column, if any.
 */
export const getColumnMaxWidth = <TData>(
	column: TableColumnDef<TData>,
): number | undefined => {
	if (column.width?.fixed != null) {
		return column.width.fixed;
	}
	return column.width?.max;
};

export function buildTanstackColumnDef<TData>(
	colDef: TableColumnDef<TData>,
	isRowActive?: (row: TData) => boolean,
	getRowKeyData?: (index: number) => RowKeyData | undefined,
): ColumnDef<TData> {
	const isFixed = colDef.width?.fixed != null;
	const fixedWidth = colDef.width?.fixed;
	const minWidthPx = getColumnMinWidthPx(colDef);
	return {
		id: colDef.id,
		header:
			typeof colDef.header === 'string'
				? colDef.header
				: (): ReactNode =>
						typeof colDef.header === 'function' ? colDef.header() : null,
		accessorFn: (row: TData): unknown => {
			if (colDef.accessorFn) {
				return colDef.accessorFn(row);
			}
			if (colDef.accessorKey) {
				return (row as Record<string, unknown>)[colDef.accessorKey];
			}
			return undefined;
		},
		enableResizing: colDef.enableResize !== false && !isFixed,
		enableSorting: colDef.enableSort === true,
		// TanStack Table uses these to compute column.getSize()
		minSize: fixedWidth ?? minWidthPx,
		size: fixedWidth ?? colDef.width?.default ?? colDef.width?.min ?? minWidthPx,
		maxSize: fixedWidth ?? colDef.width?.max,
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
