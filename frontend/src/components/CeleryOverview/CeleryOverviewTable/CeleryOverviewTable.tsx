import './CeleryOverviewTable.styles.scss';

import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Input,
	InputRef,
	Progress,
	Space,
	Spin,
	TableColumnsType,
	TableColumnType,
	Tooltip,
	Typography,
} from 'antd';
import { FilterDropdownProps } from 'antd/lib/table/interface';
import logEvent from 'api/common/logEvent';
import {
	getQueueOverview,
	QueueOverviewResponse,
} from 'api/messagingQueues/celery/getQueueOverview';
import { isNumber } from 'chart.js/helpers';
import { ResizeTable } from 'components/ResizeTable';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const INITIAL_PAGE_SIZE = 20;

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography.Text className="numbers">
			{range[0]} &#8212; {range[1]}
		</Typography.Text>
		<Typography.Text className="total"> of {total}</Typography.Text>
	</>
);

export type RowData = {
	key: string | number;
	[key: string]: string | number;
};

function ProgressRender(item: string | number): JSX.Element {
	const percent = Number(Number(item).toFixed(1));
	return (
		<div className="progress-container">
			<Progress
				percent={percent}
				strokeLinecap="butt"
				size="small"
				strokeColor={((): string => {
					const cpuPercent = percent;
					if (cpuPercent >= 90) return Color.BG_SAKURA_500;
					if (cpuPercent >= 60) return Color.BG_AMBER_500;
					return Color.BG_FOREST_500;
				})()}
				className="progress-bar"
			/>
		</div>
	);
}

const getColumnSearchProps = (
	searchInput: React.RefObject<InputRef>,
	handleReset: (
		clearFilters: () => void,
		confirm: FilterDropdownProps['confirm'],
	) => void,
	handleSearch: (selectedKeys: string[], confirm: () => void) => void,
	dataIndex?: string,
): TableColumnType<RowData> => ({
	filterDropdown: ({
		setSelectedKeys,
		selectedKeys,
		confirm,
		clearFilters,
		close,
	}): JSX.Element => (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div style={{ padding: 8 }} onKeyDown={(e): void => e.stopPropagation()}>
			<Input
				ref={searchInput}
				placeholder={`Search ${dataIndex}`}
				value={selectedKeys[0]}
				onChange={(e): void =>
					setSelectedKeys(e.target.value ? [e.target.value] : [])
				}
				onPressEnter={(): void => handleSearch(selectedKeys as string[], confirm)}
				style={{ marginBottom: 8, display: 'block' }}
			/>
			<Space>
				<Button
					type="primary"
					size="small"
					onClick={(): void => handleSearch(selectedKeys as string[], confirm)}
					icon={<SearchOutlined />}
				>
					Search
				</Button>
				<Button
					onClick={(): void => clearFilters && handleReset(clearFilters, confirm)}
					size="small"
					style={{ width: 90 }}
				>
					Reset
				</Button>
				<Button
					type="link"
					size="small"
					onClick={(): void => {
						close();
					}}
				>
					close
				</Button>
			</Space>
		</div>
	),
	filterIcon: (filtered: boolean): JSX.Element => (
		<SearchOutlined
			style={{ color: filtered ? Color.BG_ROBIN_500 : undefined }}
		/>
	),
	onFilter: (value, record): boolean =>
		record[dataIndex || '']
			.toString()
			.toLowerCase()
			.includes((value as string).toLowerCase()),
});

