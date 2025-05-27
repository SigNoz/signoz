import './Metrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { QueryParams } from 'constants/query';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom-v5-compat';
import { UpdateTimeInterval } from 'store/actions/global';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

interface MetricsTabProps {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	selectedInterval: Time;

	hostName: string;
}

function Metrics({
	selectedInterval,
	hostName,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
}: MetricsTabProps): JSX.Element {
	const queryPayloads = useMemo(
		() => getHostQueryPayload(hostName, timeRange.startTime, timeRange.endTime),
		[hostName, timeRange.startTime, timeRange.endTime],
	);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['host-metrics', payload, ENTITY_VERSION_V4, 'HOST'],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const dispatch = useDispatch();

	const chartData = useMemo(
		() => queries.map(({ data }) => getUPlotChartData(data?.payload)),
		[queries],
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, safeNavigate, urlQuery],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: hostWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: timeRange.startTime,
					maxTimeScale: timeRange.endTime,
					onDragSelect,
				}),
			),
		[
			queries,
			isDarkMode,
			dimensions,
			timeRange.startTime,
			timeRange.endTime,
			onDragSelect,
		],
	);

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>,
		idx: number,
	): JSX.Element => {
		if (query.isLoading) {
			return <Skeleton />;
		}

		if (query.error) {
			const errorMessage =
				(query.error as Error)?.message || 'Something went wrong';
			return <div>{errorMessage}</div>;
		}
		return (
			<div
				className={cx('chart-container', {
					'no-data-container':
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				<Uplot options={options[idx]} data={chartData[idx]} />
			</div>
		);
	};

	return (
		<>
			<div className="metrics-header">
				<div className="metrics-datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh
						showRefreshText={false}
						hideShareModal
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						isModalTimeSelection={isModalTimeSelection}
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>
			<Row gutter={24} className="host-metrics-container">
				{queries.map((query, idx) => (
					<Col span={12} key={hostWidgetInfo[idx].title}>
						<Typography.Text>{hostWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="host-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default Metrics;
