import './InfraMetrics.styles.scss';

import { ClusterOutlined, ContainerOutlined } from '@ant-design/icons';
import {
	Card,
	Col,
	Radio,
	RadioChangeEvent,
	Row,
	Skeleton,
	Typography,
} from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useMemo, useRef, useState } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { InfraMetricsSProps } from '../LogDetailedView.types';
import {
	cardTitles,
	getHostQueryPayload,
	getNodeQueryPayload,
	getQueryPayload,
	nodeCardTitles,
	VIEW_TYPES,
} from './constants';

function InfraMetrics({ logData }: InfraMetricsSProps): JSX.Element {
	const podName = logData.resources_string?.['k8s.pod.name']
		? (logData.resources_string?.['k8s.pod.name'] as string)
		: '';
	const initialView = podName ? VIEW_TYPES.POD : VIEW_TYPES.NODE;
	const [selectedView, setSelectedView] = useState<string>(initialView);
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: '3h',
	});
	const minTimeScale = (parseInt(start, 10) * 1e3) / 1000;
	const maxTimeScale = (parseInt(end, 10) * 1e3) / 1000;

	const clusterName = logData.resources_string?.['k8s.cluster.name']
		? (logData.resources_string?.['k8s.cluster.name'] as string)
		: '';
	const nodeName = logData.resources_string?.['k8s.node.name']
		? (logData.resources_string?.['k8s.node.name'] as string)
		: '';
	const hostName = logData.resources_string?.host_name
		? (logData.resources_string?.host_name as string)
		: '';
	const queryPayloads = useMemo(() => {
		if (selectedView === VIEW_TYPES.NODE) {
			if (nodeName) {
				return getNodeQueryPayload(clusterName, nodeName);
			}
			return getHostQueryPayload(hostName);
		}
		return getQueryPayload(clusterName, podName);
	}, [selectedView, clusterName, podName, nodeName, hostName]);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['metrics', payload, ENTITY_VERSION_V4, selectedView],
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

	const getYAxisUnit = (idx: number): string => {
		if (idx === 1 || idx === 3) {
			return 'bytes';
		}
		if (idx === 2) {
			return 'binBps';
		}
		return '';
	};

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					minTimeScale,
					maxTimeScale,
					softMax: null,
					softMin: null,
					yAxisUnit: getYAxisUnit(idx),
				}),
			),
		[queries, isDarkMode, dimensions, minTimeScale, maxTimeScale],
	);

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>>,
		idx: number,
	): JSX.Element => {
		if (query.isLoading) {
			return <Skeleton />;
		}
		if (query.error) {
			return (
				<div>{(query.error as Error)?.message || 'Something went wrong'}</div>
			);
		}
		return (
			<div className="chart-container">
				<Uplot options={options[idx]} data={chartData[idx]} />
			</div>
		);
	};

	const renderNodeMetrics = (): JSX.Element => (
		<Row gutter={24}>
			{queries.map((query, idx) => (
				<Col span={12} key={nodeCardTitles[idx]}>
					<Typography.Text>{nodeCardTitles[idx]}</Typography.Text>
					<Card
						bordered
						className={cx('infra-metrics-card', {
							'no-data-card':
								!query.isLoading && !query?.data?.payload?.data?.result?.length,
						})}
						ref={graphRef}
					>
						{renderCardContent(query, idx)}
					</Card>
				</Col>
			))}
		</Row>
	);
	const renderPodMetrics = (): JSX.Element => (
		<Row gutter={24}>
			{queries.map((query, idx) => (
				<Col span={12} key={cardTitles[idx]}>
					<Typography.Text>{cardTitles[idx]}</Typography.Text>
					<Card
						bordered
						className={cx('infra-metrics-card', {
							'no-data-card':
								!query.isLoading && !query?.data?.payload?.data?.result?.length,
						})}
						ref={graphRef}
					>
						{renderCardContent(query, idx)}
					</Card>
				</Col>
			))}
		</Row>
	);
	return (
		<div>
			<Radio.Group
				className="views-tabs"
				onChange={handleModeChange}
				value={selectedView}
			>
				<Radio.Button
					className={selectedView === VIEW_TYPES.NODE ? 'selected_view tab' : 'tab'}
					value={VIEW_TYPES.NODE}
				>
					<div className="view-title">
						<ClusterOutlined style={{ fontSize: '14px' }} />
						Node
					</div>
				</Radio.Button>
				{podName && (
					<Radio.Button
						className={selectedView === VIEW_TYPES.POD ? 'selected_view tab' : 'tab'}
						value={VIEW_TYPES.POD}
					>
						<div className="view-title">
							<ContainerOutlined style={{ fontSize: '14px' }} />
							Pod
						</div>
					</Radio.Button>
				)}
			</Radio.Group>
			{selectedView === VIEW_TYPES.NODE && renderNodeMetrics()}
			{selectedView === VIEW_TYPES.POD && podName && renderPodMetrics()}
		</div>
	);
}

export default InfraMetrics;
