import type { ComponentProps, CSSProperties, Ref } from 'react';
import {
	forwardRef,
	memo,
	ReactNode,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
} from '@dnd-kit/sortable';
import { TooltipProvider } from '@signozhq/ui';
import type { Row, Table } from '@tanstack/react-table';
import {
	ColumnDef,
	ColumnPinningState,
	ExpandedState,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Pagination } from 'antd';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import Spinner from '../Spinner';
import { RowHoverProvider } from './RowHoverContext';
import TanStackCustomTableRow from './TanStackCustomTableRow';
import TanStackHeaderRow from './TanStackHeaderRow';
import TanStackRowCells from './TanStackRow';
import TanStackTableText from './TanStackTableText';
import {
	FlatItem,
	TableColumnDef,
	TableRowContext,
	TanStackTableHandle,
	TanStackTableProps,
} from './types';
import { useTableParams } from './useTableParams';
import { getColumnMinWidthPx } from './utils';

import tableStyles from './TanStackTable.module.scss';
import viewStyles from './TanStackTableView.module.scss';

const COLUMN_DND_AUTO_SCROLL = {
	layoutShiftCompensation: false as const,
	threshold: { x: 0.2, y: 0 },
};

const INCREASE_VIEWPORT_BY = { top: 500, bottom: 500 };

const PAGINATION_STYLE: CSSProperties = { marginTop: 12, textAlign: 'right' };

const noopColumnSizing = (): void => {};

function VirtuosoTableColGroup<TData>({
	columns,
	columnSizingProp,
	table,
}: {
	columns: TableColumnDef<TData>[];
	columnSizingProp: TanStackTableProps<TData>['columnSizing'];
	table: Table<TData>;
}): JSX.Element {
	return (
		<colgroup>
			{columns.map((column, colIndex) => {
				const columnId = column.id;
				const isFixedColumn = column.width?.fixed != null;
				const minWidthPx = getColumnMinWidthPx(column);
				const persistedWidth = columnSizingProp?.[columnId];
				const computedWidth = table.getColumn(columnId)?.getSize();
				const effectiveWidth = persistedWidth ?? computedWidth;
				if (isFixedColumn) {
					return <col key={columnId} className={viewStyles.tanstackFixedCol} />;
				}
				const isLastColumn = colIndex === columns.length - 1;
				if (isLastColumn) {
					return (
						<col
							key={columnId}
							style={{ width: '100%', minWidth: `${minWidthPx}px` }}
						/>
					);
				}
				const widthPx =
					effectiveWidth != null ? Math.max(effectiveWidth, minWidthPx) : minWidthPx;
				return (
					<col
						key={columnId}
						style={{
							width: `${widthPx}px`,
							minWidth: `${minWidthPx}px`,
						}}
					/>
				);
			})}
		</colgroup>
	);
}

