import './MQTables.styles.scss';

import { Skeleton, Table, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import axios from 'axios';
import { isNumber } from 'chart.js/helpers';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { History } from 'history';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import {
	ConsumerLagDetailTitle,
	ConsumerLagDetailType,
	convertToTitleCase,
	RowData,
	SelectedTimelineQuery,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';

import {
	ConsumerLagPayload,
	getConsumerLagDetails,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

// eslint-disable-next-line sonarjs/cognitive-complexity
export function getColumns(
	data: MessagingQueuesPayloadProps['payload'],
	history: History<unknown>,
): RowData[] {
	console.log(data);
	if (data?.result?.length === 0) {
		return [];
	}

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = data?.result?.[0]?.table?.columns.map((column) => ({
		title: convertToTitleCase(column.name),
		dataIndex: column.name,
		key: column.name,
		render: [
			'p99',
			'error_rate',
			'throughput',
			'avg_msg_size',
			'error_percentage',
		].includes(column.name)
			? (value: number | string): string => {
					if (!isNumber(value)) return value.toString();
					return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
			  }
			: (text: string): ColumnTypeRender<Record<string, unknown>> => ({
					children:
						column.name === 'service_name' ? (
							<Typography.Link
								onClick={(e): void => {
									e.preventDefault();
									e.stopPropagation();
									history.push(`/services/${encodeURIComponent(text)}`);
								}}
							>
								{text}
							</Typography.Link>
						) : (
							<Typography.Text>{text}</Typography.Text>
						),
			  }),
	}));

	return columns;
}

export function getTableData(
	data: MessagingQueuesPayloadProps['payload'],
): RowData[] {
	if (data?.result?.length === 0) {
		return [];
	}

	const tableData: RowData[] =
		data?.result?.[0]?.table?.rows?.map(
			(row, index: number): RowData => ({
				...row.data,
				key: index,
			}),
		) || [];

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
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const timelineQuery = decodeURIComponent(
		urlQuery.get(QueryParams.selectedTimelineQuery) || '',
	);
	const timelineQueryData: SelectedTimelineQuery = useMemo(
		() => (timelineQuery ? JSON.parse(timelineQuery) : {}),
		[timelineQuery],
	);

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

	const props: ConsumerLagPayload = useMemo(
		() => ({
			start: (timelineQueryData?.start || 0) * 1e9,
			end: (timelineQueryData?.end || 0) * 1e9,
			variables: {
				partition: timelineQueryData?.partition,
				topic: timelineQueryData?.topic,
				consumer_group: timelineQueryData?.group,
			},
			detailType: currentTab,
		}),
		[currentTab, timelineQueryData],
	);

	const handleConsumerDetailsOnError = (error: Error): void => {
		notifications.error({
			message: axios.isAxiosError(error) ? error?.message : SOMETHING_WENT_WRONG,
		});
	};

	const { mutate: getConsumerDetails, isLoading } = useMutation(
		getConsumerLagDetails,
		{
			onSuccess: (data) => {
				if (data.payload) {
					setColumns(getColumns(data?.payload, history));
					setTableData(getTableData(data?.payload));
				}
			},
			onError: handleConsumerDetailsOnError,
		},
	);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => getConsumerDetails(props), [currentTab, props]);

	const isLogEventCalled = useRef<boolean>(false);

	const isEmptyDetails = (timelineQueryData: SelectedTimelineQuery): boolean => {
		const isEmptyDetail =
			isEmpty(timelineQueryData) ||
			(!timelineQueryData?.group &&
				!timelineQueryData?.topic &&
				!timelineQueryData?.partition);

		if (!isEmptyDetail && !isLogEventCalled.current) {
			logEvent('Messaging Queues: More details viewed', {
				'tab-option': ConsumerLagDetailTitle[currentTab],
				variables: {
					group: timelineQueryData?.group,
					topic: timelineQueryData?.topic,
					partition: timelineQueryData?.partition,
				},
			});
			isLogEventCalled.current = true;
		}
		return isEmptyDetail;
	};

	return (
		<div className="mq-tables-container">
			{isEmptyDetails(timelineQueryData) ? (
				<div className="no-data-style">
					<Typography.Text>
						Click on a co-ordinate above to see the details
					</Typography.Text>
					<Skeleton />
				</div>
			) : (
				<>
					<div className="mq-table-title">
						{ConsumerLagDetailTitle[currentTab]}
						<div className="mq-table-subtitle">{`${timelineQueryData?.group || ''} ${
							timelineQueryData?.topic || ''
						} ${timelineQueryData?.partition || ''}`}</div>
					</div>
					<Table
						className="mq-table"
						pagination={paginationConfig}
						size="middle"
						columns={columns}
						dataSource={tableData}
						bordered={false}
						loading={isLoading}
					/>
				</>
			)}
		</div>
	);
}

export default MessagingQueuesTable;
