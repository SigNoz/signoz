import { Button, Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getFormattedEndPointStatusCodeChartData,
	statusCodeWidgetInfo,
} from 'container/ApiMonitoring/utils';
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

import ErrorState from './ErrorState';

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
	} = endPointStatusCodeBarChartsDataQuery;

	const {
		data: endPointStatusCodeLatencyBarChartsData,
	} = endPointStatusCodeLatencyBarChartsDataQuery;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const formattedEndPointStatusCodeBarChartsDataPayload = useMemo(
		() =>
			getFormattedEndPointStatusCodeChartData(
				endPointStatusCodeBarChartsData?.payload,
				'sum',
			),
		[endPointStatusCodeBarChartsData?.payload],
	);

	const formattedEndPointStatusCodeLatencyBarChartsDataPayload = useMemo(
		() =>
			getFormattedEndPointStatusCodeChartData(
				endPointStatusCodeLatencyBarChartsData?.payload,
				'average',
			),
		[endPointStatusCodeLatencyBarChartsData?.payload],
	);

	const chartData = useMemo(
		() =>
			getUPlotChartData(
				currentWidgetInfoIndex === 0
					? formattedEndPointStatusCodeBarChartsDataPayload
					: formattedEndPointStatusCodeLatencyBarChartsDataPayload,
			),
		[
			currentWidgetInfoIndex,
			formattedEndPointStatusCodeBarChartsDataPayload,
			formattedEndPointStatusCodeLatencyBarChartsDataPayload,
		],
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse:
					currentWidgetInfoIndex === 0
						? formattedEndPointStatusCodeBarChartsDataPayload
						: formattedEndPointStatusCodeLatencyBarChartsDataPayload,
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
			minTime,
			maxTime,
			currentWidgetInfoIndex,
			dimensions,
			formattedEndPointStatusCodeBarChartsDataPayload,
			formattedEndPointStatusCodeLatencyBarChartsDataPayload,
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
