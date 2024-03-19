import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getTimeRange } from 'utils/getTimeRange';

function WidgetGraph({
	getWidgetQueryRange,
	selectedWidget,
	yAxisUnit,
	thresholds,
	fillSpans,
	softMax,
	softMin,
	selectedLogFields,
	selectedTracesFields,
	selectedTime,
	selectedGraph,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const location = useLocation();

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(getWidgetQueryRange);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [getWidgetQueryRange, maxTime, minTime, globalSelectedInterval]);

	const graphRef = useRef<HTMLDivElement>(null);

	const containerDimensions = useResizeObserver(graphRef);

	const chartData = getUPlotChartData(
		getWidgetQueryRange?.data?.payload,
		fillSpans,
	);

	const isDarkMode = useIsDarkMode();

	const params = useUrlQuery();

	const widgetId = params.get('widgetId');

	const dispatch = useDispatch();

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

			params.set(QueryParams.startTime, minTime.toString());
			params.set(QueryParams.endTime, maxTime.toString());
			const generatedUrl = `${location.pathname}?${params.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, params],
	);

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);

		if (startTime && endTime && startTime !== endTime) {
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

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: widgetId || 'legend_widget',
				yAxisUnit,
				apiResponse: getWidgetQueryRange?.data?.payload,
				dimensions: containerDimensions,
				isDarkMode,
				onDragSelect,
				thresholds,
				fillSpans,
				minTimeScale,
				maxTimeScale,
				softMax,
				softMin,
				panelType: selectedGraph,
				currentQuery,
			}),
		[
			widgetId,
			yAxisUnit,
			getWidgetQueryRange?.data?.payload,
			containerDimensions,
			isDarkMode,
			onDragSelect,
			thresholds,
			fillSpans,
			minTimeScale,
			maxTimeScale,
			softMax,
			softMin,
			selectedGraph,
			currentQuery,
		],
	);

	return (
		<div ref={graphRef} style={{ height: '100%' }}>
			<GridPanelSwitch
				data={chartData}
				options={options}
				panelType={selectedWidget.panelTypes}
				name={widgetId || 'legend_widget'}
				yAxisUnit={yAxisUnit}
				panelData={
					getWidgetQueryRange.data?.payload.data.newResult.data.result || []
				}
				query={stagedQuery || selectedWidget.query}
				thresholds={thresholds}
				selectedLogFields={selectedLogFields}
				selectedTracesFields={selectedTracesFields}
				dataSource={currentQuery.builder.queryData[0].dataSource}
				selectedTime={selectedTime}
			/>
		</div>
	);
}

interface WidgetGraphProps {
	thresholds: ThresholdProps[];
	yAxisUnit: string;
	selectedWidget: Widgets;
	fillSpans: boolean;
	getWidgetQueryRange: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	softMax: number | null;
	softMin: number | null;
	selectedLogFields: Widgets['selectedLogFields'];
	selectedTracesFields: Widgets['selectedTracesFields'];
	selectedTime: timePreferance;
	selectedGraph: PANEL_TYPES;
}

export default WidgetGraph;
