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
} from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import {
	TableComponents,
	TableVirtuoso,
	TableVirtuosoHandle,
} from 'react-virtuoso';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import {
	horizontalListSortingStrategy,
	SortableContext,
} from '@dnd-kit/sortable';
import { toast } from '@signozhq/sonner';
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
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDragColumns from 'hooks/useDragColumns';

import { getInfinityDefaultStyles } from '../InfinityTableView/config';
import { TanStackTableStyled } from '../InfinityTableView/styles';
import { InfinityTableProps } from '../InfinityTableView/types';
import TanStackCustomTableRow from './TanStackCustomTableRow';
import TanStackHeaderRow from './TanStackHeaderRow';
import TanStackRow from './TanStackRow';
import { TableRecord, TanStackTableRowData } from './types';
import { useColumnSizingPersistence } from './useColumnSizingPersistence';
import { useOrderedColumns } from './useOrderedColumns';
import {
	getColumnId,
	getColumnMinWidthPx,
	resolveColumnTypeRender,
} from './utils';

const TanStackTableView = forwardRef<TableVirtuosoHandle, InfinityTableProps>(
	function TanStackTableView(
		{
			isLoading,
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
		useImperativeHandle(
			forwardedRef,
			() => virtuosoRef.current as TableVirtuosoHandle,
			[],
		);
		const [, setCopy] = useCopyToClipboard();
		const { dataSource, columns } = useTableView({
			...tableViewProps,
			onClickExpand: onSetActiveLog,
			onOpenLogsContext: (log): void => onSetActiveLog?.(log, VIEW_TYPES.CONTEXT),
		});

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
		const { columnSizing, setColumnSizing } = useColumnSizingPersistence(
			orderedColumns,
		);
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
		const tanstackColumns = useMemo<ColumnDef<TanStackTableRowData>[]>(
			() =>
				orderedColumns.map((column) => {
					const isStateIndicator = column.key === 'state-indicator';
					const isExpand = column.key === 'expand';
					const isFixedColumn = isStateIndicator || isExpand;
					const fixedWidth = isFixedColumn ? 32 : undefined;
					const minWidthPx = getColumnMinWidthPx(column);
					const headerTitle = String(column.title || '');

					return {
						id: getColumnId(column),
						header: headerTitle.replace(/^\w/, (character) =>
							character.toUpperCase(),
						),
						accessorFn: (row): unknown => row.log[column.key as keyof TableRecord],
						enableResizing: !isFixedColumn,
						minSize: fixedWidth ?? minWidthPx,
						size: fixedWidth,
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
		const { activeLogId } = useCopyLogLink();
		const { activeLog: activeContextLog } = useActiveLog();
		const rowSelection = useMemo<Record<string, boolean>>(() => {
			const targetId = activeLog?.id ?? activeLogId;
			if (targetId === undefined || targetId === null || targetId === '') {
				return {};
			}

			const activeIndex = tableData.findIndex(
				(row) => String(row.currentLog.id) === String(targetId),
			);
			if (activeIndex < 0) {
				return {};
			}

			return { [String(activeIndex)]: true };
		}, [activeLog?.id, activeLogId, tableData]);
		const table = useReactTable({
			data: tableData,
			columns: tanstackColumns,
			enableColumnResizing: true,
			getCoreRowModel: getCoreRowModel(),
			columnResizeMode: 'onChange',
			onColumnSizingChange: setColumnSizing,
			state: {
				rowSelection,
				columnSizing,
			},
		});
		const tableRows = table.getRowModel().rows;

		const isLogsExplorerPage = pathname === ROUTES.LOGS_EXPLORER;
		const logsById = useMemo(
			() => new Map(tableViewProps.logs.map((log) => [String(log.id), log])),
			[tableViewProps.logs],
		);
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
		const isDarkMode = useIsDarkMode();
		const handleLogCopy = useCallback(
			(logId: string, event: ReactMouseEvent<HTMLElement>): void => {
				event.preventDefault();
				event.stopPropagation();

				const urlQuery = new URLSearchParams(window.location.search);
				urlQuery.delete(QueryParams.activeLogId);
				urlQuery.delete(QueryParams.relativeTime);
				urlQuery.set(QueryParams.activeLogId, `"${logId}"`);
				const link = `${window.location.origin}${pathname}?${urlQuery.toString()}`;

				setCopy(link);
				toast.success('Copied to clipboard', { position: 'top-right' });
			},
			[pathname, setCopy],
		);
		const customTableRow = useCallback<
			NonNullable<TableComponents<TanStackTableRowData>['TableRow']>
		>(
			({ children, item, ...props }) => (
				<TanStackCustomTableRow
					{...props}
					item={item}
					activeLog={activeLog}
					activeContextLog={activeContextLog}
					logsById={logsById}
				>
					{children}
				</TanStackCustomTableRow>
			),
			[activeContextLog, activeLog, logsById],
		);
		const itemContent = useCallback(
			(index: number): JSX.Element | null => {
				const row = tableRows[index];
				if (!row) {
					return null;
				}

				return (
					<TanStackRow
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
		const tableHeader = useCallback(() => {
			const flatHeaders = table
				.getFlatHeaders()
				.filter((header) => !header.isPlaceholder);
			const orderedColumnsById = new Map(
				orderedColumns.map((column) => [getColumnId(column), column] as const),
			);

			return (
				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragEnd={handleDragEnd}
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
									/>
								);
							})}
						</tr>
					</SortableContext>
				</DndContext>
			);
		}, [
			handleDragEnd,
			hasSingleColumn,
			isDarkMode,
			orderedColumnIds,
			orderedColumns,
			sensors,
			table,
			tableViewProps.fontSize,
		]);

		if (isLoading) {
			return <Spinner height="35px" tip="Getting Logs" />;
		}

		return (
			<TableVirtuoso
				ref={virtuosoRef}
				style={getInfinityDefaultStyles(tableViewProps.fontSize)}
				data={tableData}
				totalCount={tableRows.length}
				initialTopMostItemIndex={
					tableViewProps.activeLogIndex !== -1 ? tableViewProps.activeLogIndex : 0
				}
				fixedHeaderContent={tableHeader}
				itemContent={itemContent}
				components={{
					Table: ({ style, children }): JSX.Element => (
						<TanStackTableStyled style={style}>
							<colgroup>
								{orderedColumns.map((column) => {
									const columnId = getColumnId(column);
									const isFixedColumn =
										column.key === 'expand' || column.key === 'state-indicator';
									const minWidthPx = getColumnMinWidthPx(column);
									const persistedWidth = columnSizing[columnId];
									const computedWidth = table.getColumn(columnId)?.getSize();
									const effectiveWidth = persistedWidth ?? computedWidth;
									if (isFixedColumn) {
										return (
											<col
												key={columnId}
												style={{
													width: '32px',
													minWidth: '32px',
													maxWidth: '32px',
												}}
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
											style={{
												width: `${widthPx}px`,
												minWidth: `${minWidthPx}px`,
											}}
										/>
									);
								})}
							</colgroup>
							{children}
						</TanStackTableStyled>
					),
					TableRow: customTableRow,
				}}
				{...(infitiyTableProps?.onEndReached
					? { endReached: infitiyTableProps.onEndReached }
					: {})}
			/>
		);
	},
);

export default memo(TanStackTableView);
