import './InfraMetrics.styles.scss';

import { Card, Col, Row, Typography } from 'antd';
import cx from 'classnames';
import Spinner from 'components/Spinner';
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

import { JSONViewProps } from '../LogDetailedView.types';
import { cardTitles, getQueryPayload } from './constants';

function InfraMetrics({ logData }: JSONViewProps): JSX.Element {
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: '3h',
	});
	const minTimeScale = (parseInt(start, 10) * 1e3) / 1000;
	const maxTimeScale = (parseInt(end, 10) * 1e3) / 1000;

	const clusterName = logData.resources_string?.['k8s.cluster.name'] as string;
	const podName = logData.resources_string?.['k8s.pod.name'] as string;

	const queries = useQueries(
		getQueryPayload(clusterName, podName).map((payload) => ({
			queryKey: ['metrics', payload, ENTITY_VERSION_V4],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
		})),
	);
	console.log(queries);

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
					minTimeScale,
					maxTimeScale,
					softMax: null,
					softMin: null,
					yAxisUnit: idx === 1 || idx === 2 || idx === 3 ? 'bytes' : '',
				}),
			),
		[queries, isDarkMode, dimensions, minTimeScale, maxTimeScale],
	);

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>,
		idx: number,
	): JSX.Element => {
		if (query.isLoading) {
			return <Spinner height="400px" />;
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
		<div>
			<Row gutter={24}>
				{queries.map((query, idx) => (
					<Col span={12} key={cardTitles[idx]}>
						<Typography.Text>{cardTitles[idx]}</Typography.Text>
						<Card
							bordered
							className={cx('infra-metrics-card', {
								'no-data': !query?.data?.payload?.data?.result?.length,
							})}
							ref={graphRef}
						>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</div>
	);
}

export default InfraMetrics;