function getColumns(data: RowData[]): TableColumnsType<RowData> {
	if (data?.length === 0) {
		return [];
	}

	const tooltipRender = (item: string): JSX.Element => (
		<Tooltip placement="topLeft" title={item}>
			{item}
		</Tooltip>
	);

	return [
		{
			title: 'SERVICE NAME',
			dataIndex: 'service_name',
			key: 'service_name',
			ellipsis: {
				showTitle: false,
			},
			width: 200,
			sorter: (a: RowData, b: RowData): number =>
				String(a.service_name).localeCompare(String(b.service_name)),
			render: tooltipRender,
			fixed: 'left',
		},
		{
			title: 'SPAN NAME',
			dataIndex: 'span_name',
			key: 'span_name',
			ellipsis: {
				showTitle: false,
			},
			width: 200,
			sorter: (a: RowData, b: RowData): number =>
				String(a.span_name).localeCompare(String(b.span_name)),
			render: tooltipRender,
		},
		{
			title: 'MESSAGING SYSTEM',
			dataIndex: 'messaging_system',
			key: 'messaging_system',
			ellipsis: {
				showTitle: false,
			},
			width: 200,
			sorter: (a: RowData, b: RowData): number =>
				String(a.messaging_system).localeCompare(String(b.messaging_system)),
			render: tooltipRender,
		},
		{
			title: 'DESTINATION',
			dataIndex: 'destination',
			key: 'destination',
			ellipsis: {
				showTitle: false,
			},
			render: tooltipRender,
			width: 200,
			sorter: (a: RowData, b: RowData): number =>
				String(a.destination).localeCompare(String(b.destination)),
		},
		{
			title: 'KIND',
			dataIndex: 'kind_string',
			key: 'kind_string',
			ellipsis: {
				showTitle: false,
			},
			width: 100,
			sorter: (a: RowData, b: RowData): number =>
				String(a.kind_string).localeCompare(String(b.kind_string)),
			render: tooltipRender,
		},
		{
			title: 'ERROR %',
			dataIndex: 'error_percentage',
			key: 'error_percentage',
			ellipsis: {
				showTitle: false,
			},
			width: 200,
			sorter: (a: RowData, b: RowData): number => {
				const aValue = Number(a.error_percentage);
				const bValue = Number(b.error_percentage);
				return aValue - bValue;
			},
			render: ProgressRender,
		},
		{
			title: 'LATENCY (P95) in ms',
			dataIndex: 'p95_latency',
			key: 'p95_latency',
			ellipsis: {
				showTitle: false,
			},
			width: 100,
			sorter: (a: RowData, b: RowData): number => {
				const aValue = Number(a.p95_latency);
				const bValue = Number(b.p95_latency);
				return aValue - bValue;
			},
			render: (value: number | string): string => {
				if (!isNumber(value)) return value.toString();
				return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
			},
		},
		{
			title: 'THROUGHPUT (ops/s)',
			dataIndex: 'throughput',
			key: 'throughput',
			ellipsis: {
				showTitle: false,
			},
			width: 100,
			sorter: (a: RowData, b: RowData): number => {
				const aValue = Number(a.throughput);
				const bValue = Number(b.throughput);
				return aValue - bValue;
			},
			render: (value: number | string): string => {
				if (!isNumber(value)) return value.toString();
				return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
			},
		},
	];
}

function getTableData(data: QueueOverviewResponse['data']): RowData[] {
	if (data?.length === 0) {
		return [];
	}

	const columnOrder = [
		'service_name',
		'span_name',
		'messaging_system',
		'destination',
		'kind_string',
		'error_percentage',
		'p95_latency',
		'throughput',
	];

	const tableData: RowData[] =
		data?.map(
			(row, index: number): RowData => {
				const rowData: Record<string, string | number> = {};
				columnOrder.forEach((key) => {
					const value = row.data[key as keyof typeof row.data];
					if (typeof value === 'string' || typeof value === 'number') {
						rowData[key] = value;
					}
				});
				Object.entries(row.data).forEach(([key, value]) => {
					if (
						!columnOrder.includes(key) &&
						(typeof value === 'string' || typeof value === 'number')
					) {
						rowData[key] = value;
					}
				});

				return {
					...rowData,
					key: index,
				};
			},
		) || [];

	return tableData;
}

type Filter = {
	key: {
		key: string;
		dataType: string;
	};
	op: string;
	value: string[];
};

type FilterConfig = {
	paramName: string;
	operator: string;
	key: string;
};

function makeFilters(urlQuery: URLSearchParams): Filter[] {
	const filterConfigs: FilterConfig[] = [
		{ paramName: QueryParams.destination, key: 'destination', operator: 'in' },
		{ paramName: QueryParams.msgSystem, key: 'queue', operator: 'in' },
		{ paramName: QueryParams.kindString, key: 'kind_string', operator: 'in' },
		{ paramName: QueryParams.service, key: 'service.name', operator: 'in' },
		{ paramName: QueryParams.spanName, key: 'name', operator: 'in' },
	];

	return filterConfigs
		.map(({ paramName, operator, key }) => {
			const value = urlQuery.get(paramName);
			if (!value) return null;

			return {
				key: {
					key,
					dataType: 'string',
				},
				op: operator,
				value: value.split(','),
			};
		})
		.filter((filter): filter is Filter => filter !== null);
}

