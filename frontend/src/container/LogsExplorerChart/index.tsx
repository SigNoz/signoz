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
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { CardStyled } from './LogsExplorerChart.styled';
import { getColorsForSeverityLabels } from './utils';

function LogsExplorerChart({
	data,
	isLoading,
	isLabelEnabled = true,
	className,
	isLogsExplorerViews = false,
}: LogsExplorerChartProps): JSX.Element {
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();
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
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
		},
		[dispatch, location.pathname, safeNavigate, urlQuery],
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

	return (
		<CardStyled className={className}>
			{isLoading ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData.data}
					isStacked={isLogsExplorerViews}
					type="bar"
					animate
					onDragSelect={onDragSelect}
				/>
			)}
		</CardStyled>
	);
}

export default memo(LogsExplorerChart);
