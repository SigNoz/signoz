/* eslint-disable sonarjs/no-duplicate-string */
import '../MQDetails.style.scss';

import { Table, Typography } from 'antd';
import axios from 'axios';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
// import useUrlQuery from 'hooks/useUrlQuery';
import {
	convertToTitleCase,
	MessagingQueuesViewType,
	RowData,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
// import { useHistory } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { MessagingQueueServicePayload } from '../MQTables/getConsumerLagDetails';
import { getKafkaSpanEval } from '../MQTables/getKafkaSpanEval';

const dummyData = [
	{
		timestamp: '0001-01-01T00:00:00Z',
		data: {
			breach_percentage: 60.24912135621253,
			breached_spans: 11657,
			consumer_service: 'consumer-svc2',
			producer_service: 'producer-svc2',
			top_traceIDs: [
				'c07c13ef66cc07a9937aed42af37c904',
				'fa58706f5c7f76094380d7aa9043c764',
				'cbb9a59066c274af611c0f66a994d340',
				'9e36db8953e97706032e99b75ad04ca6',
				'a92ea5cf3f7e076e7434892df670e3a0',
				'6664e5d772295cf89f80db198679052c',
				'787c0134cd5a20201b7e0ab6eed4f5b2',
				'213a7e98a157a95fea101c80c8648eea',
				'5f671e043caf05abf22791199c2870ed',
				'3121cf93dcdfe1e9f4934db4f8685d99',
			],
			total_spans: 19348,
		},
	},
	{
		timestamp: '0001-01-01T00:00:00Z',
		data: {
			breach_percentage: 60.24912135621253,
			breached_spans: 11657,
			consumer_service: 'consumer-svc2',
			producer_service: 'producer-svc2',
			top_traceIDs: [
				'c07c13ef66cc07a9937aed42af37c904',
				'fa58706f5c7f76094380d7aa9043c764',
				'cbb9a59066c274af611c0f66a994d340',
				'9e36db8953e97706032e99b75ad04ca6',
				'a92ea5cf3f7e076e7434892df670e3a0',
				'6664e5d772295cf89f80db198679052c',
				'787c0134cd5a20201b7e0ab6eed4f5b2',
				'213a7e98a157a95fea101c80c8648eea',
				'5f671e043caf05abf22791199c2870ed',
				'3121cf93dcdfe1e9f4934db4f8685d99',
			],
			total_spans: 19348,
		},
	},
	{
		timestamp: '0001-01-01T00:00:00Z',
		data: {
			breach_percentage: 60.24912135621253,
			breached_spans: 11657,
			consumer_service: 'consumer-svc2',
			producer_service: 'producer-svc2',
			top_traceIDs: [
				'c07c13ef66cc07a9937aed42af37c904',
				'fa58706f5c7f76094380d7aa9043c764',
				'cbb9a59066c274af611c0f66a994d340',
				'9e36db8953e97706032e99b75ad04ca6',
				'a92ea5cf3f7e076e7434892df670e3a0',
				'6664e5d772295cf89f80db198679052c',
				'787c0134cd5a20201b7e0ab6eed4f5b2',
				'213a7e98a157a95fea101c80c8648eea',
				'5f671e043caf05abf22791199c2870ed',
				'3121cf93dcdfe1e9f4934db4f8685d99',
			],
			total_spans: 19348,
		},
	},
];

interface DropRateResponse {
	timestamp: string;
	data: {
		breach_percentage: number;
		breached_spans: number;
		consumer_service: string;
		producer_service: string;
		top_traceIDs: string[];
		total_spans: number;
	};
}

export function getTableData(data: DropRateResponse[]): RowData[] {
	if (data?.length === 0) {
		return [];
	}

	const tableData: RowData[] =
		data?.map(
			(row: DropRateResponse, index: number): RowData => ({
				...(row.data as any), // todo-sagar
				key: index,
			}),
		) || [];

	return tableData;
}

export function getColumns(
	data: DropRateResponse[],
	visibleCounts: Record<number, number>,
	handleShowMore: (index: number) => void,
): any[] {
	if (data?.length === 0) {
		return [];
	}

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = Object.keys(data[0].data).map((column) => ({
		title: convertToTitleCase(column),
		dataIndex: column,
		key: column,
		render: (
			text: string | string[],
			_record: any,
			index: number,
		): JSX.Element => {
			if (Array.isArray(text)) {
				const visibleCount = visibleCounts[index] || 4;
				const visibleItems = text.slice(0, visibleCount);
				const remainingCount = text.length - visibleCount;

				console.log(visibleCount, visibleItems, remainingCount);

				return (
					<div>
						<div className="trace-id-list">
							{visibleItems.map((item, idx) => {
								const shouldShowMore = remainingCount > 0 && idx === visibleCount - 1;
								return (
									<div key={item} className="traceid-style">
										<Typography.Text key={item} className="traceid-text">
											{item}
										</Typography.Text>
										{shouldShowMore && (
											<Typography.Link onClick={(): void => handleShowMore(index)}>
												+ {remainingCount} more
											</Typography.Link>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);
			}

			return <Typography.Text>{text}</Typography.Text>;
		},
	}));

	return columns;
}

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography.Text className="numbers">
			{range[0]} &#8212; {range[1]}
		</Typography.Text>
		<Typography.Text className="total"> of {total}</Typography.Text>
	</>
);

function DropRateView(): JSX.Element {
	const [columns, setColumns] = useState<any[]>([]);
	const [tableData, setTableData] = useState<any[]>([]);
	const { notifications } = useNotifications();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [data, setData] = useState<DropRateResponse[]>([]);

	const [visibleCounts, setVisibleCounts] = useState<Record<number, number>>({});

	// const urlQuery = useUrlQuery();
	// const history = useHistory();

	const paginationConfig = useMemo(
		() =>
			tableData?.length > 10 && {
				pageSize: 10,
				showTotal: showPaginationItem,
				showSizeChanger: false,
				hideOnSinglePage: true,
			},
		[tableData],
	);

	const tableApiPayload: MessagingQueueServicePayload = {
		start: minTime,
		end: maxTime,
		evalTime: 2363404,
	};

	const handleOnError = (error: Error): void => {
		notifications.error({
			message: axios.isAxiosError(error) ? error?.message : SOMETHING_WENT_WRONG,
		});
	};

	const handleShowMore = (index: number): void => {
		setVisibleCounts((prevCounts) => ({
			...prevCounts,
			[index]: (prevCounts[index] || 4) + 4,
		}));
	};

	const { mutate: getViewDetails, isLoading } = useMutation(getKafkaSpanEval, {
		onSuccess: (data) => {
			if (data.payload) {
				setData(dummyData);
			}
		},
		onError: handleOnError,
	});

	useEffect(() => {
		if (data.length > 0) {
			setColumns(getColumns(data, visibleCounts, handleShowMore));
			setTableData(getTableData(data));
		}
	}, [data, visibleCounts]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => getViewDetails(tableApiPayload), [minTime, maxTime]);

	return (
		<div className={cx('mq-overview-container', 'droprate-view')}>
			<div className="mq-overview-title">
				{MessagingQueuesViewType.dropRate.label}
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
		</div>
	);
}

export default DropRateView;
