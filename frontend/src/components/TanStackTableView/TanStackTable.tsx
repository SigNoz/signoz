import type { ComponentProps, CSSProperties } from 'react';
import {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import { LoadingOutlined } from '@ant-design/icons';
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
import {
	ComboboxSimple,
	ComboboxSimpleItem,
	TooltipProvider,
} from '@signozhq/ui';
import { Pagination } from '@signozhq/ui';
import type { Row } from '@tanstack/react-table';
import {
	ColumnDef,
	ColumnPinningState,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Spin } from 'antd';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import TanStackCustomTableRow from './TanStackCustomTableRow';
import TanStackHeaderRow from './TanStackHeaderRow';
import {
	ColumnVisibilitySync,
	TableLoadingSync,
	TanStackTableStateProvider,
} from './TanStackTableStateContext';
import {
	FlatItem,
	TableRowContext,
	TanStackTableHandle,
	TanStackTableProps,
} from './types';
import { useTableParams } from './useTableParams';
import { buildTanstackColumnDef } from './utils';
import { VirtuosoTableColGroup } from './VirtuosoTableColGroup';

import tableStyles from './TanStackTable.module.scss';
import viewStyles from './TanStackTableView.module.scss';

const COLUMN_DND_AUTO_SCROLL = {
	layoutShiftCompensation: false as const,
	threshold: { x: 0.2, y: 0 },
};

const INCREASE_VIEWPORT_BY = { top: 500, bottom: 500 };

const noopColumnSizing = (): void => {};
const noopColumnVisibility = (): void => {};

const paginationPageSizeItems: ComboboxSimpleItem[] = [10, 20, 30, 50, 100].map(
	(value) => ({
		value: value.toString(),
		label: value.toString(),
		displayValue: value.toString(),
	}),
);

// eslint-disable-next-line sonarjs/cognitive-complexity
function TanStackTableInner<TData>(
	{
		data,
		columns,
		columnSizing: columnSizingProp,
		onColumnSizingChange,
		columnVisibility: columnVisibilityProp,
		onColumnVisibilityChange,
		onColumnOrderChange,
		onRemoveColumn,
		isLoading = false,
		skeletonRowCount = 10,
		enableQueryParams,
		pagination,
		onEndReached,
		getRowId: getRowIdProp,
		getRowKey,
		getItemKey,
		groupBy,
		getGroupKey,
		getRowStyle,
		getRowClassName,
		isRowActive,
		renderRowActions,
		onRowClick,
		onRowClickNewTab,
		onRowDeactivate,
		activeRowIndex,
		renderExpandedRow,
		getRowCanExpand,
		tableScrollerProps,
		plainTextCellLineClamp,
		cellTypographySize,
		className,
		testId,
		prefixPaginationContent,
		suffixPaginationContent,
	}: TanStackTableProps<TData>,
	forwardedRef: React.ForwardedRef<TanStackTableHandle>,
): JSX.Element {
	const virtuosoRef = useRef<TableVirtuosoHandle | null>(null);
	const isDarkMode = useIsDarkMode();

	const {
		page,
		limit,
		setPage,
		setLimit,
		orderBy,
		setOrderBy,
		expanded,
		setExpanded,
	} = useTableParams(enableQueryParams, {
		page: pagination?.defaultPage,
		limit: pagination?.defaultLimit,
	});

	// Track previous data for loading states
	const prevDataRef = useRef<TData[]>(data);
	const prevDataSizeRef = useRef(data.length || limit || skeletonRowCount);

	// Update refs when we have real data (not loading)
	if (!isLoading && data.length > 0) {
		prevDataRef.current = data;
		prevDataSizeRef.current = data.length;
	}

	// Effective data: use current data, previous data, or fake data for skeleton
	const effectiveData = useMemo((): TData[] => {
		// Have current data - use it
		if (data.length > 0) {
			return data;
		}
		// No current data but have previous data - use previous (avoids flash)
		if (prevDataRef.current.length > 0) {
			return prevDataRef.current;
		}
		// No data at all - create fake data for skeleton rows if loading
		if (isLoading) {
			const fakeCount = prevDataSizeRef.current || limit || skeletonRowCount;
			return Array.from({ length: fakeCount }, (_, i) => ({
				id: `skeleton-${i}`,
			})) as TData[];
		}
		// Not loading and no data - return empty
		return data;
	}, [isLoading, data, limit, skeletonRowCount]);

	// Compute key data for each row (handles duplicates, group prefixes)
	// Skip computation when loading - skeleton data doesn't have the required properties
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const rowKeyData = useMemo(() => {
		if (!getRowKey || isLoading) {
			return undefined;
		}

		const keyCount = new Map<string, number>();

		return effectiveData.map((item, index) => {
			const itemIdentifier = getRowKey(item);
			const itemKey = getItemKey?.(item) ?? itemIdentifier;
			const groupMeta = groupBy?.length ? getGroupKey?.(item) : undefined;

			// Build rowKey with group prefix when grouped
			let rowKey: string;
			if (groupBy?.length && groupMeta) {
				const groupKeyStr = Object.values(groupMeta).join('-');
				if (groupKeyStr && itemIdentifier) {
					rowKey = `${groupKeyStr}-${itemIdentifier}`;
				} else {
					rowKey = groupKeyStr || itemIdentifier || String(index);
				}
			} else {
				rowKey = itemIdentifier || String(index);
			}

			const count = keyCount.get(rowKey) || 0;
			keyCount.set(rowKey, count + 1);
			const finalKey = count > 0 ? `${rowKey}-${count}` : rowKey;

			return { finalKey, itemKey, groupMeta };
		});
	}, [effectiveData, getRowKey, getItemKey, groupBy, getGroupKey, isLoading]);

	const getRowKeyData = useCallback((index: number) => rowKeyData?.[index], [
		rowKeyData,
	]);

	const columnPinning = useMemo<ColumnPinningState>(
		() => ({
			left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
			right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
		}),
		[columns],
	);

	const tanstackColumns = useMemo<ColumnDef<TData>[]>(
		() =>
			columns.map((colDef) =>
				buildTanstackColumnDef(colDef, isRowActive, getRowKeyData),
			),
		[columns, isRowActive, getRowKeyData],
	);

	const getRowId = useCallback(
		(row: TData, index: number): string => {
			// Use rowKeyData if available (new API)
			if (rowKeyData) {
				return rowKeyData[index]?.finalKey ?? String(index);
			}
			// Legacy: use getRowIdProp
			if (getRowIdProp) {
				return getRowIdProp(row, index);
			}
			const r = row as Record<string, unknown>;
			if (r != null && typeof r.id !== 'undefined') {
				return String(r.id);
			}
			return String(index);
		},
		[rowKeyData, getRowIdProp],
	);

	const tableGetRowCanExpand = useCallback(
		(row: Row<TData>): boolean =>
			getRowCanExpand ? getRowCanExpand(row.original) : true,
		[getRowCanExpand],
	);

	const table = useReactTable({
		data: effectiveData,
		columns: tanstackColumns,
		enableColumnResizing: true,
		enableColumnPinning: true,
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
		getRowId,
		enableExpanding: Boolean(renderExpandedRow),
		getRowCanExpand: renderExpandedRow ? tableGetRowCanExpand : undefined,
		onColumnSizingChange: onColumnSizingChange ?? noopColumnSizing,
		onColumnVisibilityChange: onColumnVisibilityChange ?? noopColumnVisibility,
		onExpandedChange: setExpanded,
		state: {
			columnSizing: columnSizingProp ?? {},
			columnVisibility: columnVisibilityProp ?? {},
			columnPinning,
			expanded,
		},
	});

	// Keep refs to avoid recreating virtuosoComponents on every resize/render
	const tableRef = useRef(table);
	tableRef.current = table;
	const columnsRef = useRef(columns);
	columnsRef.current = columns;

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
		// expanded needs to be here, otherwise the rows are not updated when you click to expand
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tableRows, renderExpandedRow, expanded]);

	// keep previous count just to avoid flashing the pagination component
	const prevTotalCountRef = useRef(pagination?.total || 0);
	if (pagination?.total && pagination?.total > 0) {
		prevTotalCountRef.current = pagination?.total;
	}
	const effectiveTotalCount = !isLoading
		? pagination?.total || 0
		: prevTotalCountRef.current;

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
		[tanstackColumns, columnPinning, columnVisibilityProp],
	);

	const columnsById = useMemo(
		() => new Map(columns.map((c) => [c.id, c] as const)),
		[columns],
	);

	const visibleColumnsCount = table.getVisibleFlatColumns().length;

	const columnOrderKey = useMemo(() => columnIds.join(','), [columnIds]);
	const columnVisibilityKey = useMemo(
		() =>
			table
				.getVisibleFlatColumns()
				.map((c) => c.id)
				.join(','),
		// we want to explicitly have table out of this deps
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[columnVisibilityProp, columnIds],
	);

	const virtuosoContext = useMemo<TableRowContext<TData>>(
		() => ({
			getRowStyle,
			getRowClassName,
			isRowActive,
			renderRowActions,
			onRowClick,
			onRowClickNewTab,
			onRowDeactivate,
			renderExpandedRow,
			getRowKeyData,
			colCount: visibleColumnsCount,
			isDarkMode,
			plainTextCellLineClamp,
			hasSingleColumn,
			columnOrderKey,
			columnVisibilityKey,
		}),
		[
			getRowStyle,
			getRowClassName,
			isRowActive,
			renderRowActions,
			onRowClick,
			onRowClickNewTab,
			onRowDeactivate,
			renderExpandedRow,
			getRowKeyData,
			visibleColumnsCount,
			isDarkMode,
			plainTextCellLineClamp,
			hasSingleColumn,
			columnOrderKey,
			columnVisibilityKey,
		],
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
									orderBy={orderBy}
									onSort={setOrderBy}
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
		orderBy,
		setOrderBy,
	]);

	const handleEndReached = useCallback(
		(index: number): void => {
			onEndReached?.(index);
		},
		[onEndReached],
	);

	// Show loading spinner at the bottom for infinite scroll mode
	const isInfiniteScrollMode = Boolean(onEndReached);
	const showInfiniteScrollLoader = isInfiniteScrollMode && isLoading;

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

	// Use refs in virtuosoComponents to keep the component reference stable during resize
	// This prevents Virtuoso from re-rendering all rows when columns are resized
	const virtuosoComponents = useMemo(
		() => ({
			Table: ({ style, children }: VirtuosoTableComponentProps): JSX.Element => (
				<table className={tableStyles.tanStackTable} style={style}>
					<VirtuosoTableColGroup
						columns={columnsRef.current}
						table={tableRef.current}
					/>
					{children}
				</table>
			),
			TableRow: TanStackCustomTableRow,
		}),
		[],
	);

	return (
		<div className={cx(viewStyles.tanstackTableViewWrapper, className)}>
			<TanStackTableStateProvider>
				<TableLoadingSync
					isLoading={isLoading}
					isInfiniteScrollMode={isInfiniteScrollMode}
				/>
				<ColumnVisibilitySync visibility={columnVisibilityProp ?? {}} />
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
						style={virtuosoTableStyle}
						components={virtuosoComponents}
						endReached={onEndReached ? handleEndReached : undefined}
						data-testid={testId}
					/>
					{showInfiniteScrollLoader && (
						<div
							className={viewStyles.tanstackLoadingOverlay}
							data-testid="tanstack-infinite-loader"
						>
							<Spin indicator={<LoadingOutlined spin />} tip="Loading more..." />
						</div>
					)}
					{showPagination && pagination && (
						<div className={viewStyles.paginationContainer}>
							{prefixPaginationContent}
							<Pagination
								current={page}
								pageSize={limit}
								total={effectiveTotalCount}
								onPageChange={(p): void => {
									setPage(p);
								}}
							/>
							<div className={viewStyles.paginationPageSize}>
								<ComboboxSimple
									value={limit?.toString()}
									defaultValue="10"
									onChange={(value): void => setLimit(+value)}
									items={paginationPageSizeItems}
								/>
							</div>
							{suffixPaginationContent}
						</div>
					)}
				</TooltipProvider>
			</TanStackTableStateProvider>
		</div>
	);
}

const TanStackTableForward = forwardRef(TanStackTableInner) as <TData>(
	props: TanStackTableProps<TData> & {
		ref?: React.Ref<TanStackTableHandle>;
	},
) => JSX.Element;

export const TanStackTableBase = memo(
	TanStackTableForward,
) as typeof TanStackTableForward;
