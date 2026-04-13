import {
	CSSProperties,
	Dispatch,
	HTMLAttributes,
	ReactNode,
	SetStateAction,
} from 'react';
import type { TableVirtuosoHandle } from 'react-virtuoso';
import type {
	ColumnSizingState,
	Row as TanStackRowType,
} from '@tanstack/react-table';

export type SortState = { columnId: string; desc: boolean };

/** Sets `--tanstack-plain-cell-*` on the scroll root via CSS module classes (no data attributes). */
export type CellTypographySize = 'small' | 'medium' | 'large';

export type TableCellContext<TData> = {
	row: TData;
	value: unknown;
	isActive: boolean;
	rowIndex: number;
	isExpanded: boolean;
	canExpand: boolean;
	toggleExpanded: () => void;
};

export type TableColumnDef<TData> = {
	id: string;
	header: string | (() => ReactNode);
	cell: (context: TableCellContext<TData>) => ReactNode;
	accessorKey?: keyof TData & string;
	accessorFn?: (row: TData) => unknown;
	pin?: 'left' | 'right';
	enableMove?: boolean;
	enableResize?: boolean;
	enableRemove?: boolean;
	enableSort?: boolean;
	width?: {
		fixed?: number;
		min?: number;
		default?: number;
	};
};

export type FlatItem<TData> =
	| { kind: 'row'; row: TanStackRowType<TData> }
	| { kind: 'expansion'; row: TanStackRowType<TData> };

export type TableRowContext<TData> = {
	getRowStyle?: (row: TData) => CSSProperties;
	getRowClassName?: (row: TData) => string;
	isRowActive?: (row: TData) => boolean;
	renderRowActions?: (row: TData) => ReactNode;
	onRowClick?: (row: TData) => void;
	onRowDeactivate?: () => void;
	renderExpandedRow?: (row: TData) => ReactNode;
	colCount: number;
	isDarkMode?: boolean;
	/** When set, primitive cell output (string/number/boolean) is wrapped with typography + line-clamp (see `plainTextCellLineClamp` on the table). */
	plainTextCellLineClamp?: number;
};

export type PaginationProps = {
	total: number;
	defaultPage?: number;
	defaultLimit?: number;
};

export type TanStackTableProps<TData> = {
	data: TData[];
	columns: TableColumnDef<TData>[];
	columnSizing?: ColumnSizingState;
	onColumnSizingChange?: Dispatch<SetStateAction<ColumnSizingState>>;
	onColumnOrderChange?: (cols: TableColumnDef<TData>[]) => void;
	onRemoveColumn?: (id: string) => void;
	isLoading?: boolean;
	loadingTip?: string;
	enableQueryParams?: boolean | string;
	pagination?: PaginationProps;
	onEndReached?: (index: number) => void;
	getRowStyle?: (row: TData) => CSSProperties;
	getRowClassName?: (row: TData) => string;
	isRowActive?: (row: TData) => boolean;
	renderRowActions?: (row: TData) => ReactNode;
	onRowClick?: (row: TData) => void;
	onRowDeactivate?: () => void;
	activeRowIndex?: number;
	renderExpandedRow?: (row: TData) => ReactNode;
	getRowCanExpand?: (row: TData) => boolean;
	/**
	 * Primitive cell values use `--tanstack-plain-cell-*` from the scroll container when `cellTypographySize` is set.
	 */
	plainTextCellLineClamp?: number;
	/** Optional CSS-module typography tier for the scroll root (`--tanstack-plain-cell-font-size` / line-height + header `th`). */
	cellTypographySize?: CellTypographySize;
	/** Spread onto the Virtuoso scroll container. `data` is omitted — reserved by Virtuoso. */
	tableScrollerProps?: Omit<HTMLAttributes<HTMLDivElement>, 'data'>;
};

export type TanStackTableHandle = TableVirtuosoHandle & {
	goToPage: (page: number) => void;
};

export type TableColumnsState<TData> = {
	columns: TableColumnDef<TData>[];
	columnSizing: ColumnSizingState;
	onColumnSizingChange: Dispatch<SetStateAction<ColumnSizingState>>;
	onColumnOrderChange: (cols: TableColumnDef<TData>[]) => void;
	onRemoveColumn: (id: string) => void;
};