function buildTanstackColumnDef<TData>(
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

function TanStackTableInner<TData>(
	{
		data,
		columns,
		columnSizing: columnSizingProp,
		onColumnSizingChange,
		onColumnOrderChange,
		onRemoveColumn,
		isLoading = false,
		loadingTip = 'Loading',
		enableQueryParams,
		pagination,
		onEndReached,
		getRowStyle,
		getRowClassName,
		isRowActive,
		renderRowActions,
		onRowClick,
		onRowDeactivate,
		activeRowIndex,
		renderExpandedRow,
		getRowCanExpand,
		tableScrollerProps,
		plainTextCellLineClamp,
		cellTypographySize,
	}: TanStackTableProps<TData>,
	forwardedRef: React.ForwardedRef<TanStackTableHandle>,
): JSX.Element {
	const virtuosoRef = useRef<TableVirtuosoHandle | null>(null);
	const isDarkMode = useIsDarkMode();

	const { page, limit, setPage, setLimit } = useTableParams(enableQueryParams, {
		page: pagination?.defaultPage,
		limit: pagination?.defaultLimit,
	});

	const [expanded, setExpanded] = useState<ExpandedState>({});

	const columnPinning = useMemo<ColumnPinningState>(
		() => ({
			left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
			right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
		}),
		[columns],
	);

	const tanstackColumns = useMemo<ColumnDef<TData>[]>(
		() => columns.map((colDef) => buildTanstackColumnDef(colDef, isRowActive)),
		[columns, isRowActive],
	);

	const getRowId = useCallback((row: TData, index: number): string => {
		const r = row as Record<string, unknown>;
		if (r != null && typeof r.id !== 'undefined') {
			return String(r.id);
		}
		return String(index);
	}, []);

	const tableGetRowCanExpand = useCallback(
		(row: Row<TData>): boolean =>
			getRowCanExpand ? getRowCanExpand(row.original) : true,
		[getRowCanExpand],
	);

	const table = useReactTable({
		data,
		columns: tanstackColumns,
		enableColumnResizing: true,
		enableColumnPinning: true,
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
		getRowId,
		enableExpanding: Boolean(renderExpandedRow),
		getRowCanExpand: renderExpandedRow ? tableGetRowCanExpand : undefined,
		onColumnSizingChange: onColumnSizingChange ?? noopColumnSizing,
		onExpandedChange: setExpanded,
		state: {
			columnSizing: columnSizingProp ?? {},
			columnPinning,
			expanded,
		},
	});

	const tableRows = table.getRowModel().rows;

	const flatItems = useMemo<FlatItem<TData>[]>(() => {
		const result: FlatItem<TData>[] = [];
		for (const row of tableRows) {
			result.push({ kind: 'row', row });
			if (renderExpandedRow && row.getIsExpanded()) {
				result.push({ kind: 'expansion', row });
			}
		}
		return result;
	}, [tableRows, renderExpandedRow]);

	const flatIndexForActiveRow = useMemo(() => {
		if (activeRowIndex == null || activeRowIndex < 0) {
			return -1;
		}
		for (let i = 0; i < flatItems.length; i++) {
			const item = flatItems[i];
			if (item.kind === 'row' && item.row.index === activeRowIndex) {
				return i;
			}
		}
		return -1;
	}, [activeRowIndex, flatItems]);

	useEffect(() => {
		if (flatIndexForActiveRow < 0) {
			return;
		}
		virtuosoRef.current?.scrollToIndex({
			index: flatIndexForActiveRow,
			align: 'center',
			behavior: 'auto',
		});
	}, [flatIndexForActiveRow]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): void => {
			const { active, over } = event;
			if (!over || active.id === over.id || !onColumnOrderChange) {
				return;
			}
			const activeCol = columns.find((c) => c.id === String(active.id));
			const overCol = columns.find((c) => c.id === String(over.id));
			if (
				!activeCol ||
				!overCol ||
				activeCol.pin != null ||
				overCol.pin != null ||
				activeCol.enableMove === false
			) {
				return;
			}
			const oldIndex = columns.findIndex((c) => c.id === String(active.id));
			const newIndex = columns.findIndex((c) => c.id === String(over.id));
			if (oldIndex === -1 || newIndex === -1) {
				return;
			}
			onColumnOrderChange(arrayMove(columns, oldIndex, newIndex));
		},
		[columns, onColumnOrderChange],
	);

	const hasSingleColumn = useMemo(
		() => columns.filter((c) => !c.pin && c.enableRemove !== false).length <= 1,
		[columns],
	);

	const canRemoveColumn = !hasSingleColumn;

	const flatHeaders = useMemo(
		() => table.getFlatHeaders().filter((header) => !header.isPlaceholder),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tanstackColumns, columnPinning],
	);

	const columnsById = useMemo(
		() => new Map(columns.map((c) => [c.id, c] as const)),
		[columns],
	);

	const virtuosoContext = useMemo<TableRowContext<TData>>(
		() => ({
			getRowStyle,
			getRowClassName,
			isRowActive,
			renderRowActions,
			onRowClick,
			onRowDeactivate,
			renderExpandedRow,
			colCount: columns.length,
			isDarkMode,
			plainTextCellLineClamp,
		}),
		[
			getRowStyle,
			getRowClassName,
			isRowActive,
			renderRowActions,
			onRowClick,
			onRowDeactivate,
			renderExpandedRow,
			columns.length,
			isDarkMode,
			plainTextCellLineClamp,
		],
	);

	const itemContent = useCallback(
		(_index: number, item: FlatItem<TData>): JSX.Element => (
			<TanStackRowCells
				row={item.row}
				itemKind={item.kind}
				context={virtuosoContext}
				hasSingleColumn={hasSingleColumn}
			/>
		),
		[virtuosoContext, hasSingleColumn],
	);

	const tableHeader = useCallback(() => {
		return (
			<DndContext
				sensors={sensors}
				collisionDetection={pointerWithin}
				onDragEnd={handleDragEnd}
				autoScroll={COLUMN_DND_AUTO_SCROLL}
			>
				<SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
					<tr>
						{flatHeaders.map((header) => {
							const column = columnsById.get(header.id);
							if (!column) {
								return null;
							}
							return (
								<TanStackHeaderRow
									key={header.id}
									column={column}
									header={header}
									isDarkMode={isDarkMode}
									hasSingleColumn={hasSingleColumn}
									onRemoveColumn={onRemoveColumn}
									canRemoveColumn={canRemoveColumn}
								/>
							);
						})}
					</tr>
				</SortableContext>
			</DndContext>
		);
	}, [
		sensors,
		handleDragEnd,
		columnIds,
		flatHeaders,
		columnsById,
		isDarkMode,
		hasSingleColumn,
		onRemoveColumn,
		canRemoveColumn,
	]);

	const handleEndReached = useCallback(
		(index: number): void => {
			onEndReached?.(index);
		},
		[onEndReached],
	);

	useImperativeHandle(
		forwardedRef,
		(): TanStackTableHandle =>
			new Proxy(
				{
					goToPage: (p: number): void => {
						setPage(p);
						virtuosoRef.current?.scrollToIndex({
							index: 0,
							align: 'start',
						});
					},
				} as TanStackTableHandle,
				{
					get(target, prop): unknown {
						if (prop in target) {
							return Reflect.get(target, prop);
						}
						const v = (virtuosoRef.current as unknown) as Record<string, unknown>;
						const value = v?.[prop as string];
						if (typeof value === 'function') {
							return (value as (...a: unknown[]) => unknown).bind(virtuosoRef.current);
						}
						return value;
					},
				},
			),
		[setPage],
	);

	const showPagination = Boolean(pagination && !onEndReached);

	const { className: tableScrollerClassName, ...restTableScrollerProps } =
		tableScrollerProps ?? {};

	const cellTypographyClass = useMemo((): string | undefined => {
		if (cellTypographySize === 'small') {
			return viewStyles.cellTypographySmall;
		}
		if (cellTypographySize === 'medium') {
			return viewStyles.cellTypographyMedium;
		}
		if (cellTypographySize === 'large') {
			return viewStyles.cellTypographyLarge;
		}
		return undefined;
	}, [cellTypographySize]);

	const virtuosoClassName = useMemo(
		() =>
			cx(
				viewStyles.tanstackTableVirtuosoScroll,
				cellTypographyClass,
				tableScrollerClassName,
			),
		[cellTypographyClass, tableScrollerClassName],
	);

	const virtuosoTableStyle = useMemo(
		() =>
			({
				'--tanstack-plain-body-line-clamp': plainTextCellLineClamp,
			} as CSSProperties),
		[plainTextCellLineClamp],
	);

	type VirtuosoTableComponentProps = ComponentProps<
		NonNullable<TableComponents<FlatItem<TData>, TableRowContext<TData>>['Table']>
	>;

	const virtuosoComponents = useMemo(
		() => ({
			Table: ({ style, children }: VirtuosoTableComponentProps): JSX.Element => (
				<table className={tableStyles.tanStackTable} style={style}>
					<VirtuosoTableColGroup
						columns={columns}
						columnSizingProp={columnSizingProp}
						table={table}
					/>
					{children}
				</table>
			),
			TableRow: TanStackCustomTableRow,
		}),
		[columns, columnSizingProp, table],
	);

	return (
		<div className={viewStyles.tanstackTableViewWrapper}>
			<RowHoverProvider>
				<TooltipProvider>
					<TableVirtuoso<FlatItem<TData>, TableRowContext<TData>>
						className={virtuosoClassName}
						ref={virtuosoRef}
						{...restTableScrollerProps}
						data={flatItems}
						totalCount={flatItems.length}
						context={virtuosoContext}
						increaseViewportBy={INCREASE_VIEWPORT_BY}
						initialTopMostItemIndex={
							flatIndexForActiveRow >= 0 ? flatIndexForActiveRow : 0
						}
						fixedHeaderContent={tableHeader}
						itemContent={itemContent}
						style={virtuosoTableStyle}
						components={virtuosoComponents}
						endReached={onEndReached ? handleEndReached : undefined}
					/>
					{isLoading && (
						<div className={viewStyles.tanstackLoadingOverlay}>
							<Spinner height="35px" tip={loadingTip} />
						</div>
					)}
					{showPagination && pagination && (
						<Pagination
							style={PAGINATION_STYLE}
							current={page}
							pageSize={limit}
							total={pagination.total}
							showSizeChanger
							onChange={(p, ps): void => {
								setPage(p);
								if (ps != null && ps !== limit) {
									setLimit(ps);
								}
							}}
						/>
					)}
				</TooltipProvider>
			</RowHoverProvider>
		</div>
	);
}

const TanStackTableForward = forwardRef(TanStackTableInner) as <TData>(
	props: TanStackTableProps<TData> & {
		ref?: React.Ref<TanStackTableHandle>;
	},
) => JSX.Element;

const TanStackTableBase = memo(
	TanStackTableForward,
) as typeof TanStackTableForward;

const TanStackTable = Object.assign(TanStackTableBase, {
	Text: TanStackTableText,
});

export default TanStackTable;
