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
import { DndContext, pointerWithin } from '@dnd-kit/core';
import {
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
import { useColumnDnd } from './useColumnDnd';
import { useColumnHandlers } from './useColumnHandlers';
import { useColumnState } from './useColumnState';
import { useEffectiveData } from './useEffectiveData';
import { useFlatItems } from './useFlatItems';
import { useRowKeyData } from './useRowKeyData';
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
		columnStorageKey,
		columnSizing: columnSizingProp,
		onColumnSizingChange,
		onColumnOrderChange,
		onColumnRemove,
		isLoading = false,
		skeletonRowCount = 10,
		enableQueryParams,
		pagination,
		paginationClassname,
		onEndReached,
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
		enableAlternatingRowColors,
		disableVirtualScroll,
	}: TanStackTableProps<TData>,
	forwardedRef: React.ForwardedRef<TanStackTableHandle>,
): JSX.Element {
	if (disableVirtualScroll && onEndReached) {
		throw new Error(
			'TanStackTable: Cannot use onEndReached with disableVirtualScroll. Infinite scroll requires virtualization.',
		);
	}

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

	const isGrouped = (groupBy?.length ?? 0) > 0;

	const {
		columnVisibility: storeVisibility,
		columnSizing: storeSizing,
		sortedColumns,
		hideColumn,
		setColumnSizing: storeSetSizing,
		setColumnOrder: storeSetOrder,
	} = useColumnState({
		storageKey: columnStorageKey,
		columns,
		isGrouped,
	});

	// Use store values when columnStorageKey is provided, otherwise fall back to props/defaults
	const effectiveColumns = columnStorageKey ? sortedColumns : columns;
	const effectiveVisibility = columnStorageKey ? storeVisibility : {};
	const effectiveSizing = columnStorageKey
		? storeSizing
		: (columnSizingProp ?? {});

	const effectiveData = useEffectiveData<TData>({
		data,
		isLoading,
		limit,
		skeletonRowCount,
	});

	const { rowKeyData, getRowKeyData } = useRowKeyData({
		data: effectiveData,
		isLoading,
		getRowKey,
		getItemKey,
		groupBy,
		getGroupKey,
	});

	const {
		handleColumnSizingChange,
		handleColumnOrderChange,
		handleRemoveColumn,
	} = useColumnHandlers({
		columnStorageKey,
		effectiveSizing,
		storeSetSizing,
		storeSetOrder,
		hideColumn,
		onColumnSizingChange,
		onColumnOrderChange,
		onColumnRemove,
	});

	const columnPinning = useMemo<ColumnPinningState>(
		() => ({
			left: effectiveColumns.filter((c) => c.pin === 'left').map((c) => c.id),
			right: effectiveColumns.filter((c) => c.pin === 'right').map((c) => c.id),
		}),
		[effectiveColumns],
	);

	const tanstackColumns = useMemo<ColumnDef<TData>[]>(
		() =>
			effectiveColumns.map((colDef) =>
				buildTanstackColumnDef(colDef, isRowActive, getRowKeyData),
			),
		[effectiveColumns, isRowActive, getRowKeyData],
	);

	const getRowId = useCallback(
		(row: TData, index: number): string => {
			if (rowKeyData) {
				return rowKeyData[index]?.finalKey ?? String(index);
			}
			const r = row as Record<string, unknown>;
			if (r != null && typeof r.id !== 'undefined') {
				return String(r.id);
			}
			return String(index);
		},
		[rowKeyData],
	);

	const tableGetRowCanExpand = useCallback(
		(row: Row<TData>): boolean =>
			getRowCanExpand ? getRowCanExpand(row.original) : true,
		[getRowCanExpand],
	);

	const isExpandEnabled = Boolean(renderExpandedRow);
	useEffect(() => {
		const hasExpanded =
			typeof expanded === 'boolean' ? expanded : Object.keys(expanded).length > 0;
		if (!isExpandEnabled && hasExpanded) {
			setExpanded({});
		}
	}, [isExpandEnabled, expanded, setExpanded]);

	const table = useReactTable({
		data: effectiveData,
		columns: tanstackColumns,
		enableColumnResizing: true,
		enableColumnPinning: true,
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
		getRowId,
		enableExpanding: isExpandEnabled,
		getRowCanExpand: renderExpandedRow ? tableGetRowCanExpand : undefined,
		onColumnSizingChange: handleColumnSizingChange,
		onColumnVisibilityChange: noopColumnVisibility,
		onExpandedChange: setExpanded,
		state: {
			columnSizing: effectiveSizing,
			columnVisibility: effectiveVisibility,
			columnPinning,
			expanded,
		},
	});

	// Keep refs to avoid recreating virtuosoComponents on every resize/render
	const tableRef = useRef(table);
	tableRef.current = table;
	const columnsRef = useRef(effectiveColumns);
	columnsRef.current = effectiveColumns;

	const tableRows = table.getRowModel().rows;

	const { flatItems, flatIndexForActiveRow } = useFlatItems({
		tableRows,
		renderExpandedRow,
		expanded,
		activeRowIndex,
	});

	// keep previous count just to avoid flashing the pagination component
	const prevTotalCountRef = useRef(pagination?.total || 0);
	if (pagination?.total && pagination?.total > 0) {
		prevTotalCountRef.current = pagination?.total;
	}
	const effectiveTotalCount = !isLoading
		? pagination?.total || 0
		: prevTotalCountRef.current;

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

	const { sensors, columnIds, handleDragEnd } = useColumnDnd({
		columns: effectiveColumns,
		onColumnOrderChange: handleColumnOrderChange,
	});

	const hasSingleColumn = useMemo(
		() =>
			effectiveColumns.filter((c) => !c.pin && c.enableRemove !== false).length <=
			1,
		[effectiveColumns],
	);

	const canRemoveColumn = !hasSingleColumn;

	const flatHeaders = useMemo(
		() => table.getFlatHeaders().filter((header) => !header.isPlaceholder),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tanstackColumns, columnPinning, effectiveVisibility],
	);

	const columnsById = useMemo(
		() => new Map(effectiveColumns.map((c) => [c.id, c] as const)),
		[effectiveColumns],
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
		[effectiveVisibility, columnIds],
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
			enableAlternatingRowColors,
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
			enableAlternatingRowColors,
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
						{flatHeaders.map((header, index) => {
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
									onRemoveColumn={handleRemoveColumn}
									canRemoveColumn={canRemoveColumn}
									orderBy={orderBy}
									onSort={setOrderBy}
									isLastColumn={index === flatHeaders.length - 1}
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
		handleRemoveColumn,
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
						const v = virtuosoRef.current as unknown as Record<string, unknown>;
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
			}) as CSSProperties,
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
		<div
			className={cx(viewStyles.tanstackTableViewWrapper, className)}
			data-has-group-by={(groupBy?.length || 0) > 0}
		>
			<TanStackTableStateProvider>
				<TableLoadingSync
					isLoading={isLoading}
					isInfiniteScrollMode={isInfiniteScrollMode}
				/>
				<ColumnVisibilitySync visibility={effectiveVisibility} />
				<TooltipProvider>
					{disableVirtualScroll ? (
						<div
							className={virtuosoClassName}
							{...restTableScrollerProps}
							data-testid={testId}
						>
							<table className={tableStyles.tanStackTable} style={virtuosoTableStyle}>
								<VirtuosoTableColGroup columns={effectiveColumns} table={table} />
								<thead>{tableHeader()}</thead>
								<tbody>
									{(isLoading && data.length === 0
										? flatItems.slice(0, skeletonRowCount)
										: flatItems
									).map((item, index) => (
										<TanStackCustomTableRow
											key={
												item.kind === 'expansion' ? `${item.row.id}-expansion` : item.row.id
											}
											item={item}
											context={virtuosoContext}
											data-index={index}
											data-item-index={index}
											data-known-size={0}
										/>
									))}
								</tbody>
							</table>
						</div>
					) : (
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
					)}
					{showInfiniteScrollLoader && (
						<div
							className={viewStyles.tanstackLoadingOverlay}
							data-testid="tanstack-infinite-loader"
						>
							<Spin indicator={<LoadingOutlined spin />} tip="Loading more..." />
						</div>
					)}
					{showPagination && pagination && (
						<div className={cx(viewStyles.paginationContainer, paginationClassname)}>
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
