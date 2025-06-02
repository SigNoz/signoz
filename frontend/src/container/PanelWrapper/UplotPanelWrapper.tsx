import './UplotPanelWrapper.styles.scss';

import { Alert } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import {
	getCustomApiResponse,
	getCustomChartData,
} from 'lib/uPlotLib/utils/getCustomChartData';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { cloneDeep, isEqual, isUndefined } from 'lodash-es';
import _noop from 'lodash-es/noop';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { PanelWrapperProps } from './panelWrapper.types';

function UplotPanelWrapper({
	queryResponse,
	widget,
	isFullViewMode,
	setGraphVisibility,
	graphVisibility,
	onToggleModelHandler,
	onClickHandler,
	onDragSelect,
	selectedGraph,
	customTooltipElement,
	customSeries,
}: PanelWrapperProps): JSX.Element {
	const {
		toScrollWidgetId,
		setToScrollWidgetId,
		globalCustomDataMode,
		globalCustomXData,
		globalCustomYData,
	} = useDashboard();

	const isDarkMode = useIsDarkMode();
	const lineChartRef = useRef<ToggleGraphProps>();
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const { currentQuery } = useQueryBuilder();

	// Get global time for custom data generation
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [hiddenGraph, setHiddenGraph] = useState<{ [key: string]: boolean }>();

	useEffect(() => {
		if (toScrollWidgetId === widget.id) {
			graphRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			graphRef.current?.focus();
			setToScrollWidgetId('');
		}
	}, [toScrollWidgetId, setToScrollWidgetId, widget.id]);

	// Create custom response when custom data mode is enabled (either via widget or global setting)
	const effectiveQueryResponse = useMemo(() => {
		// If global custom data mode is enabled, it should override widget settings
		const isCustomDataEnabled = globalCustomDataMode || widget.customDataMode;

		// When global custom data is enabled, use global values regardless of widget settings
		let xData = null;
		let yData = null;

		if (globalCustomDataMode) {
			// Global settings override widget settings
			xData = globalCustomXData;
			yData = globalCustomYData;
		} else if (widget.customDataMode) {
			// Only use widget settings if global is not enabled
			xData = widget.customXData;
			yData = widget.customYData;
		}

		if (isCustomDataEnabled && xData && yData) {
			// Convert nanoseconds to seconds for custom data generation
			const startTimeSeconds = Math.floor(minTime / 1000000000);
			const endTimeSeconds = Math.floor(maxTime / 1000000000);

			const customResponse = getCustomApiResponse(
				xData,
				yData,
				startTimeSeconds,
				endTimeSeconds,
			);
			// Return a properly structured response that matches the expected type
			return {
				...queryResponse,
				data: customResponse,
				isSuccess: true,
				isError: false,
				isLoading: false,
			} as typeof queryResponse;
		}
		return queryResponse;
	}, [
		queryResponse,
		widget.customDataMode,
		widget.customXData,
		widget.customYData,
		globalCustomDataMode,
		globalCustomXData,
		globalCustomYData,
		minTime,
		maxTime,
	]);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(effectiveQueryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [effectiveQueryResponse]);

	const containerDimensions = useResizeObserver(graphRef);

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: effectiveQueryResponse.data?.payload.data.result || [],
			name: widget.id,
		});
		if (setGraphVisibility) {
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [
		effectiveQueryResponse.data?.payload.data.result,
		setGraphVisibility,
		widget.id,
	]);

	if (effectiveQueryResponse.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			effectiveQueryResponse.data?.payload.data.result,
		);
		// eslint-disable-next-line no-param-reassign
		effectiveQueryResponse.data.payload.data.result = sortedSeriesData;
	}

	const chartData = useMemo(() => {
		// If global custom data mode is enabled, it should override widget settings
		const isCustomDataEnabled = globalCustomDataMode || widget.customDataMode;

		// When global custom data is enabled, use global values regardless of widget settings
		let xData = null;
		let yData = null;

		if (globalCustomDataMode) {
			// Global settings override widget settings
			xData = globalCustomXData;
			yData = globalCustomYData;
		} else if (widget.customDataMode) {
			// Only use widget settings if global is not enabled
			xData = widget.customXData;
			yData = widget.customYData;
		}

		if (isCustomDataEnabled && xData && yData) {
			// Convert nanoseconds to seconds for custom data generation
			const startTimeSeconds = Math.floor(minTime / 1000000000);
			const endTimeSeconds = Math.floor(maxTime / 1000000000);

			return getCustomChartData(xData, yData, startTimeSeconds, endTimeSeconds);
		}
		return getUPlotChartData(
			effectiveQueryResponse?.data?.payload,
			widget.fillSpans,
			widget?.stackedBarChart,
			hiddenGraph,
		);
	}, [
		widget.customDataMode,
		widget.customXData,
		widget.customYData,
		globalCustomDataMode,
		globalCustomXData,
		globalCustomYData,
		minTime,
		maxTime,
		effectiveQueryResponse?.data?.payload,
		widget.fillSpans,
		widget?.stackedBarChart,
		hiddenGraph,
	]);

	useEffect(() => {
		if (widget.panelTypes === PANEL_TYPES.BAR && widget?.stackedBarChart) {
			const graphV = cloneDeep(graphVisibility)?.slice(1);
			const isSomeSelectedLegend = graphV?.some((v) => v === false);
			if (isSomeSelectedLegend) {
				const hiddenIndex = graphV?.findIndex((v) => v === true);
				if (!isUndefined(hiddenIndex) && hiddenIndex !== -1) {
					const updatedHiddenGraph = { [hiddenIndex]: true };
					if (!isEqual(hiddenGraph, updatedHiddenGraph)) {
						setHiddenGraph(updatedHiddenGraph);
					}
				}
			}
		}
	}, [graphVisibility, hiddenGraph, widget.panelTypes, widget?.stackedBarChart]);

	const { timezone } = useTimezone();

	// Standard click handler without performance monitoring
	const enhancedClickHandler = useMemo(() => {
		if (!onClickHandler) return _noop;
		return onClickHandler;
	}, [onClickHandler]);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: widget?.id,
				apiResponse: effectiveQueryResponse.data?.payload,
				dimensions: containerDimensions,
				isDarkMode,
				onDragSelect,
				yAxisUnit: widget?.yAxisUnit,
				onClickHandler: enhancedClickHandler,
				thresholds: widget.thresholds,
				minTimeScale,
				maxTimeScale,
				softMax: widget.softMax === undefined ? null : widget.softMax,
				softMin: widget.softMin === undefined ? null : widget.softMin,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				panelType: selectedGraph || widget.panelTypes,
				currentQuery,
				stackBarChart: widget?.stackedBarChart,
				hiddenGraph,
				setHiddenGraph,
				customTooltipElement,
				tzDate: (timestamp: number) =>
					uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
				timezone: timezone.value,
				customSeries,
				isLogScale: widget?.isLogScale,
				colorMapping: widget?.customLegendColors,
				enhancedLegend: true, // Enable enhanced legend
				legendPosition: widget?.legendPosition,
			}),
		[
			widget?.id,
			widget?.yAxisUnit,
			widget.thresholds,
			widget.softMax,
			widget.softMin,
			widget.panelTypes,
			widget?.stackedBarChart,
			effectiveQueryResponse.data?.payload,
			containerDimensions,
			isDarkMode,
			onDragSelect,
			enhancedClickHandler,
			minTimeScale,
			maxTimeScale,
			graphVisibility,
			setGraphVisibility,
			selectedGraph,
			currentQuery,
			hiddenGraph,
			customTooltipElement,
			timezone.value,
			customSeries,
			widget?.isLogScale,
			widget?.legendPosition,
			widget?.customLegendColors,
		],
	);

	console.log(
		'chartData',
		'x-axis',
		chartData[0].length,
		'y-axis',
		chartData.length,
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={options} data={chartData} ref={lineChartRef} />
			{widget?.stackedBarChart && isFullViewMode && (
				<Alert
					message="Selecting multiple legends is currently not supported in case of stacked bar charts"
					type="info"
					className="info-text"
				/>
			)}
			{isFullViewMode && setGraphVisibility && !widget?.stackedBarChart && (
				<GraphManager
					data={getUPlotChartData(
						effectiveQueryResponse?.data?.payload,
						widget.fillSpans,
					)}
					name={widget.id}
					options={options}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					setGraphsVisibilityStates={setGraphVisibility}
					graphsVisibilityStates={graphVisibility}
					lineChartRef={lineChartRef}
				/>
			)}
		</div>
	);
}

export default UplotPanelWrapper;
