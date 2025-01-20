import './JobMetrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import { K8sJobsData } from 'api/infraMonitoring/getK8sJobsList';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { getJobQueryPayload, jobWidgetInfo } from './constants';

interface JobMetricsProps {
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
	job: K8sJobsData;
}

function JobMetrics({
	selectedInterval,
	job,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
}: JobMetricsProps): JSX.Element {
	const queryPayloads = useMemo(
		() => getJobQueryPayload(job, timeRange.startTime, timeRange.endTime),
		[job, timeRange.startTime, timeRange.endTime],
	);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['job-metrics', payload, ENTITY_VERSION_V4, 'STATEFUL_SET'],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const chartData = useMemo(
		() => queries.map(({ data }) => getUPlotChartData(data?.payload)),
		[queries],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: jobWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: timeRange.startTime,
					maxTimeScale: timeRange.endTime,
				}),
			),
		[queries, isDarkMode, dimensions, timeRange.startTime, timeRange.endTime],
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
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						isModalTimeSelection={isModalTimeSelection}
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>
			<Row gutter={24} className="job-metrics-container">
				{queries.map((query, idx) => (
					<Col span={12} key={jobWidgetInfo[idx].title}>
						<Typography.Text>{jobWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="job-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default JobMetrics;
