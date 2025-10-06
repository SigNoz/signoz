/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react-hooks/exhaustive-deps */
import { ColumnDef, DataTable, Row } from '@signozhq/table';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import LogStateIndicator from 'components/Logs/LogStateIndicator/LogStateIndicator';
import { useTableView } from 'components/Logs/TableView/useTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { FontSize } from 'container/OptionsMenu/types';
import dayjs from 'dayjs';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { isEmpty, isEqual } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ILog } from 'types/api/logs/log';

interface ColumnViewProps {
	logs: ILog[];
	onLoadMore: () => void;
	selectedFields: any[];
	isLoading: boolean;
	isFetching: boolean;

	isFrequencyChartVisible: boolean;
	options: {
		maxLinesPerRow: number;
		fontSize: FontSize;
	};
}

function ColumnView({
	logs,
	onLoadMore,
	selectedFields,
	isLoading,
	isFetching,
	isFrequencyChartVisible,
	options,
}: ColumnViewProps): JSX.Element {
	const {
		activeLog,
		onSetActiveLog: handleSetActiveLog,
		onClearActiveLog: handleClearActiveLog,
		onAddToQuery: handleAddToQuery,
		onGroupByAttribute: handleGroupByAttribute,
	} = useActiveLog();

	const [showActiveLog, setShowActiveLog] = useState<boolean>(false);

	const { queryData: activeLogId } = useUrlQueryData<string | null>(
		QueryParams.activeLogId,
		null,
	);

	const scrollToIndexRef = useRef<
		| ((
				rowIndex: number,
				options?: { align?: 'start' | 'center' | 'end' },
		  ) => void)
		| undefined
	>();

	const { timezone } = useTimezone();

	useEffect(() => {
		if (activeLogId) {
			const log = logs.find(({ id }) => id === activeLogId);

			if (log) {
				handleSetActiveLog(log);
				setShowActiveLog(true);
			}
		}
	}, []);

	const tableViewProps = {
		logs,
		fields: selectedFields,
		linesPerRow: options.maxLinesPerRow as number,
		fontSize: options.fontSize as FontSize,
		appendTo: 'end' as const,
		activeLogIndex: 0,
	};

	const { dataSource, columns } = useTableView({
		...tableViewProps,
		onClickExpand: handleSetActiveLog,
	});

	const { draggedColumns, onColumnOrderChange } = useDragColumns<
		Record<string, unknown>
	>(LOCALSTORAGE.LOGS_LIST_COLUMNS);

	const tableColumns = useMemo(
		() => getDraggedColumns<Record<string, unknown>>(columns, draggedColumns),
		[columns, draggedColumns],
	);

	const scrollToLog = useCallback(
		(logId: string): void => {
			const logIndex = logs.findIndex((log) => log.id === logId);

			if (logIndex !== -1 && scrollToIndexRef.current) {
				scrollToIndexRef.current(logIndex, { align: 'center' });
			}
		},
		[logs],
	);

	useEffect(() => {
		if (activeLogId) {
			scrollToLog(activeLogId);
		}
	}, [activeLogId]);

	const args = {
		columns,
		tableId: 'virtualized-infinite-reorder-resize',
		enableSorting: false,
		enableFiltering: false,
		enableGlobalFilter: false,
		enableColumnReordering: true,
		enableColumnResizing: true,
		enableColumnPinning: false,
		enableRowSelection: false,
		enablePagination: false,
		showHeaders: true,
		defaultColumnWidth: 180,
		minColumnWidth: 80,
		maxColumnWidth: 480,
		// Virtualization + Infinite Scroll
		enableVirtualization: true,
		estimateRowSize: 56,
		overscan: 50,
		rowHeight: 56,
		enableInfiniteScroll: true,
		enableScrollRestoration: false,
		fixedHeight: isFrequencyChartVisible ? 560 : 760,
		enableDynamicRowHeight: true,
	};

	const selectedColumns = useMemo(
		() =>
			tableColumns.map((field) => ({
				id: field.key?.toString().toLowerCase().replace(/\./g, '_'), // IMP - Replace dots with underscores as reordering does not work well for accessorKey with dots
				// accessorKey: field.name,
				accessorFn: (row: Record<string, string>): string =>
					row[field.key as string] as string,
				header: field.title as string,
				// eslint-disable-next-line sonarjs/no-duplicate-string
				size: field.key === 'state-indicator' ? 4 : 180,
				minSize: field.key === 'state-indicator' ? 4 : 120,
				maxSize: field.key === 'state-indicator' ? 4 : Number.MAX_SAFE_INTEGER,
				disableReorder: field.key === 'state-indicator',
				disableDropBefore: field.key === 'state-indicator',
				disableResizing: field.key === 'state-indicator',
				// eslint-disable-next-line react/no-unstable-nested-components
				cell: ({
					row,
					getValue,
				}: {
					row: Row<Record<string, string>>;
					getValue: () => string | JSX.Element;
				}): string | JSX.Element => {
					if (field.key === 'state-indicator') {
						const fontSize = options.fontSize as FontSize;

						return (
							<LogStateIndicator
								severityText={row.original?.severity_text}
								fontSize={fontSize}
							/>
						);
					}

					const isTimestamp = field.key === 'timestamp';
					const cellContent = getValue();

					if (isTimestamp) {
						const formattedTimestamp = dayjs(cellContent as string).tz(
							timezone.value,
						);

						return (
							<div className="table-cell-content">
								{formattedTimestamp.format(DATE_TIME_FORMATS.ISO_DATETIME_MS)}
							</div>
						);
					}

					return (
						<div
							className={`table-cell-content ${
								row.original.id === activeLog?.id ? 'active-log' : ''
							}`}
						>
							{cellContent}
						</div>
					);
				},
			})),
		[tableColumns, options.fontSize, activeLog?.id],
	);

	const handleColumnOrderChange = (newColumns: ColumnDef<any>[]): void => {
		if (isEmpty(newColumns) || isEqual(newColumns, selectedColumns)) return;

		const formattedColumns = newColumns.map((column) => ({
			id: column.id,
			header: column.header,
			size: column.size,
			minSize: column.minSize,
			maxSize: column.maxSize,
			key: column.id,
			title: column.header as string,
			dataIndex: column.id,
		}));

		onColumnOrderChange(formattedColumns);
	};

	const handleRowClick = (row: Row<Record<string, unknown>>): void => {
		const currentLog = logs.find(({ id }) => id === row.original.id);

		setShowActiveLog(true);
		handleSetActiveLog(currentLog as ILog);
	};

	const removeQueryParam = (key: string): void => {
		const url = new URL(window.location.href);
		url.searchParams.delete(key);
		window.history.replaceState({}, '', url);
	};

	const handleLogDetailClose = (): void => {
		removeQueryParam(QueryParams.activeLogId);
		handleClearActiveLog();
		setShowActiveLog(false);
	};

	return (
		<div
			className={`logs-list-table-view-container ${
				options.fontSize as FontSize
			} max-lines-${options.maxLinesPerRow as number}`}
			data-max-lines-per-row={options.maxLinesPerRow}
			data-font-size={options.fontSize}
		>
			<DataTable
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...args}
				columns={selectedColumns as ColumnDef<Record<string, string>, unknown>[]}
				data={dataSource}
				hasMore
				onLoadMore={onLoadMore}
				loadingMore={isLoading || isFetching}
				onColumnOrderChange={handleColumnOrderChange}
				onRowClick={handleRowClick}
				scrollToIndexRef={scrollToIndexRef}
			/>

			{showActiveLog && activeLog && (
				<LogDetail
					selectedTab={VIEW_TYPES.OVERVIEW}
					log={activeLog}
					onClose={handleLogDetailClose}
					onAddToQuery={handleAddToQuery}
					onClickActionItem={handleAddToQuery}
					onGroupByAttribute={handleGroupByAttribute}
				/>
			)}
		</div>
	);
}

export default ColumnView;
