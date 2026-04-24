import {
	forwardRef,
	memo,
	MouseEvent as ReactMouseEvent,
	ReactElement,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import {
	horizontalListSortingStrategy,
	SortableContext,
} from '@dnd-kit/sortable';
import { toast } from '@signozhq/ui';
import {
	ColumnDef,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { useTableView } from 'components/Logs/TableView/useTableView';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDragColumns from 'hooks/useDragColumns';
import { getAbsoluteUrl } from 'utils/basePath';

import { infinityDefaultStyles } from '../InfinityTableView/config';
import { TanStackTableStyled } from '../InfinityTableView/styles';
import { InfinityTableProps } from '../InfinityTableView/types';
import TanStackCustomTableRow from './TanStackCustomTableRow';
import TanStackHeaderRow from './TanStackHeaderRow';
import TanStackRowCells from './TanStackRow';
import { TableRecord, TanStackTableRowData } from './types';
import { useColumnSizingPersistence } from './useColumnSizingPersistence';
import { useOrderedColumns } from './useOrderedColumns';
import {
	getColumnId,
	getColumnMinWidthPx,
	resolveColumnTypeRender,
} from './utils';

import '../logsTableVirtuosoScrollbar.scss';
import './styles/TanStackTableView.styles.scss';

const COLUMN_DND_AUTO_SCROLL = {
	layoutShiftCompensation: false as const,
	threshold: { x: 0.2, y: 0 },
};

const TanStackTableView = forwardRef<TableVirtuosoHandle, InfinityTableProps>(
	function TanStackTableView(
		{
			isLoading,
			isFetching,
			onRemoveColumn,
			tableViewProps,
			infitiyTableProps,
			onSetActiveLog,
			onClearActiveLog,
			activeLog,
		}: InfinityTableProps,
		forwardedRef,
	): JSX.Element {
		const { pathname } = useLocation();
		const virtuosoRef = useRef<TableVirtuosoHandle | null>(null);
		// could avoid this if directly use forwardedRef in TableVirtuoso, but need to verify if it causes any issue with react-virtuoso internal ref handling
		useImperativeHandle(
			forwardedRef,
			() => virtuosoRef.current as TableVirtuosoHandle,
			[],
		);
		const [, setCopy] = useCopyToClipboard();
		const isDarkMode = useIsDarkMode();
		const isLogsExplorerPage = pathname === ROUTES.LOGS_EXPLORER;
		const { activeLog: activeContextLog } = useActiveLog();

		// Column definitions (shared with existing logs table)
		const { dataSource, columns } = useTableView({
			...tableViewProps,
			onClickExpand: onSetActiveLog,
			onOpenLogsContext: (log): void => onSetActiveLog?.(log, VIEW_TYPES.CONTEXT),
		});

		// Column order (drag + persisted order)
		const { draggedColumns, onColumnOrderChange } = useDragColumns<TableRecord>(
			LOCALSTORAGE.LOGS_LIST_COLUMNS,
		);
		const {
			orderedColumns,
			orderedColumnIds,
			hasSingleColumn,
			handleDragEnd,
			sensors,
		} = useOrderedColumns({
			columns,
			draggedColumns,
			onColumnOrderChange: onColumnOrderChange as (columns: unknown[]) => void,
		});

		// Column sizing (persisted). stored to localStorage.
		const { columnSizing, setColumnSizing } = useColumnSizingPersistence(
			orderedColumns,
		);

		// don't allow "remove column" when only state-indicator + one data col remain
		const isAtMinimumRemovableColumns = useMemo(
			() =>
				orderedColumns.filter(
					(column) => column.key !== 'state-indicator' && column.key !== 'expand',
				).length <= 1,
			[orderedColumns],
		);

		// Table data (TanStack row data shape)
		// useTableView sends flattened log data. this would not be needed once we move to new log details view
		const tableData = useMemo<TanStackTableRowData[]>(
			() =>
				dataSource
					.map((log, rowIndex) => {
						const currentLog = tableViewProps.logs[rowIndex];
						if (!currentLog) {
							return null;
						}
						return { log, currentLog, rowIndex };
					})
					.filter(Boolean) as TanStackTableRowData[],
			[dataSource, tableViewProps.logs],
		);

		// TanStack columns + table instance
		const tanstackColumns = useMemo<ColumnDef<TanStackTableRowData>[]>(
			() =>
				orderedColumns.map((column, index) => {
					const isStateIndicator = column.key === 'state-indicator';
					const isExpand = column.key === 'expand';
					const isFixedColumn = isStateIndicator || isExpand;
					const fixedWidth = isFixedColumn ? 32 : undefined;
					const minWidthPx = getColumnMinWidthPx(column, orderedColumns);
					const headerTitle = String(column.title || '');

					return {
						id: getColumnId(column),
						header: headerTitle.replace(/^\w/, (character) =>
							character.toUpperCase(),
						),
						accessorFn: (row): unknown => row.log[column.key as keyof TableRecord],
						enableResizing: !isFixedColumn && index !== orderedColumns.length - 1,
						minSize: fixedWidth ?? minWidthPx,
						size: fixedWidth, // last column gets remaining space, so don't set initial size to avoid conflict with resizing
						maxSize: fixedWidth,
						cell: ({ row, getValue }): ReactElement | string | number | null => {
							if (!column.render) {
								return null;
							}

							return resolveColumnTypeRender(
								column.render(
									getValue(),
									row.original.log,
									row.original.rowIndex,
								) as ColumnTypeRender<Record<string, unknown>>,
							);
						},
					};
				}),
			[orderedColumns],
		);
		const table = useReactTable({
			data: tableData,
			columns: tanstackColumns,
			enableColumnResizing: true,
			getCoreRowModel: getCoreRowModel(),
			columnResizeMode: 'onChange',
			onColumnSizingChange: setColumnSizing,
			state: {
				columnSizing,
			},
		});
		const tableRows = table.getRowModel().rows;

		// Infinite-scroll footer UI state
		const [loadMoreState, setLoadMoreState] = useState<{
			active: boolean;
			startCount: number;
		}>({
			active: false,
			startCount: 0,
		});

		// Map to resolve full log object by id (row highlighting + indicator)
		const logsById = useMemo(
			() => new Map(tableViewProps.logs.map((log) => [String(log.id), log])),
			[tableViewProps.logs],
		);

		// this is already written in parent. Check if this is needed.
		useEffect(() => {
			const activeLogIndex = tableViewProps.activeLogIndex ?? -1;
			if (activeLogIndex < 0 || activeLogIndex >= tableRows.length) {
				return;
			}

			virtuosoRef.current?.scrollToIndex({
				index: activeLogIndex,
				align: 'center',
				behavior: 'auto',
			});
		}, [tableRows.length, tableViewProps.activeLogIndex]);

		useEffect(() => {
			if (!loadMoreState.active) {
				return;
			}

			if (!isFetching || tableRows.length > loadMoreState.startCount) {
				setLoadMoreState((prev) =>
					prev.active ? { active: false, startCount: prev.startCount } : prev,
				);
			}
		}, [isFetching, loadMoreState, tableRows.length]);

		const handleLogCopy = useCallback(
			(logId: string, event: ReactMouseEvent<HTMLElement>): void => {
				event.preventDefault();
				event.stopPropagation();

				const urlQuery = new URLSearchParams(window.location.search);
				urlQuery.delete(QueryParams.activeLogId);
				urlQuery.delete(QueryParams.relativeTime);
				urlQuery.set(QueryParams.activeLogId, `"${logId}"`);
				const link = getAbsoluteUrl(`${pathname}?${urlQuery.toString()}`);

				setCopy(link);
				toast.success('Copied to clipboard', { position: 'top-right' });
			},
			[pathname, setCopy],
		);

		const itemContent = useCallback(
			(index: number): JSX.Element | null => {
				const row = tableRows[index];
				if (!row) {
					return null;
				}

				return (
					<TanStackRowCells
						row={row}
						fontSize={tableViewProps.fontSize}
						onSetActiveLog={onSetActiveLog}
						onClearActiveLog={onClearActiveLog}
						isActiveLog={
							String(activeLog?.id ?? '') === String(row.original.currentLog.id ?? '')
						}
						isDarkMode={isDarkMode}
						onLogCopy={handleLogCopy}
						isLogsExplorerPage={isLogsExplorerPage}
					/>
				);
			},
			[
				activeLog?.id,
				handleLogCopy,
				isDarkMode,
				isLogsExplorerPage,
				onClearActiveLog,
				onSetActiveLog,
				tableRows,
				tableViewProps.fontSize,
			],
		);

		const flatHeaders = useMemo(
			() => table.getFlatHeaders().filter((header) => !header.isPlaceholder),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[tanstackColumns],
		);

		const tableHeader = useCallback(() => {
			const orderedColumnsById = new Map(
				orderedColumns.map((column) => [getColumnId(column), column] as const),
			);

			return (
				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragEnd={handleDragEnd}
					autoScroll={COLUMN_DND_AUTO_SCROLL}
				>
					<SortableContext
						items={orderedColumnIds}
						strategy={horizontalListSortingStrategy}
					>
						<tr>
							{flatHeaders.map((header) => {
								const column = orderedColumnsById.get(header.id);
								if (!column) {
									return null;
								}

								return (
									<TanStackHeaderRow
										key={header.id}
										column={column}
										header={header}
										isDarkMode={isDarkMode}
										fontSize={tableViewProps.fontSize}
										hasSingleColumn={hasSingleColumn}
										onRemoveColumn={onRemoveColumn}
										canRemoveColumn={!isAtMinimumRemovableColumns}
									/>
								);
							})}
						</tr>
					</SortableContext>
				</DndContext>
			);
		}, [
			flatHeaders,
			handleDragEnd,
			hasSingleColumn,
			isDarkMode,
			orderedColumnIds,
			orderedColumns,
			onRemoveColumn,
			isAtMinimumRemovableColumns,
			sensors,
			tableViewProps.fontSize,
		]);

		const handleEndReached = useCallback(
			(index: number): void => {
				if (!infitiyTableProps?.onEndReached) {
					return;
				}

				setLoadMoreState({
					active: true,
					startCount: tableRows.length,
				});
				infitiyTableProps.onEndReached(index);
			},
			[infitiyTableProps, tableRows.length],
		);

		if (isLoading) {
			return <Spinner height="35px" tip="Getting Logs" />;
		}

		return (
			<div className="tanstack-table-view-wrapper">
				<TableVirtuoso
					className="logs-table-virtuoso-scroll"
					ref={virtuosoRef}
					style={infinityDefaultStyles}
					data={tableData}
					totalCount={tableRows.length}
					increaseViewportBy={{ top: 500, bottom: 500 }}
					initialTopMostItemIndex={
						tableViewProps.activeLogIndex !== -1 ? tableViewProps.activeLogIndex : 0
					}
					context={{ activeLog, activeContextLog, logsById }}
					fixedHeaderContent={tableHeader}
					itemContent={itemContent}
					components={{
						Table: ({ style, children }): JSX.Element => (
							<TanStackTableStyled style={style}>
								<colgroup>
									{orderedColumns.map((column, colIndex) => {
										const columnId = getColumnId(column);
										const isFixedColumn =
											column.key === 'expand' || column.key === 'state-indicator';
										const minWidthPx = getColumnMinWidthPx(column, orderedColumns);
										const persistedWidth = columnSizing[columnId];
										const computedWidth = table.getColumn(columnId)?.getSize();
										const effectiveWidth = persistedWidth ?? computedWidth;
										if (isFixedColumn) {
											return <col key={columnId} className="tanstack-fixed-col" />;
										}
										// Last data column should stretch to fill remaining space
										const isLastColumn = colIndex === orderedColumns.length - 1;
										if (isLastColumn) {
											return (
												<col
													key={columnId}
													style={{ width: '100%', minWidth: `${minWidthPx}px` }}
												/>
											);
										}
										const widthPx =
											effectiveWidth != null
												? Math.max(effectiveWidth, minWidthPx)
												: minWidthPx;
										return (
											<col
												key={columnId}
												style={{ width: `${widthPx}px`, minWidth: `${minWidthPx}px` }}
											/>
										);
									})}
								</colgroup>
								{children}
							</TanStackTableStyled>
						),
						TableRow: TanStackCustomTableRow,
					}}
					{...(infitiyTableProps?.onEndReached
						? { endReached: handleEndReached }
						: {})}
				/>
				{loadMoreState.active && (
					<div className="tanstack-load-more-container">
						<Spinner height="20px" tip="Getting Logs" />
					</div>
				)}
			</div>
		);
	},
);

export default memo(TanStackTableView);
