import './Metrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
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
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function Metrics({
	hostName,
	timeRange,
	isModalTimeSelection,
}: {
	hostName: string;
	timeRange: { startTime: number; endTime: number };
	isModalTimeSelection: boolean;
}): JSX.Element {
	const [modalTimeRange, setModalTimeRange] = useState({
		startTime: timeRange.startTime / 1000,
		endTime: timeRange.endTime / 1000,
	});
	const [, setSelectedInterval] = useState<Time>('5m');

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);
			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: dateTimeRange[0],
					endTime: dateTimeRange[1],
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);
				setModalTimeRange({
					startTime: minTime / 1000000000,
					endTime: maxTime / 1000000000,
				});
			}
		},
		[],
	);

	const queryPayloads = useMemo(
		() =>
			getHostQueryPayload(
				hostName,
				modalTimeRange.startTime,
				modalTimeRange.endTime,
			),
		[hostName, modalTimeRange.startTime, modalTimeRange.endTime],
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
					yAxisUnit: hostWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: modalTimeRange.startTime,
					maxTimeScale: modalTimeRange.endTime,
				}),
			),
		[
			queries,
			isDarkMode,
			dimensions,
			modalTimeRange.startTime,
			modalTimeRange.endTime,
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
			<div className="metrics-datetime-section">
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
					onTimeChange={handleTimeChange}
					defaultRelativeTime="5m"
					isModalTimeSelection={isModalTimeSelection}
				/>
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
