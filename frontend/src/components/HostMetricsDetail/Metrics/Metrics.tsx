import './Metrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

function Metrics({ hostName }: { hostName: string }): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const startMs = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [
		maxTime,
	]);
	const queryPayloads = useMemo(
		() => getHostQueryPayload(hostName, startMs, endMs),
		[hostName, startMs, endMs],
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
					minTimeScale: startMs,
					maxTimeScale: endMs,
				}),
			),
		[queries, isDarkMode, dimensions, startMs, endMs],
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
	);
}

export default Metrics;
