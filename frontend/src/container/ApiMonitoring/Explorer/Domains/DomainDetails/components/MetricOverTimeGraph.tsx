import { Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { apiWidgetInfo } from 'container/ApiMonitoring/utils';
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

function MetricOverTimeGraph({
	metricOverTimeDataQuery,
	widgetInfoIndex,
}: {
	metricOverTimeDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
	widgetInfoIndex: number;
}): JSX.Element {
	const { data } = metricOverTimeDataQuery;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const chartData = useMemo(() => getUPlotChartData(data?.payload), [
		data?.payload,
	]);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse: data?.payload,
				isDarkMode: true,
				dimensions,
				yAxisUnit: apiWidgetInfo[widgetInfoIndex].yAxisUnit,
				softMax: null,
				softMin: null,
				minTimeScale: Math.floor(minTime / 1e9),
				maxTimeScale: Math.floor(maxTime / 1e9),
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		[data?.payload, minTime, maxTime, widgetInfoIndex, dimensions],
	);

	const renderCardContent = useCallback(
		(query: UseQueryResult<SuccessResponse<any>, unknown>): JSX.Element => {
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
					<Uplot options={options as Options} data={chartData} />
				</div>
			);
		},
		[options, chartData],
	);

	return (
		<div>
			<Typography.Text>{apiWidgetInfo[widgetInfoIndex].title}</Typography.Text>
			<Card bordered className="endpoint-details-card" ref={graphRef}>
				{renderCardContent(metricOverTimeDataQuery)}
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
