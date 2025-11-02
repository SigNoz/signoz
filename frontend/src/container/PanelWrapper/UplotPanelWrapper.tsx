import './UplotPanelWrapper.styles.scss';

import { Alert } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { cloneDeep, isEqual, isUndefined } from 'lodash-es';
import _noop from 'lodash-es/noop';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';
import uPlot from 'uplot';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { PanelWrapperProps } from './panelWrapper.types';
import { getTimeRangeFromStepInterval, isApmMetric } from './utils';

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
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const lineChartRef = useRef<ToggleGraphProps>();
	const graphRef = useRef<HTMLDivElement>(null);
	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const { currentQuery } = useQueryBuilder();

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

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [queryResponse]);

	const containerDimensions = useResizeObserver(graphRef);

	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();
	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget.id || '',
		query: widget.query,
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: widget.contextLinks,
		panelType: widget.panelTypes,
		queryRange: queryResponse,
	});

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: queryResponse.data?.payload.data.result || [],
			name: widget.id,
		});
		if (setGraphVisibility) {
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [
		queryResponse?.data?.payload?.data?.result,
		setGraphVisibility,
		widget.id,
	]);

	if (queryResponse.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		// eslint-disable-next-line no-param-reassign
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	const stackedBarChart = useMemo(
		() =>
			(selectedGraph
				? selectedGraph === PANEL_TYPES.BAR
				: widget?.panelTypes === PANEL_TYPES.BAR) && widget?.stackedBarChart,
		[selectedGraph, widget?.panelTypes, widget?.stackedBarChart],
	);

	const chartData = getUPlotChartData(
		queryResponse?.data?.payload,
		widget.fillSpans,
		stackedBarChart,
		hiddenGraph,
	);

	useEffect(() => {
		if (widget.panelTypes === PANEL_TYPES.BAR && stackedBarChart) {
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
	}, [graphVisibility, hiddenGraph, widget.panelTypes, stackedBarChart]);

	const { timezone } = useTimezone();

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			const [
				xValue,
				,
				,
				,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				axesData,
				focusedSeries,
			] = args;
			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});
			// Compute time range if needed and if axes data is available
			let timeRange;
			if (axesData && queryData?.queryName) {
				// Get the compositeQuery from the response params
				const compositeQuery = (queryResponse?.data?.params as any)?.compositeQuery;

				if (compositeQuery?.queries) {
					// Find the specific query by name from the queries array
					const specificQuery = compositeQuery.queries.find(
						(query: any) => query.spec?.name === queryData.queryName,
					);

					// Use the stepInterval from the specific query, fallback to default
					const stepInterval = specificQuery?.spec?.stepInterval || 60;
					timeRange = getTimeRangeFromStepInterval(
						stepInterval,
						metric?.clickedTimestamp || xValue, // Use the clicked timestamp if available, otherwise use the click position timestamp
						specificQuery?.spec?.signal === DataSource.METRICS &&
							isApmMetric(specificQuery?.spec?.aggregations[0]?.metricName),
					);
				}
			}

			if (data && data?.record?.queryName) {
				onClick(data.coord, { ...data.record, label: data.label, timeRange });
			}
		},
		[onClick, queryResponse],
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: widget?.id,
				apiResponse: queryResponse.data?.payload,
				dimensions: containerDimensions,
				isDarkMode,
				onDragSelect,
				yAxisUnit: widget?.yAxisUnit,
				onClickHandler: enableDrillDown
					? clickHandlerWithContextMenu
					: onClickHandler ?? _noop,
				thresholds: widget.thresholds,
				minTimeScale,
				maxTimeScale,
				softMax: widget.softMax === undefined ? null : widget.softMax,
				softMin: widget.softMin === undefined ? null : widget.softMin,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				panelType: selectedGraph || widget.panelTypes,
				currentQuery,
				stackBarChart: stackedBarChart,
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
				query: widget?.query || currentQuery,
				legendScrollPosition: legendScrollPositionRef.current,
				setLegendScrollPosition: (position: {
					scrollTop: number;
					scrollLeft: number;
				}) => {
					legendScrollPositionRef.current = position;
				},
				decimalPrecision: widget.decimalPrecision,
			}),
		[
			queryResponse.data?.payload,
			containerDimensions,
			isDarkMode,
			onDragSelect,
			clickHandlerWithContextMenu,
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
			enableDrillDown,
			onClickHandler,
			widget,
			stackedBarChart,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={options} data={chartData} ref={lineChartRef} />
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
			{stackedBarChart && isFullViewMode && (
				<Alert
					message="Selecting multiple legends is currently not supported in case of stacked bar charts"
					type="info"
					className="info-text"
				/>
			)}
			{isFullViewMode && setGraphVisibility && !stackedBarChart && (
				<GraphManager
					data={getUPlotChartData(queryResponse?.data?.payload, widget.fillSpans)}
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
