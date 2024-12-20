import './NamespaceMetrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import { K8sNamespacesData } from 'api/infraMonitoring/getK8sNamespacesList';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridPanelSwitch from 'container/GridPanelSwitch';
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

import { getNamespaceQueryPayload, namespaceWidgetInfo } from './constants';

interface NamespaceMetricsProps {
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
	namespace: K8sNamespacesData;
}

function NamespaceMetrics({
	selectedInterval,
	namespace,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
}: NamespaceMetricsProps): JSX.Element {
	const queryPayloads = useMemo(
		() =>
			getNamespaceQueryPayload(namespace, timeRange.startTime, timeRange.endTime),
		[namespace, timeRange.startTime, timeRange.endTime],
	);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['namespace-metrics', payload, ENTITY_VERSION_V4, 'NODE'],
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
					yAxisUnit: namespaceWidgetInfo[idx].yAxisUnit,
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

		const { panelType } = (query.data?.params as any).compositeQuery;
		const panelData = query.data?.payload?.data?.newResult.data.result ?? [];

		const queryPayload = queryPayloads[idx];

		return (
			<div
				className={cx('chart-container', {
					'no-data-container':
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				{panelType === PANEL_TYPES.TABLE ? (
					// <GridTableComponent data={panelData} query={queryPayload.query} />
					<GridPanelSwitch
						panelType={PANEL_TYPES.TABLE}
						data={chartData[idx]}
						options={options[idx]}
						name=""
						panelData={panelData}
						query={queryPayload.query}
					/>
				) : (
					<Uplot options={options[idx]} data={chartData[idx]} />
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
			<Row gutter={24} className="namespace-metrics-container">
				{queries.map((query, idx) => (
					<Col span={12} key={namespaceWidgetInfo[idx].title}>
						<Typography.Text>{namespaceWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="namespace-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default NamespaceMetrics;
