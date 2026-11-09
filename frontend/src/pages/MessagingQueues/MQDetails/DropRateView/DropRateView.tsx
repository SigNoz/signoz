import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Table } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { MessagingQueueServicePayload } from 'api/messagingQueues/getConsumerLagDetails';
import { getKafkaSpanEval } from 'api/messagingQueues/getKafkaSpanEval';
import axios from 'axios';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { useNotifications } from 'hooks/useNotifications';
import { isNumber } from 'lodash-es';
import {
	convertToTitleCase,
	MessagingQueuesViewType,
	RowData,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { withBasePath } from 'utils/basePath';

import {
	convertToMilliseconds,
	DropRateAPIResponse,
	DropRateResponse,
} from './dropRateViewUtils';
import EvaluationTimeSelector from './EvaluationTimeSelector';

import '../MQDetails.style.scss';

export function getTableData(data: DropRateResponse[]): RowData[] {
	if (data?.length === 0) {
		return [];
	}

	const tableData: RowData[] =
		data?.map((row: DropRateResponse, index: number): RowData => ({
			...(row.data as any), // todo-sagar
			key: index,
		})) || [];

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
										<span className="traceid-text">
											<Typography.Link
												variant="paragraph"
												size="base"
												weight="regular"
												textOverflow="wrap"
												href={withBasePath(
													buildRoutePath(ROUTES.TRACE_DETAIL, { id: item }),
												)}
												target="_blank"
												onClick={(): void => {
													void logEvent(`MQ Kafka: Drop Rate - traceid navigation`, {
														item,
													});
												}}
											>
												{item}
											</Typography.Link>
										</span>
										{shouldShowMore && (
											<Button
												variant="link"
												color="secondary"
												size="sm"
												onClick={(): void => handleShowMore(index)}
											>
												+ {remainingCount} more
											</Button>
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
						variant="paragraph"
						size="base"
						weight="regular"
						textOverflow="wrap"
						href={withBasePath(`/services/${encodeURIComponent(text)}`)}
						target="_blank"
						onClick={(e): void => e.stopPropagation()}
					>
						{text}
					</Typography.Link>
				);
			}

			if (column === 'breach_percentage' && text) {
				if (!isNumber(text)) {
					return (
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{text.toString()}
						</Typography>
					);
				}
				return (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						{(typeof text === 'string' ? parseFloat(text) : text).toFixed(2)} %
					</Typography>
				);
			}

			return (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{text}
				</Typography>
			);
		},
	}));

	return columns;
}

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			{range[0]} &#8212; {range[1]}
		</Typography>
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			{' '}
			of {total}
		</Typography>
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

	const evaluationTime = useMemo(
		() => convertToMilliseconds(interval),
		[interval],
	);
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
				data-testid="mq-drop-rate-table"
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
