import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { themeColors } from 'constants/theme';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import useUrlQuery from 'hooks/useUrlQuery';
import getChartData, { GetChartDataProps } from 'lib/getChartData';
import GetMinMax from 'lib/getMinMax';
import { colors } from 'lib/getRandomColor';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { memo, useCallback, useEffect, useMemo } from 'react';
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
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, urlQuery],
	);

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);
		const relativeTime = searchParams.get(
			QueryParams.relativeTime,
		) as CustomTimeType;

		if (relativeTime) {
			dispatch(UpdateTimeInterval(relativeTime));
		} else if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	};

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);

		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
