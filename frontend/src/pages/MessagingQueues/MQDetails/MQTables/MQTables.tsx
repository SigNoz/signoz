/* eslint-disable react/require-default-props */
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
	MessagingQueuesViewType,
	RowData,
	SelectedTimelineQuery,
	setConfigDetail,
	setSelectedTimelineQuery,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	ConsumerLagPayload,
	getConsumerLagDetails,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';
import { getPartitionLatencyDetails } from './getPartitionLatencyDetails';

// eslint-disable-next-line sonarjs/cognitive-complexity
export function getColumns(
	data: MessagingQueuesPayloadProps['payload'],
	history: History<unknown>,
): RowData[] {
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
	selectedView,
	tableApiPayload,
	tableApi,
	type = 'Main',
}: {
	currentTab?: ConsumerLagDetailType;
	selectedView: string;
	tableApiPayload?: ConsumerLagPayload;
	tableApi?: (
		props: ConsumerLagPayload,
	) => Promise<
		SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
	>;
	type?: 'Main' | 'Detail';
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

	const { minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
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

	const selectedViewAPI = useMemo(() => {
		if (tableApi) {
			return tableApi;
		}
		if (selectedView === MessagingQueuesViewType.partitionLatency.value) {
			return getPartitionLatencyDetails;
		}
		return getConsumerLagDetails;
	}, [selectedView, tableApi]);

	const { mutate: getViewDetails, isLoading } = useMutation(selectedViewAPI, {
		onSuccess: (data) => {
			if (data.payload) {
				setColumns(getColumns(data?.payload, history));
				setTableData(getTableData(data?.payload));
			}
		},
		onError: handleConsumerDetailsOnError,
	});

	const location = useLocation();

	const isLogEventCalled = useRef<boolean>(false);

	const isEmptyDetails = (timelineQueryData: SelectedTimelineQuery): boolean => {
		const isEmptyDetail =
			isEmpty(timelineQueryData) ||
			(!timelineQueryData?.group &&
				!timelineQueryData?.topic &&
				!timelineQueryData?.partition);

		if (!isEmptyDetail && !isLogEventCalled.current && currentTab) {
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

	useEffect(
		() => {
			if (tableApiPayload) {
				getViewDetails(tableApiPayload);
			}
			if (!tableApiPayload && !isEmptyDetails(timelineQueryData)) {
				getViewDetails(props);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentTab, props, selectedView, tableApiPayload],
	);

	const [selectedRowKey, setSelectedRowKey] = useState<React.Key>();
	const [, setSelectedRows] = useState<any>();

	const onRowClick = (record: { [key: string]: string }): void => {
		const selectedKey = record.key;

		if (selectedKey === selectedRowKey) {
			setSelectedRowKey(undefined);
			setSelectedRows({});
		} else {
			setSelectedRowKey(selectedKey);
			setSelectedRows(record);

			if (!isEmpty(record)) {
				setConfigDetail(urlQuery, location, history, record);
				setSelectedTimelineQuery(
					urlQuery,
					minTime / 1e9,
					location,
					history,
					record,
				);
			}
		}
	};

	return (
		<div className="mq-tables-container">
			{isEmptyDetails(timelineQueryData) && type !== 'Main' ? (
				<div className="no-data-style">
					<Typography.Text>
						{selectedView === MessagingQueuesViewType.consumerLag.value
							? 'Click on a co-ordinate above to see the details'
							: 'Click on a row above to see the details'}
					</Typography.Text>
					<Skeleton />
				</div>
			) : (
				<>
					{currentTab && type === 'Detail' && (
						<div className="mq-table-title">
							{ConsumerLagDetailTitle[currentTab]}
							<div className="mq-table-subtitle">{`${timelineQueryData?.group || ''} ${
								timelineQueryData?.topic || ''
							} ${timelineQueryData?.partition || ''}`}</div>
						</div>
					)}
					<Table
						className="mq-table"
						pagination={paginationConfig}
						size="middle"
						columns={columns}
						dataSource={tableData}
						bordered={false}
						loading={isLoading}
						onRow={(record): any =>
							type !== 'Detail'
								? {
										onClick: (): void => onRowClick(record),
								  }
								: {}
						}
						rowClassName={(record): any =>
							record.key === selectedRowKey ? 'ant-table-row-selected' : ''
						}
					/>
				</>
			)}
		</div>
	);
}

export default MessagingQueuesTable;
