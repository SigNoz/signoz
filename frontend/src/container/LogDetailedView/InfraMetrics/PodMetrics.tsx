import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useTimezone } from 'providers/Timezone';
import { useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { getPodQueryPayload, podWidgetInfo } from './constants';

function PodMetrics({
	podName,
	clusterName,
	logLineTimestamp,
}: {
	podName: string;
	clusterName: string;
	logLineTimestamp: string;
}): JSX.Element {
	const { start, end, verticalLineTimestamp } = useMemo(() => {
		const logTimestamp = dayjs(logLineTimestamp);
		const now = dayjs();
		const startTime = logTimestamp.subtract(3, 'hour');

		const endTime = logTimestamp.add(3, 'hour').isBefore(now)
			? logTimestamp.add(3, 'hour')
			: now;

		return {
			start: startTime.unix(),
			end: endTime.unix(),
			verticalLineTimestamp: logTimestamp.unix(),
		};
	}, [logLineTimestamp]);
	const queryPayloads = useMemo(
		() => getPodQueryPayload(clusterName, podName, start, end),
		[clusterName, end, podName, start],
	);
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
	const { timezone } = useTimezone();

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: podWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: start,
					maxTimeScale: end,
					verticalLineTimestamp,
					tzDate: (timestamp: number) =>
						uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
					timezone: timezone.value,
				}),
			),
		[
			queries,
			isDarkMode,
			dimensions,
			start,
			end,
			verticalLineTimestamp,
			timezone.value,
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
		<Row gutter={24}>
			{queries.map((query, idx) => (
				<Col span={12} key={podWidgetInfo[idx].title}>
					<Typography.Text>{podWidgetInfo[idx].title}</Typography.Text>
					<Card bordered className="infra-metrics-card" ref={graphRef}>
						{renderCardContent(query, idx)}
					</Card>
				</Col>
			))}
		</Row>
	);
}

export default PodMetrics;
