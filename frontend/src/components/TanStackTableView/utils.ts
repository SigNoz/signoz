import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { TableColumnDef } from './types';

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

export function buildTanstackColumnDef<TData>(
	colDef: TableColumnDef<TData>,
	isRowActive?: (row: TData) => boolean,
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
		minSize: fixedWidth ?? minWidthPx,
		size: colDef.width?.default ?? fixedWidth,
		maxSize: fixedWidth,
		cell: ({ row, getValue }): ReactNode => {
			const rowData = row.original;
			return colDef.cell({
				row: rowData,
				value: getValue(),
				isActive: isRowActive?.(rowData) ?? false,
				rowIndex: row.index,
				isExpanded: row.getIsExpanded(),
				canExpand: row.getCanExpand(),
				toggleExpanded: (): void => {
					row.toggleExpanded();
				},
			});
		},
	};
}
