import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
	getQueueOverview,
	QueueOverviewResponse,
} from 'api/messagingQueues/celery/getQueueOverview';
import { convertToTitleCase } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

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

function getColumns(data: RowData[]): ColumnsType<RowData> {
	if (data?.length === 0) {
		return [];
	}

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = Object.keys(data[0])
		.filter((key) => key !== 'key')
		.map((key) => ({
			title: convertToTitleCase(key),
			dataIndex: key,
			key,
		}));

	return columns;
}

function getTableData(data: QueueOverviewResponse['data']): RowData[] {
	if (data?.length === 0) {
		return [];
	}

	const tableData: RowData[] =
		data?.map(
			(row, index: number): RowData => {
				const rowData: Record<string, string | number> = {};
				Object.entries(row.data).forEach(([key, value]) => {
					if (typeof value === 'string' || typeof value === 'number') {
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

	const { mutate: getOverviewData, isLoading } = useMutation(getQueueOverview, {
		onSuccess: (data) => {
			if (data?.payload) {
				setTableData(getTableData(data?.payload));
			}
		},
	});
	useEffect(() => {
		getOverviewData({
			start: 1737415533000000000,
			end: 1737417333000000000,
			filters: {
				items: [],
				op: 'AND',
			},
		});
	}, [getOverviewData]);

	console.log(tableData);

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
			<Table
				className="celery-overview-table"
				pagination={paginationConfig}
				size="middle"
				columns={getColumns(tableData)}
				dataSource={tableData}
				bordered={false}
				loading={isLoading}
			/>
		</div>
	);
}
