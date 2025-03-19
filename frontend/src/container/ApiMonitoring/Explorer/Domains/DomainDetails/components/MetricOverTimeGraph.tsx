import { Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { apiWidgetInfo } from 'container/ApiMonitoring/utils';
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

	const isDarkMode = useIsDarkMode();

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse: data?.payload,
				isDarkMode,
				dimensions,
				yAxisUnit: apiWidgetInfo[widgetInfoIndex].yAxisUnit,
				softMax: null,
				softMin: null,
				minTimeScale: Math.floor(minTime / 1e9),
				maxTimeScale: Math.floor(maxTime / 1e9),
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		[data?.payload, minTime, maxTime, widgetInfoIndex, dimensions, isDarkMode],
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
				<div className="graph-container" ref={graphRef}>
					<div
						className={cx('chart-container', {
							'no-data-container':
								!query.isLoading && !query?.data?.payload?.data?.result?.length,
						})}
					>
						<Uplot options={options as Options} data={chartData} />
					</div>
				</div>
			);
		},
		[options, chartData],
	);

	return (
		<div>
			<Card bordered className="endpoint-details-card">
				<Typography.Text>{apiWidgetInfo[widgetInfoIndex].title}</Typography.Text>
				{renderCardContent(metricOverTimeDataQuery)}
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