export default function CeleryOverviewTable({
	onRowClick,
}: {
	onRowClick: (record: RowData) => void;
}): JSX.Element {
	const [tableData, setTableData] = useState<RowData[]>([]);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { mutate: getOverviewData, isLoading } = useMutation(getQueueOverview, {
		onSuccess: (data) => {
			if (data?.payload) {
				setTableData(getTableData(data?.payload));
			} else if (isEmpty(data?.payload)) {
				setTableData([]);
			}
		},
	});

	const urlQuery = useUrlQuery();
	const filters = useMemo(() => makeFilters(urlQuery), [urlQuery]);

	useEffect(() => {
		getOverviewData({
			start: minTime,
			end: maxTime,
			filters: {
				items: filters,
				op: 'AND',
			},
		});
	}, [getOverviewData, minTime, maxTime, filters]);

	const { draggedColumns, onDragColumns } = useDragColumns<RowData>(
		LOCALSTORAGE.CELERY_OVERVIEW_COLUMNS,
	);

	const [searchText, setSearchText] = useState('');
	const searchInput = useRef<InputRef>(null);

	const handleSearch = (
		selectedKeys: string[],
		confirm: FilterDropdownProps['confirm'],
	): void => {
		confirm();
		setSearchText(selectedKeys[0]);
	};

	const handleReset = (
		clearFilters: () => void,
		confirm: FilterDropdownProps['confirm'],
	): void => {
		clearFilters();
		setSearchText('');
		confirm();
	};

	// Add defaultSorting state
	const [sortedInfo, setSortedInfo] = useState<{
		columnKey: string;
		order: 'ascend' | 'descend';
	}>({
		columnKey: 'error_percentage',
		order: 'descend',
	});

	const columns = useMemo(
		() =>
			getDraggedColumns<RowData>(
				getColumns(tableData).map((item) => ({
					...item,
					...getColumnSearchProps(
						searchInput,
						handleReset,
						handleSearch,
						item.key?.toString(),
					),
					// Only set defaultSortOrder for error_percentage, but allow sorting for all columns
					...(item.key === 'error_percentage' && {
						defaultSortOrder: 'descend',
					}),
					sortOrder: sortedInfo.columnKey === item.key ? sortedInfo.order : null,
				})),
				draggedColumns,
			),
		[tableData, draggedColumns, sortedInfo],
	);
	const handleDragColumn = useCallback(
		(fromIndex: number, toIndex: number) =>
			onDragColumns(columns, fromIndex, toIndex),
		[columns, onDragColumns],
	);

	const paginationConfig = useMemo(
		() =>
			tableData?.length > INITIAL_PAGE_SIZE && {
				pageSize: INITIAL_PAGE_SIZE,
				showTotal: showPaginationItem,
				showSizeChanger: false,
				hideOnSinglePage: true,
			},
		[tableData],
	);

	const handleRowClick = (record: RowData): void => {
		onRowClick(record);
		logEvent('MQ Overview Page: Right Panel', { ...record });
	};

	const getFilteredData = useCallback(
		(data: RowData[]): RowData[] => {
			if (!searchText) return data;

			const searchLower = searchText.toLowerCase();
			return data.filter((record) =>
				Object.values(record).some(
					(value) =>
						value !== undefined &&
						value.toString().toLowerCase().includes(searchLower),
				),
			);
		},
		[searchText],
	);

	const filteredData = useMemo(() => getFilteredData(tableData), [
		getFilteredData,
		tableData,
	]);

	const prevTableDataRef = useRef<string>();

	useEffect(() => {
		if (tableData.length > 0) {
			const currentTableData = JSON.stringify(tableData);

			if (currentTableData !== prevTableDataRef.current) {
				logEvent(`MQ Overview Page: List rendered`, {
					dataRender: tableData.length,
				});
				prevTableDataRef.current = currentTableData;
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(tableData)]);

	return (
		<div className="celery-overview-table-container">
			<Input.Search
				placeholder="Search across all columns"
				onChange={(e): void => setSearchText(e.target.value)}
				value={searchText}
				allowClear
			/>
			<ResizeTable
				className="celery-overview-table"
				pagination={paginationConfig}
				size="middle"
				columns={columns}
				dataSource={filteredData}
				bordered={false}
				loading={{
					spinning: isLoading,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText: isLoading ? null : <Typography.Text>No data</Typography.Text>,
				}}
				scroll={{ x: true }}
				showSorterTooltip
				onDragColumn={handleDragColumn}
				onRow={(record): { onClick: () => void; className: string } => ({
					onClick: (): void => handleRowClick(record),
					className: 'clickable-row',
				})}
				tableLayout="fixed"
				onChange={(_pagination, _filters, sorter): void => {
					setSortedInfo({
						columnKey: (sorter as { columnKey: string }).columnKey,
						order: (sorter as { order: 'ascend' | 'descend' }).order,
					});
				}}
			/>
		</div>
	);
}
