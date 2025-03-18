import { Button, Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { statusCodeWidgetInfo } from 'container/ApiMonitoring/utils';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useMemo, useRef, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Options } from 'uplot';

function StatusCodeBarCharts({
	endPointStatusCodeBarChartsDataQuery,
	endPointStatusCodeLatencyBarChartsDataQuery,
}: {
	endPointStatusCodeBarChartsDataQuery: UseQueryResult<
		SuccessResponse<any>,
		unknown
	>;
	endPointStatusCodeLatencyBarChartsDataQuery: UseQueryResult<
		SuccessResponse<any>,
		unknown
	>;
}): JSX.Element {
	// 0 : Status Code Count
	// 1 : Status Code Latency
	const [currentWidgetInfoIndex, setCurrentWidgetInfoIndex] = useState(0);

	const {
		data: endPointStatusCodeBarChartsData,
		isLoading: isEndPointStatusCodeBarChartsLoading,
		isError: isEndPointStatusCodeBarChartsError,
	} = endPointStatusCodeBarChartsDataQuery;

	const {
		data: endPointStatusCodeLatencyBarChartsData,
		isLoading: isEndPointStatusCodeLatencyBarChartsLoading,
		isError: isEndPointStatusCodeLatencyBarChartsError,
	} = endPointStatusCodeLatencyBarChartsDataQuery;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const chartData = useMemo(
		() =>
			getUPlotChartData(
				currentWidgetInfoIndex === 0
					? endPointStatusCodeBarChartsData?.payload
					: endPointStatusCodeLatencyBarChartsData?.payload,
			),
		[
			endPointStatusCodeBarChartsData?.payload,
			endPointStatusCodeLatencyBarChartsData?.payload,
			currentWidgetInfoIndex,
		],
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse:
					currentWidgetInfoIndex === 0
						? endPointStatusCodeBarChartsData?.payload
						: endPointStatusCodeLatencyBarChartsData?.payload,
				isDarkMode: true,
				dimensions,
				yAxisUnit: statusCodeWidgetInfo[currentWidgetInfoIndex].yAxisUnit,
				softMax: null,
				softMin: null,
				minTimeScale: Math.floor(minTime / 1e9),
				maxTimeScale: Math.floor(maxTime / 1e9),
				panelType: PANEL_TYPES.BAR,
			}),
		[
			endPointStatusCodeBarChartsData?.payload,
			endPointStatusCodeLatencyBarChartsData?.payload,
			minTime,
			maxTime,
			currentWidgetInfoIndex,
			dimensions,
		],
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
			<Card bordered className="endpoint-details-card">
				<div className="header">
					<Typography.Text>Call response status</Typography.Text>
					<Button.Group className="views-tabs">
						<Button
							value={0}
							className={currentWidgetInfoIndex === 0 ? 'selected_view tab' : 'tab'}
							disabled={false}
							onClick={(): void => setCurrentWidgetInfoIndex(0)}
						>
							Number of calls
						</Button>
						<Button
							value={1}
							className={currentWidgetInfoIndex === 1 ? 'selected_view tab' : 'tab'}
							onClick={(): void => setCurrentWidgetInfoIndex(1)}
						>
							Latency
						</Button>
					</Button.Group>
				</div>
				<div className="graph-container" ref={graphRef}>
					{renderCardContent(endPointStatusCodeBarChartsDataQuery)}
				</div>
			</Card>
		</div>
	);
}
export default StatusCodeBarCharts;
