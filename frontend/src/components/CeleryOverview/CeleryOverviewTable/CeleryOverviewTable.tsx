import './CeleryOverviewTable.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Progress, Spin, TableColumnsType, Tooltip, Typography } from 'antd';
import {
	getQueueOverview,
	QueueOverviewResponse,
} from 'api/messagingQueues/celery/getQueueOverview';
import { isNumber } from 'chart.js/helpers';
import { ResizeTable } from 'components/ResizeTable';
import { LOCALSTORAGE } from 'constants/localStorage';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
			sorter: (a: RowData, b: RowData): number =>
				String(a.error_percentage).localeCompare(String(b.error_percentage)),
			render: ProgressRender,
		},
		{
			title: 'LATENCY (P95)',
			dataIndex: 'p95_latency',
			key: 'p95_latency',
			ellipsis: {
				showTitle: false,
			},
			width: 100,
			sorter: (a: RowData, b: RowData): number =>
				String(a.p95_latency).localeCompare(String(b.p95_latency)),
			render: (value: number | string): string => {
				if (!isNumber(value)) return value.toString();
				return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
			},
		},
		{
			title: 'THROUGHPUT',
			dataIndex: 'throughput',
			key: 'throughput',
			ellipsis: {
				showTitle: false,
			},
			width: 100,
			sorter: (a: RowData, b: RowData): number =>
				String(a.throughput).localeCompare(String(b.throughput)),
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

export default function CeleryOverviewTable(): JSX.Element {
	const [tableData, setTableData] = useState<RowData[]>([]);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { mutate: getOverviewData, isLoading } = useMutation(getQueueOverview, {
		onSuccess: (data) => {
			if (data?.payload) {
				setTableData(getTableData(data?.payload));
			}
		},
	});
	useEffect(() => {
		getOverviewData({
			start: minTime,
			end: maxTime,
			filters: {
				items: [],
				op: 'AND',
			},
		});
	}, [getOverviewData, minTime, maxTime]);

	const { draggedColumns, onDragColumns } = useDragColumns<RowData>(
		LOCALSTORAGE.CELERY_OVERVIEW_COLUMNS,
	);

	const columns = useMemo(
		() => getDraggedColumns<RowData>(getColumns(tableData), draggedColumns),
		[tableData, draggedColumns],
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

	return (
		<div style={{ width: '100%' }}>
			<ResizeTable
				className="celery-overview-table"
				pagination={paginationConfig}
				size="middle"
				columns={columns}
				dataSource={tableData}
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
			/>
		</div>
	);
}
