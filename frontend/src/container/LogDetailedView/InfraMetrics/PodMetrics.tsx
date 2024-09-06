import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { cardTitles, getQueryPayload } from './constants';

function PodMetrics({
	podName,
	clusterName,
}: {
	podName: string;
	clusterName: string;
}): JSX.Element {
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: '3h',
	});
	const minTimeScale = (parseInt(start, 10) * 1e3) / 1000;
	const maxTimeScale = (parseInt(end, 10) * 1e3) / 1000;
	const queryPayloads = useMemo(() => getQueryPayload(clusterName, podName), [
		clusterName,
		podName,
	]);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: ['metrics', payload, ENTITY_VERSION_V4, 'POD'],
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
		if (idx === 1 || idx === 3) return 'bytes';
		if (idx === 2) return 'binBps';
		return '';
	};

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: getYAxisUnit(idx),
					softMax: null,
					softMin: null,
					minTimeScale,
					maxTimeScale,
				}),
			),
		[queries, isDarkMode, dimensions, minTimeScale, maxTimeScale],
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
			<div className="chart-container">
				<Uplot options={options[idx]} data={chartData[idx]} />
			</div>
		);
	};

	return (
		<Row gutter={24}>
			{chartData.map((data, idx) => (
				<Col span={24} key={cardTitles[idx]}>
					<Typography.Text>{cardTitles[idx]}</Typography.Text>
					<Card
						bordered
						className={cx('infra-metrics-card', {
							'no-data-card':
								!queries[idx].isLoading &&
								!queries[idx]?.data?.payload?.data?.result?.length,
						})}
						ref={graphRef}
					>
						{renderCardContent(queries[idx], idx)}
					</Card>
				</Col>
			))}
		</Row>
	);
}

export default PodMetrics;
