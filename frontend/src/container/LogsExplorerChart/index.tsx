import { memo, useCallback, useMemo, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import { useResizeObserver } from 'hooks/useDimensions';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { StackMode } from 'lib/uPlotV2/config/types';
import { useTimezone } from 'providers/Timezone';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { useLogsExplorerChartConfig } from './useLogsExplorerChartConfig';

import './LogsExplorerChart.styles.scss';

function LogsExplorerChart({
	data,
	isLoading,
	isLabelEnabled = true,
	className,
	isLogsExplorerViews = false,
	isShowingLiveLogs = false,
}: LogsExplorerChartProps): JSX.Element {
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	// Access global time state for min/max range
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			// Do not allow dragging on live logs chart
			if (isShowingLiveLogs) {
				return;
			}

			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			urlQuery.delete(QueryParams.relativeTime);
			// Remove Hidden Filters from URL query parameters on time change
			urlQuery.delete(QueryParams.activeLogId);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
		},
		[dispatch, location.pathname, safeNavigate, urlQuery, isShowingLiveLogs],
	);

	// uPlot plots the series on a seconds-based x scale
	const { minTimeScale, maxTimeScale } = useMemo(
		() => ({
			minTimeScale: minTime ? Math.floor(minTime / 1e9) : undefined,
			maxTimeScale: maxTime ? Math.floor(maxTime / 1e9) : undefined,
		}),
		[minTime, maxTime],
	);

	const { timezone } = useTimezone();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const { config, chartData } = useLogsExplorerChartConfig({
		data,
		isLogsExplorerViews,
		isLabelEnabled,
		onDragSelect,
		minTimeScale,
		maxTimeScale,
		yAxisUnit: '{count}',
	});

	return (
		<div ref={graphRef} className={`${className} logs-frequency-chart-container`}>
			{isLoading ? (
				<div className="logs-frequency-chart-loading">
					<Spinner size="default" height="100%" />
				</div>
			) : (
				<div style={{ zIndex: 1000 }}>
					{/* The bars are log-line counts, so the y axis is the dimensionless UCUM count unit */}
					<BarChart
						config={config}
						data={chartData}
						width={dimensions.width}
						height={dimensions.height}
						stack={isLogsExplorerViews ? StackMode.Normal : StackMode.None}
						showLegend={isLabelEnabled}
						legendConfig={{ position: LegendPosition.BOTTOM }}
						timezone={timezone}
						data-testid="logs-frequency-chart"
						yAxisUnit={'{count}'}
					/>
				</div>
			)}
		</div>
	);
}

export default memo(LogsExplorerChart);
