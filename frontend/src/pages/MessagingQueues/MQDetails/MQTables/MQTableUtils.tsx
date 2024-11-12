import { Typography } from 'antd';
import dayjs from 'dayjs';
import { History } from 'history';
import {
	convertToTitleCase,
	RowData,
} from 'pages/MessagingQueues/MessagingQueuesUtils';

interface ProducerLatencyOverviewColumn {
	timestamp: string;
	data: {
		[key: string]: number | string;
	};
}

export interface TopicThroughputProducerOverviewResponse {
	status: string;
	payload: {
		resultType: string;
		result: {
			queryName: string;
			list: ProducerLatencyOverviewColumn[];
		}[];
	};
}

export const getColumnsForProducerLatencyOverview = (
	list: ProducerLatencyOverviewColumn[],
	history: History<unknown>,
): RowData[] => {
	if (list?.length === 0) {
		return [];
	}

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = Object.keys(list[0].data)?.map((column) => ({
		title: convertToTitleCase(column),
		dataIndex: column,
		key: column,
		render: (data: string | number): JSX.Element => {
			if (column === 'service_name') {
				return (
					<Typography.Link
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							history.push(`/services/${encodeURIComponent(data as string)}`);
						}}
					>
						{data}
					</Typography.Link>
				);
			}

			if (column === 'ts') {
				const date =
					typeof data === 'string'
						? dayjs(data).format('YYYY-MM-DD HH:mm:ss.SSS')
						: dayjs(data / 1e6).format('YYYY-MM-DD HH:mm:ss.SSS');
				return <Typography.Text>{date}</Typography.Text>;
			}

			if (typeof data === 'number') {
				return <Typography.Text>{data.toFixed(3)}</Typography.Text>;
			}

			return <Typography.Text>{data}</Typography.Text>;
		},
	}));

	return columns;
};

export const getTableDataForProducerLatencyOverview = (
	list: ProducerLatencyOverviewColumn[],
): RowData[] => {
	if (list?.length === 0) {
		return [];
	}

	const tableData: RowData[] = list?.map(
		(row, index: number): RowData => ({
			...row.data,
			key: index,
		}),
	);

	return tableData;
};
