import './LogsExplorerChart.styles.scss';

import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { themeColors } from 'constants/theme';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import getChartData, { GetChartDataProps } from 'lib/getChartData';
import GetMinMax from 'lib/getMinMax';
import { colors } from 'lib/getRandomColor';
import { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { getColorsForSeverityLabels } from './utils';

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
	const handleCreateDatasets: Required<GetChartDataProps>['createDataset'] = useCallback(
		(element, index, allLabels) => ({
			data: element,
			backgroundColor: isLogsExplorerViews
				? getColorsForSeverityLabels(allLabels[index], index)
				: colors[index % colors.length] || themeColors.red,
			borderColor: isLogsExplorerViews
				? getColorsForSeverityLabels(allLabels[index], index)
				: colors[index % colors.length] || themeColors.red,
			...(isLabelEnabled
				? {
						label: allLabels[index],
				  }
				: {}),
		}),
		[isLabelEnabled, isLogsExplorerViews],
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

	const graphData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: data,
					},
				],
				createDataset: handleCreateDatasets,
			}),
		[data, handleCreateDatasets],
	);

	// Convert nanosecond timestamps to milliseconds for Chart.js
	const { chartMinTime, chartMaxTime } = useMemo(
		() => ({
			chartMinTime: minTime ? Math.floor(minTime / 1e6) : undefined,
			chartMaxTime: maxTime ? Math.floor(maxTime / 1e6) : undefined,
		}),
		[minTime, maxTime],
	);

	return (
		<div className={`${className} logs-frequency-chart-container`}>
			{isLoading ? (
				<div className="logs-frequency-chart-loading">
					<Spinner size="default" height="100%" />
				</div>
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData.data}
					isStacked={isLogsExplorerViews}
					type="bar"
					animate
					onDragSelect={onDragSelect}
					minTime={chartMinTime}
					maxTime={chartMaxTime}
				/>
			)}
		</div>
	);
}

export default memo(LogsExplorerChart);
