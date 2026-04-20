import type { CSSProperties, ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { RowKeyData, TableColumnDef } from './types';

export const getColumnId = <TData>(column: TableColumnDef<TData>): string =>
	column.id;

const DEFAULT_MIN_WIDTH = 192; // 12rem * 16px

/**
 * Parse a numeric pixel value from a number or string (e.g., 200 or "200px").
 * Returns undefined for non-pixel strings like "100%" or "10rem".
 */
const parsePixelValue = (
	value: number | string | undefined,
): number | undefined => {
	if (value == null) {
		return undefined;
	}
	if (typeof value === 'number') {
		return value;
	}
	// Only parse pixel values, ignore %, rem, em, etc.
	const match = /^(\d+(?:\.\d+)?)px$/.exec(value);
	return match ? parseFloat(match[1]) : undefined;
};

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
	if (width.fixed != null) {
		return {
			width: width.fixed,
			minWidth: width.fixed,
			maxWidth: width.fixed,
		};
	}
	return {
		width: persistedWidth ?? width.default ?? width.min,
		minWidth: width.min ?? DEFAULT_MIN_WIDTH,
		maxWidth: width.max,
	};
};

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

	// Extract numeric size/minSize/maxSize for TanStack's resize behavior
	// This ensures TanStack's internal resize state stays in sync with CSS constraints
	let size: number | undefined;
	let minSize: number | undefined;
	let maxSize: number | undefined;

	const fixedWidth = parsePixelValue(colDef.width?.fixed);
	if (isFixed && fixedWidth != null) {
		size = fixedWidth;
		minSize = fixedWidth;
		maxSize = fixedWidth;
	} else {
		// Match the logic in getColumnWidthStyle for initial size
		const defaultSize = parsePixelValue(colDef.width?.default);
		const minWidth = parsePixelValue(colDef.width?.min) ?? DEFAULT_MIN_WIDTH;
		size = defaultSize ?? minWidth;
		minSize = minWidth;
		maxSize = parsePixelValue(colDef.width?.max);
	}

	return {
		id: colDef.id,
		size,
		minSize,
		maxSize,
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
