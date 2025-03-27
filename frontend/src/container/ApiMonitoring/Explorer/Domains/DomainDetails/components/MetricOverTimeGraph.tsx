import { Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	apiWidgetInfo,
	extractPortAndEndpoint,
	getFormattedChartData,
} from 'container/ApiMonitoring/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useMemo, useRef } from 'react';
import { UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Options } from 'uplot';

import ErrorState from './ErrorState';

function MetricOverTimeGraph({
	metricOverTimeDataQuery,
	widgetInfoIndex,
	endPointName,
}: {
	metricOverTimeDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
	widgetInfoIndex: number;
	endPointName: string;
}): JSX.Element {
	const { data } = metricOverTimeDataQuery;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const { endpoint } = extractPortAndEndpoint(endPointName);

	const formattedChartData = useMemo(
		() => getFormattedChartData(data?.payload, [endpoint]),
		[data?.payload, endpoint],
	);

	const chartData = useMemo(() => getUPlotChartData(formattedChartData), [
		formattedChartData,
	]);

	const isDarkMode = useIsDarkMode();

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse: formattedChartData,
				isDarkMode,
				dimensions,
				yAxisUnit: apiWidgetInfo[widgetInfoIndex].yAxisUnit,
				softMax: null,
				softMin: null,
				minTimeScale: Math.floor(minTime / 1e9),
				maxTimeScale: Math.floor(maxTime / 1e9),
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		[
			formattedChartData,
			minTime,
			maxTime,
			widgetInfoIndex,
			dimensions,
			isDarkMode,
		],
	);

	const renderCardContent = useCallback(
		(query: UseQueryResult<SuccessResponse<any>, unknown>): JSX.Element => {
			if (query.isLoading) {
				return <Skeleton />;
			}

			if (query.error) {
				return <ErrorState refetch={query.refetch} />;
			}

			return (
				<div
					className={cx('chart-container', {
						'no-data-container':
							!query.isLoading && !query?.data?.payload?.data?.result?.length,
					})}
				>
					<Uplot options={options as Options} data={chartData} />
				</div>
			);
		},
		[options, chartData],
	);

	return (
		<div>
			<Card bordered className="endpoint-details-card">
				<Typography.Text>{apiWidgetInfo[widgetInfoIndex].title}</Typography.Text>
				<div className="graph-container" ref={graphRef}>
					{renderCardContent(metricOverTimeDataQuery)}
				</div>
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
