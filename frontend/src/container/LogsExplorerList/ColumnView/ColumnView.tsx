import { ColumnDef, DataTable, Row } from '@signozhq/table';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import LogStateIndicator from 'components/Logs/LogStateIndicator/LogStateIndicator';
import { getLogIndicatorTypeForTable } from 'components/Logs/LogStateIndicator/utils';
import { useTableView } from 'components/Logs/TableView/useTableView';
import { LOCALSTORAGE } from 'constants/localStorage';
import { FontSize } from 'container/OptionsMenu/types';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import { isEmpty, isEqual } from 'lodash-es';
import { useMemo } from 'react';
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

// // Generate large dataset for virtualization demo (supports offset for unique ids)
// const generateLargeDataset = (count: number, startIndex = 0): any[] => {
// 	const departments = [
// 		'Engineering',
// 		'Marketing',
// 		'Sales',
// 		'Support',
// 		'Product',
// 		'Design',
// 		'Finance',
// 		'HR',
// 	];
// 	const roles = ['admin', 'user', 'moderator', 'guest'] as const;
// 	const statuses = ['active', 'inactive', 'pending', 'suspended'] as const;

// 	return Array.from({ length: count }, (_, index) => ({
// 		id: `${startIndex + index + 1}`,
// 		name: `User ${startIndex + index + 1}`,
// 		email: `user${startIndex + index + 1}@company.com`,
// 		role: roles[index % roles.length],
// 		status: statuses[index % statuses.length],
// 		lastLogin: new Date(
// 			Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
// 		).toISOString(),
// 		createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
// 			.toISOString()
// 			.split('T')[0],
// 		avatar: `https://images.unsplash.com/photo-${
// 			1500000000000 + index
// 		}?w=32&h=32&fit=crop&crop=face`,
// 		department: departments[index % departments.length],
// 		salary: 50000 + Math.floor(Math.random() * 100000),
// 		performance: 60 + Math.floor(Math.random() * 40),
// 	}));
// };

// const defaultColumns = [
// 	{
// 		id: 'serial',
// 		header: '#',
// 		size: 72,
// 		cell: ({ row }: { row: Row<any> }): number => row.index + 1,
// 	},
// 	{
// 		accessorKey: 'name',
// 		header: 'Name',
// 		size: 220,
// 		minSize: 120,
// 		maxSize: 360,
// 	},
// 	{
// 		accessorKey: 'email',
// 		header: 'Email',
// 		size: 260,
// 		minSize: 160,
// 		maxSize: 460,
// 	},
// 	{
// 		accessorKey: 'role',
// 		header: 'Role',
// 		size: 140,
// 		minSize: 100,
// 		maxSize: 220,
// 	},
// 	{
// 		accessorKey: 'status',
// 		header: 'Status',
// 		size: 160,
// 		minSize: 120,
// 		maxSize: 240,
// 	},
// 	{
// 		accessorKey: 'department',
// 		header: 'Department',
// 		size: 180,
// 		minSize: 120,
// 		maxSize: 280,
// 	},
// 	{
// 		accessorKey: 'salary',
// 		header: 'Salary',
// 		size: 140,
// 		minSize: 100,
// 		maxSize: 220,
// 	},
// 	{
// 		accessorKey: 'performance',
// 		header: 'Performance',
// 		size: 200,
// 		minSize: 120,
// 		maxSize: 300,
// 	},
// 	{
// 		accessorKey: 'lastLogin',
// 		header: 'Last Login',
// 		size: 180,
// 		minSize: 120,
// 		maxSize: 260,
// 	},
// ];

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
		activeLog: activeContextLog,
		onSetActiveLog: handleSetActiveContextLog,
		onClearActiveLog: handleClearActiveContextLog,
		onAddToQuery: handleAddToQuery,
	} = useActiveLog();

	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
	} = useActiveLog();

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
		onClickExpand: onSetActiveLog,
		onOpenLogsContext: handleSetActiveContextLog,
	});

	const { draggedColumns, onColumnOrderChange } = useDragColumns<
		Record<string, unknown>
	>(LOCALSTORAGE.LOGS_LIST_COLUMNS);

	const tableColumns = useMemo(
		() => getDraggedColumns<Record<string, unknown>>(columns, draggedColumns),
		[columns, draggedColumns],
	);

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
		fixedHeight: isFrequencyChartVisible ? 520 : 720,
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
				maxSize: field.key === 'state-indicator' ? 4 : 1080,
				pin: field.key === 'state-indicator' ? 'left' : 'none',
				// eslint-disable-next-line react/no-unstable-nested-components
				cell: ({
					row,
					getValue,
				}: {
					row: Row<Record<string, string>>;
					getValue: () => string | JSX.Element;
				}): string | JSX.Element => {
					if (field.key === 'state-indicator') {
						const type = getLogIndicatorTypeForTable(row.original);
						const fontSize = options.fontSize as FontSize;

						return <LogStateIndicator type={type} fontSize={fontSize} />;
					}

					return <div className="table-cell-content">{getValue()}</div>;
				},
			})),
		[tableColumns, options.fontSize],
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

		onSetActiveLog(currentLog as ILog);
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
			/>

			{activeContextLog && (
				<LogDetail
					log={activeContextLog}
					onClose={handleClearActiveContextLog}
					onAddToQuery={handleAddToQuery}
					selectedTab={VIEW_TYPES.CONTEXT}
					onGroupByAttribute={onGroupByAttribute}
				/>
			)}

			{activeLog && (
				<LogDetail
					selectedTab={VIEW_TYPES.OVERVIEW}
					log={activeLog}
					onClose={onClearActiveLog}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
					onGroupByAttribute={onGroupByAttribute}
				/>
			)}
		</div>
	);
}

export default ColumnView;
