import { Color } from '@signozhq/design-tokens';
import { Button, Card, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import { useGetGraphCustomSeries } from 'components/CeleryTask/useGetGraphCustomSeries';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getCustomFiltersForBarChart,
	getFormattedEndPointStatusCodeChartData,
	getStatusCodeBarChartWidgetData,
	statusCodeWidgetInfo,
} from 'container/ApiMonitoring/utils';
import { handleGraphClick } from 'container/GridCardLayout/GridCard/utils';
import { useGraphClickToShowButton } from 'container/GridCardLayout/useGraphClickToShowButton';
import useNavigateToExplorerPages from 'container/GridCardLayout/useNavigateToExplorerPages';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useNotifications } from 'hooks/useNotifications';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo, useRef, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { Options } from 'uplot';

import ErrorState from './ErrorState';

function StatusCodeBarCharts({
	endPointStatusCodeBarChartsDataQuery,
	endPointStatusCodeLatencyBarChartsDataQuery,
	domainName,
	endPointName,
	filters,
	timeRange,
	onDragSelect,
}: {
	endPointStatusCodeBarChartsDataQuery: UseQueryResult<
		SuccessResponse<any>,
		unknown
	>;
	endPointStatusCodeLatencyBarChartsDataQuery: UseQueryResult<
		SuccessResponse<any>,
		unknown
	>;
	domainName: string;
	endPointName: string;
	filters: IBuilderQuery['filters'];
	timeRange: {
		startTime: number;
		endTime: number;
	};
	onDragSelect: (start: number, end: number) => void;
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

	const { startTime: minTime, endTime: maxTime } = timeRange;
	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});

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

	const isDarkMode = useIsDarkMode();

	const graphClick = useGraphClickToShowButton({
		graphRef,
		isButtonEnabled: true,
		buttonClassName: 'view-onclick-show-button',
	});

	const navigateToExplorer = useNavigateToExplorer();
	const { currentQuery } = useQueryBuilder();

	const navigateToExplorerPages = useNavigateToExplorerPages();
	const { notifications } = useNotifications();

	const colorMapping = useMemo(
		() => ({
			'200-299': Color.BG_FOREST_500,
			'300-399': Color.BG_AMBER_400,
			'400-499': Color.BG_CHERRY_500,
			'500-599': Color.BG_ROBIN_500,
			Other: Color.BG_SIENNA_500,
		}),
		[],
	);

	const { getCustomSeries } = useGetGraphCustomSeries({
		isDarkMode,
		drawStyle: 'bars',
		colorMapping,
	});

	const widget = useMemo<Widgets>(
		() =>
			getStatusCodeBarChartWidgetData(domainName, endPointName, {
				items: [...(filters?.items || [])],
				op: filters?.op || 'AND',
			}),
		[domainName, endPointName, filters],
	);

	const graphClickHandler = useCallback(
		(
			xValue: number,
			yValue: number,
			mouseX: number,
			mouseY: number,
			metric?: { [key: string]: string },
			queryData?: { queryName: string; inFocusOrNot: boolean },
		): void => {
			const TWO_AND_HALF_MINUTES_IN_MILLISECONDS = 2.5 * 60 * 1000; // 150,000 milliseconds
			const customFilters = getCustomFiltersForBarChart(metric);
			const { start, end } = getStartAndEndTimesInMilliseconds(
				xValue,
				TWO_AND_HALF_MINUTES_IN_MILLISECONDS,
			);
			handleGraphClick({
				xValue,
				yValue,
				mouseX,
				mouseY,
				metric,
				queryData,
				widget,
				navigateToExplorerPages,
				navigateToExplorer,
				notifications,
				graphClick,
				customFilters,
				customTracesTimeRange: {
					start,
					end,
				},
			});
		},
		[
			widget,
			navigateToExplorerPages,
			navigateToExplorer,
			notifications,
			graphClick,
		],
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				apiResponse:
					currentWidgetInfoIndex === 0
						? formattedEndPointStatusCodeBarChartsDataPayload
						: formattedEndPointStatusCodeLatencyBarChartsDataPayload,
				isDarkMode,
				dimensions,
				yAxisUnit: statusCodeWidgetInfo[currentWidgetInfoIndex].yAxisUnit,
				softMax: null,
				softMin: null,
				minTimeScale: minTime,
				maxTimeScale: maxTime,
				panelType: PANEL_TYPES.BAR,
				onClickHandler: graphClickHandler,
				customSeries: getCustomSeries,
				onDragSelect,
				colorMapping,
				query: currentQuery,
				legendScrollPosition: legendScrollPositionRef.current,
				setLegendScrollPosition: (position: {
					scrollTop: number;
					scrollLeft: number;
				}) => {
					legendScrollPositionRef.current = position;
				},
			}),
		[
			minTime,
			maxTime,
			currentWidgetInfoIndex,
			dimensions,
			formattedEndPointStatusCodeBarChartsDataPayload,
			formattedEndPointStatusCodeLatencyBarChartsDataPayload,
			isDarkMode,
			graphClickHandler,
			getCustomSeries,
			onDragSelect,
			colorMapping,
			currentQuery,
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
