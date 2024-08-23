import './MQTables.styles.scss';

import { Table, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import {
	ConsumerLagDetailTitle,
	ConsumerLagDetailType,
	convertToTitleCase,
	RowData,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import {
	ConsumerLagPayload,
	getConsumerLagDetails,
} from './getConsumerLagDetails';

export function getColumns(data: any): any[] {
	if (data?.length === 0) {
		return [];
	}

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = data?.data.result?.[0]?.table?.columns.map((clm: any) => ({
		title: convertToTitleCase(clm.name),
		dataIndex: clm.name,
		key: clm.name,
	}));

	console.log(columns);
	return columns;
}

export function getTableData(data: any): any[] {
	if (data?.length === 0) {
		return [];
	}

	const tableData: RowData[] = data?.data.result?.[0]?.table?.rows.map(
		(row: any, index: number): RowData => ({
			key: index,
			...row.data,
		}),
	);

	console.log(tableData);
	return tableData;
}

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography.Text className="numbers">
			{range[0]} &#8212; {range[1]}
		</Typography.Text>
		<Typography.Text className="total"> of {total}</Typography.Text>
	</>
);

function MessagingQueuesTable({
	currentTab,
}: {
	currentTab: ConsumerLagDetailType;
}): JSX.Element {
	const [columns, setColumns] = useState<any[]>([]);
	const [tableData, setTableData] = useState<any[]>([]);
	const { notifications } = useNotifications();

	const paginationConfig = useMemo(
		() =>
			tableData?.length > 20 && {
				pageSize: 20,
				showTotal: showPaginationItem,
				showSizeChanger: false,
				hideOnSinglePage: true,
			},
		[tableData],
	);

	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		// interval: globalSelectedInterval,
	});

	const props: ConsumerLagPayload = useMemo(
		() => ({
			start: parseInt(start, 10) * 1e3,
			end: parseInt(end, 10) * 1e3,
			variables: {
				partition: '0',
				topic: 'topic1',
				consumer_group: 'cg1',
			},
			detailType: currentTab,
		}),
		[currentTab, end, start],
	);

	const handleConsumerDetailsOnError = (): void => {
		notifications.error({
			message: SOMETHING_WENT_WRONG,
		});
	};

	const { mutate: getConsumerDetails } = useMutation(getConsumerLagDetails, {
		onSuccess: (data) => {
			setColumns(getColumns(data?.payload));
			setTableData(getTableData(data?.payload));
		},
		onError: handleConsumerDetailsOnError,
		// onSettled: (data, error) => {
		// 	console.log(data, error);
		// },
	});

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => getConsumerDetails(props), [currentTab, props]);

	return (
		<div className="mq-tables-container">
			<div className="mq-table-title">
				{ConsumerLagDetailTitle[currentTab]}
				<div className="mq-table-subtitle">Group B-Topic 2-Partition 1</div>
				{/* Todo-sagar */}
			</div>
			<Table
				className="mq-table"
				pagination={paginationConfig}
				size="middle"
				columns={columns}
				dataSource={tableData}
				bordered={false}
			/>
		</div>
	);
}

export default MessagingQueuesTable;
