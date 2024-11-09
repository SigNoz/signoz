/* eslint-disable no-nested-ternary */
/* eslint-disable react/require-default-props */
import './MQTables.styles.scss';

import { Skeleton, Table, Typography } from 'antd';
import axios from 'axios';
import { isNumber } from 'chart.js/helpers';
import cx from 'classnames';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { History } from 'history';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import {
	ConsumerLagDetailTitle,
	convertToTitleCase,
	MessagingQueueServiceDetailType,
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	RowData,
	SelectedTimelineQuery,
	setConfigDetail,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

const INITIAL_PAGE_SIZE = 10;

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

// eslint-disable-next-line sonarjs/cognitive-complexity
function MessagingQueuesTable({
	currentTab,
	selectedView,
	tableApiPayload,
	tableApi,
	validConfigPresent = false,
	type = 'Detail',
}: {
	currentTab?: MessagingQueueServiceDetailType;
	selectedView: MessagingQueuesViewTypeOptions;
	tableApiPayload?: MessagingQueueServicePayload;
	tableApi: (
		props: MessagingQueueServicePayload,
	) => Promise<
		SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
	>;
	validConfigPresent?: boolean;
	type?: 'Detail' | 'Overview';
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

	const configDetails = decodeURIComponent(
		urlQuery.get(QueryParams.configDetail) || '',
	);

	const configDetailQueryData: {
		[key: string]: string;
	} = useMemo(() => (configDetails ? JSON.parse(configDetails) : {}), [
		configDetails,
	]);

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

	const handleConsumerDetailsOnError = (error: Error): void => {
		notifications.error({
			message: axios.isAxiosError(error) ? error?.message : SOMETHING_WENT_WRONG,
		});
	};

	const { mutate: getViewDetails, isLoading, error, isError } = useMutation(
		tableApi,
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

	useEffect(
		() => {
			if (validConfigPresent && tableApiPayload) {
				getViewDetails(tableApiPayload);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentTab, selectedView, tableApiPayload],
	);

	const [selectedRowKey, setSelectedRowKey] = useState<React.Key>();
	const [, setSelectedRows] = useState<any>();
	const location = useLocation();

	const onRowClick = (record: { [key: string]: string }): void => {
		const selectedKey = record.key;

		if (`${selectedKey}_${selectedView}` === selectedRowKey) {
			setSelectedRowKey(undefined);
			setSelectedRows({});
			setConfigDetail(urlQuery, location, history, {});
		} else {
			setSelectedRowKey(`${selectedKey}_${selectedView}`);
			setSelectedRows(record);

			if (!isEmpty(record)) {
				setConfigDetail(urlQuery, location, history, record);
			}
		}
	};

	const subtitle =
		selectedView === MessagingQueuesViewType.consumerLag.value
			? `${timelineQueryData?.group || ''} ${timelineQueryData?.topic || ''} ${
					timelineQueryData?.partition || ''
			  }`
			: `${configDetailQueryData?.service_name || ''} ${
					configDetailQueryData?.topic || ''
			  } ${configDetailQueryData?.partition || ''}`;

	return (
		<div className="mq-tables-container">
			{!validConfigPresent ? (
				<div className="no-data-style">
					<Typography.Text>
						{selectedView === MessagingQueuesViewType.consumerLag.value
							? 'Click on a co-ordinate above to see the details'
							: 'Click on a row above to see the details'}
					</Typography.Text>
					<Skeleton />
				</div>
			) : isError ? (
				<div className="no-data-style">
					<Typography.Text>{error?.message || SOMETHING_WENT_WRONG}</Typography.Text>
				</div>
			) : (
				<>
					{currentTab && (
						<div className="mq-table-title">
							{ConsumerLagDetailTitle[currentTab]}
							<div className="mq-table-subtitle">{subtitle}</div>
						</div>
					)}
					<Table
						className={cx(
							'mq-table',
							type !== 'Detail' ? 'mq-overview-row-clickable' : 'pagination-left',
						)}
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
							`${record.key}_${selectedView}` === selectedRowKey
								? 'ant-table-row-selected'
								: ''
						}
					/>
				</>
			)}
		</div>
	);
}

export default MessagingQueuesTable;
