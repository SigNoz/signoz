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

export type SortState = { columnName: string; order: 'asc' | 'desc' };

/** Sets `--tanstack-plain-cell-*` on the scroll root via CSS module classes (no data attributes). */
export type CellTypographySize = 'small' | 'medium' | 'large';

export type TableCellContext<TData, TValue> = {
	row: TData;
	value: TValue;
	isActive: boolean;
	rowIndex: number;
	isExpanded: boolean;
	canExpand: boolean;
	toggleExpanded: () => void;
	/** Business/selection key for the row */
	itemKey: string;
	/** Group metadata when row is part of a grouped view */
	groupMeta?: Record<string, string>;
};

export type RowKeyData = {
	/** Final unique key (with duplicate suffix if needed) */
	finalKey: string;
	/** Business/selection key */
	itemKey: string;
	/** Group metadata */
	groupMeta?: Record<string, string>;
};

export type TableColumnDef<
	TData,
	TKey extends keyof TData = any,
	TValue = TData[TKey],
> = {
	id: string;
	header: string | (() => ReactNode);
	cell: (context: TableCellContext<TData, TValue>) => ReactNode;
	accessorKey?: TKey;
	accessorFn?: (row: TData) => TValue;
	pin?: 'left' | 'right';
	enableMove?: boolean;
	enableResize?: boolean;
	enableRemove?: boolean;
	enableSort?: boolean;
	/** Default visibility when no persisted state exists. Default: true */
	defaultVisibility?: boolean;
	/** Whether user can hide this column. Default: true */
	canBeHidden?: boolean;
	/**
	 * Visibility behavior for grouped views:
	 * - 'hidden-on-expand': Hide when rows are expanded (grouped view)
	 * - 'hidden-on-collapse': Hide when rows are collapsed (ungrouped view)
	 * - 'always-visible': Always show regardless of grouping
	 * Default: 'always-visible'
	 */
	visibilityBehavior?:
		| 'hidden-on-expand'
		| 'hidden-on-collapse'
		| 'always-visible';
	width?: {
		fixed?: number | string;
		min?: number | string;
		default?: number | string;
		max?: number | string;
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
	onRowClick?: (row: TData, itemKey: string) => void;
	/** Called when ctrl+click or cmd+click on a row */
	onRowClickNewTab?: (row: TData, itemKey: string) => void;
	onRowDeactivate?: () => void;
	renderExpandedRow?: (
		row: TData,
		rowKey: string,
		groupMeta?: Record<string, string>,
	) => ReactNode;
	/** Get key data for a row by index */
	getRowKeyData?: (index: number) => RowKeyData | undefined;
	colCount: number;
	isDarkMode?: boolean;
	/** When set, primitive cell output (string/number/boolean) is wrapped with typography + line-clamp (see `plainTextCellLineClamp` on the table). */
	plainTextCellLineClamp?: number;
	/** Whether there's only one non-pinned column that can be removed */
	hasSingleColumn: boolean;
	/** Column order key for memo invalidation on reorder */
	columnOrderKey: string;
	/** Column visibility key for memo invalidation on visibility change */
	columnVisibilityKey: string;
	/** Enable alternating row background colors (zebra striping) */
	enableAlternatingRowColors?: boolean;
};

export type PaginationProps = {
	total: number;
	defaultPage?: number;
	defaultLimit?: number;
};

export type TanstackTableQueryParamsConfig = {
	page?: string;
	limit?: string;
	orderBy?: string;
	expanded?: string;
};

export type TanStackTableProps<TData> = {
	data: TData[];
	columns: TableColumnDef<TData>[];
	/** Storage key for column state persistence (visibility, sizing, ordering). When set, enables unified column management. */
	columnStorageKey?: string;
	columnSizing?: ColumnSizingState;
	onColumnSizingChange?: Dispatch<SetStateAction<ColumnSizingState>>;
	onColumnOrderChange?: (cols: TableColumnDef<TData>[]) => void;
	/** Called when a column is removed via the header menu. Use this to sync with external column preferences. */
	onColumnRemove?: (columnId: string) => void;
	isLoading?: boolean;
	/** Number of skeleton rows to show when loading with no data. Default: 10 */
	skeletonRowCount?: number;
	enableQueryParams?: boolean | string | TanstackTableQueryParamsConfig;
	pagination?: PaginationProps;
	paginationClassname?: string;
	onEndReached?: (index: number) => void;
	/** Function to get the unique key for a row (before duplicate handling).
	 * When set, enables automatic duplicate key detection and group-aware key composition. */
	getRowKey?: (row: TData) => string;
	/** Function to get the business/selection key. Defaults to getRowKey result. */
	getItemKey?: (row: TData) => string;
	/** When set, enables group-aware key generation (prefixes rowKey with group values). */
	groupBy?: Array<{ key: string }>;
	/** Extract group metadata from a row. Required when groupBy is set. */
	getGroupKey?: (row: TData) => Record<string, string>;
	getRowStyle?: (row: TData) => CSSProperties;
	getRowClassName?: (row: TData) => string;
	isRowActive?: (row: TData) => boolean;
	renderRowActions?: (row: TData) => ReactNode;
	onRowClick?: (row: TData, itemKey: string) => void;
	/** Called when ctrl+click or cmd+click on a row */
	onRowClickNewTab?: (row: TData, itemKey: string) => void;
	onRowDeactivate?: () => void;
	activeRowIndex?: number;
	renderExpandedRow?: (
		row: TData,
		rowKey: string,
		groupMeta?: Record<string, string>,
	) => ReactNode;
	getRowCanExpand?: (row: TData) => boolean;
	/**
	 * Primitive cell values use `--tanstack-plain-cell-*` from the scroll container when `cellTypographySize` is set.
	 */
	plainTextCellLineClamp?: number;
	/** Optional CSS-module typography tier for the scroll root (`--tanstack-plain-cell-font-size` / line-height + header `th`). */
	cellTypographySize?: CellTypographySize;
	/** Spread onto the Virtuoso scroll container. `data` is omitted — reserved by Virtuoso. */
	tableScrollerProps?: Omit<HTMLAttributes<HTMLDivElement>, 'data'>;
	className?: string;
	testId?: string;
	/** Content rendered before the pagination controls */
	prefixPaginationContent?: ReactNode;
	/** Content rendered after the pagination controls */
	suffixPaginationContent?: ReactNode;
	/** Enable alternating row background colors (zebra striping) */
	enableAlternatingRowColors?: boolean;
	/** Disable virtual scrolling and render all rows at once. Cannot be used with onEndReached. */
	disableVirtualScroll?: boolean;
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
