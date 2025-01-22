import './ClusterMetrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import { K8sClustersData } from 'api/infraMonitoring/getK8sClustersList';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getMetricsTableData,
	MetricsTable,
} from 'container/InfraMonitoringK8s/commonUtils';
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
import { Options } from 'uplot';

import { clusterWidgetInfo, getClusterQueryPayload } from './constants';

interface ClusterMetricsProps {
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
	cluster: K8sClustersData;
}

function ClusterMetrics({
	selectedInterval,
	cluster,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
}: ClusterMetricsProps): JSX.Element {
	const queryPayloads = useMemo(
		() => getClusterQueryPayload(cluster, timeRange.startTime, timeRange.endTime),
		[cluster, timeRange.startTime, timeRange.endTime],
	);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['cluster-metrics', payload, ENTITY_VERSION_V4, 'NODE'],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const chartData = useMemo(
		() =>
			queries.map(({ data }) => {
				const panelType = (data?.params as any)?.compositeQuery?.panelType;
				return panelType === PANEL_TYPES.TABLE
					? getMetricsTableData(data)
					: getUPlotChartData(data?.payload);
			}),
		[queries],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) => {
				const panelType = (data?.params as any)?.compositeQuery?.panelType;
				if (panelType === PANEL_TYPES.TABLE) {
					return null;
				}
				return getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: clusterWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: timeRange.startTime,
					maxTimeScale: timeRange.endTime,
				});
			}),
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

		const { panelType } = (query.data?.params as any).compositeQuery;

		return (
			<div
				className={cx('chart-container', {
					'no-data-container':
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				{panelType === PANEL_TYPES.TABLE ? (
					<MetricsTable
						rows={chartData[idx][0].rows}
						columns={chartData[idx][0].columns}
					/>
				) : (
					<Uplot options={options[idx] as Options} data={chartData[idx]} />
				)}
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
			<Row gutter={24} className="cluster-metrics-container">
				{queries.map((query, idx) => (
					<Col span={12} key={clusterWidgetInfo[idx].title}>
						<Typography.Text>{clusterWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="cluster-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default ClusterMetrics;
