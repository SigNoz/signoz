/* eslint-disable sonarjs/no-duplicate-string */
import '../MQDetails.style.scss';

import { Table, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { MessagingQueueServicePayload } from 'api/messagingQueues/getConsumerLagDetails';
import { getKafkaSpanEval } from 'api/messagingQueues/getKafkaSpanEval';
import axios from 'axios';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import { isNumber } from 'lodash-es';
import {
	convertToTitleCase,
	MessagingQueuesViewType,
	RowData,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	convertToMilliseconds,
	DropRateAPIResponse,
	DropRateResponse,
} from './dropRateViewUtils';
import EvaluationTimeSelector from './EvaluationTimeSelector';

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

// eslint-disable-next-line sonarjs/cognitive-complexity
export function getColumns(
	data: DropRateResponse[],
	visibleCounts: Record<number, number>,
	handleShowMore: (index: number) => void,
): any[] {
	if (data?.length === 0) {
		return [];
	}

	const columnsOrder = [
		'producer_service',
		'consumer_service',
		'breach_percentage',
		'top_traceIDs',
		'breached_spans',
		'total_spans',
	];

	const columns: {
		title: string;
		dataIndex: string;
		key: string;
	}[] = columnsOrder.map((column) => ({
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
				const remainingCount = (text || []).length - visibleCount;

				return (
					<div>
						<div className="trace-id-list">
							{visibleItems.map((item, idx) => {
								const shouldShowMore = remainingCount > 0 && idx === visibleCount - 1;
								return (
									<div key={item} className="traceid-style">
										<Typography.Text
											key={item}
											className="traceid-text"
											onClick={(): void => {
												window.open(`${ROUTES.TRACE}/${item}`, '_blank');
												logEvent(`MQ Kafka: Drop Rate - traceid navigation`, {
													item,
												});
											}}
										>
											{item}
										</Typography.Text>
										{shouldShowMore && (
											<Typography
												onClick={(): void => handleShowMore(index)}
												className="remaing-count"
											>
												+ {remainingCount} more
											</Typography>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);
			}

			if (column === 'consumer_service' || column === 'producer_service') {
				return (
					<Typography.Link
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							window.open(`/services/${encodeURIComponent(text)}`, '_blank');
						}}
					>
						{text}
					</Typography.Link>
				);
			}

			if (column === 'breach_percentage' && text) {
				if (!isNumber(text))
					return <Typography.Text>{text.toString()}</Typography.Text>;
				return (
					<Typography.Text>
						{(typeof text === 'string' ? parseFloat(text) : text).toFixed(2)} %
					</Typography.Text>
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
	const [data, setData] = useState<
		DropRateAPIResponse['data']['result'][0]['list']
	>([]);
	const [interval, setInterval] = useState<string>('');

	const [visibleCounts, setVisibleCounts] = useState<Record<number, number>>({});

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

	const evaluationTime = useMemo(() => convertToMilliseconds(interval), [
		interval,
	]);
	const tableApiPayload: MessagingQueueServicePayload = useMemo(
		() => ({
			start: minTime,
			end: maxTime,
			evalTime: evaluationTime * 1e6,
		}),
		[evaluationTime, maxTime, minTime],
	);

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
				setData(data.payload.result[0].list);
			}
		},
		onError: handleOnError,
	});

	useEffect(() => {
		if (data?.length > 0) {
			setColumns(getColumns(data, visibleCounts, handleShowMore));
			setTableData(getTableData(data));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, visibleCounts]);

	useEffect(() => {
		if (evaluationTime) {
			getViewDetails(tableApiPayload);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minTime, maxTime, evaluationTime]);

	const prevTableDataRef = useRef<string>();

	useEffect(() => {
		if (tableData.length > 0) {
			const currentTableData = JSON.stringify(tableData);

			if (currentTableData !== prevTableDataRef.current) {
				logEvent(`MQ Kafka: Drop Rate View`, {
					dataRender: tableData.length,
				});
				prevTableDataRef.current = currentTableData;
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(tableData)]);

	return (
		<div className={cx('mq-overview-container', 'droprate-view')}>
			<div className="mq-overview-title">
				{MessagingQueuesViewType.dropRate.label}
				<EvaluationTimeSelector setInterval={setInterval} />
			</div>
			<Table
				className={cx('mq-table', 'pagination-left')}
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
