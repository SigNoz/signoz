import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotHeatmapChartOptions } from 'lib/uPlotLib/getUplotHeatmapChartOptions';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { getTimeRange } from 'utils/getTimeRange';

import { HEATMAP_COLOR_GRADIENTS } from './constants';
import {
	extractAndProcessHeatmapData,
	generateYSplits,
	getHeatmapColors,
} from './heatmap';
import { PanelWrapperProps } from './panelWrapper.types';

function HeatmapPanelWrapper({
	queryResponse,
	widget,
	setGraphVisibility,
	graphVisibility,
	isFullViewMode,
	onToggleModelHandler,
	enableDrillDown = false,
	onDragSelect,
	onClickHandler,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const lineChartRef = useRef<ToggleGraphProps>();
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
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

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			const [
				,
				,
				,
				,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				,
				focusedSeries,
			] = args;

			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});

			if (data && data?.record?.queryName) {
				onClick(data.coord, { ...data.record, label: data.label });
			}
		},
		[onClick],
	);

	const { startTime: minTimeScale, endTime: maxTimeScale } = useMemo(
		() => getTimeRange(queryResponse),
		[queryResponse],
	);

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

	// Extract and process heatmap data
	const heatmapData = useMemo(
		() => extractAndProcessHeatmapData(queryResponse, widget.query),
		[queryResponse, widget.query],
	);

	const heatmapColors = useMemo(
		() => getHeatmapColors(widget.heatmapColorPalette, HEATMAP_COLOR_GRADIENTS),
		[widget.heatmapColorPalette],
	);

	const options = useMemo(() => {
		if (!heatmapData) {
			return null;
		}

		const yAxisRange = { min: 0, max: heatmapData.numBuckets };
		const ySplits = generateYSplits(heatmapData.numBuckets);

		return getUplotHeatmapChartOptions({
			dimensions: containerDimensions,
			isDarkMode,
			data: heatmapData.data,
			yAxisRange,
			bucketLabels: heatmapData.bucketLabels,
			ySplits,
			timeBucketIntervalMs: heatmapData.timeBucketIntervalMs,
			heatmapColors,
			yAxisUnit: widget.yAxisUnit,
			minTimeScale,
			maxTimeScale,
			timezone: timezone.value,
			enableDrillDown,
			onDragSelect,
			onClickHandler: enableDrillDown
				? clickHandlerWithContextMenu
				: onClickHandler,
			queryResponse,
			timeSeriesData: heatmapData.timeSeriesData,
			bounds: heatmapData.bounds,
			fieldNames: heatmapData.fieldNames,
		});
	}, [
		heatmapData,
		containerDimensions,
		isDarkMode,
		heatmapColors,
		widget.yAxisUnit,
		minTimeScale,
		maxTimeScale,
		timezone.value,
		enableDrillDown,
		onDragSelect,
		clickHandlerWithContextMenu,
		onClickHandler,
		queryResponse,
	]);

	return (
		<div style={{ height: '100%', width: '100%', position: 'relative' }}>
			<div ref={graphRef} style={{ height: '100%', width: '100%' }}>
				{options && heatmapData && (
					<Uplot options={options} data={heatmapData.data} />
				)}
			</div>
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
			{isFullViewMode && setGraphVisibility && heatmapData && options && (
				<GraphManager
					data={heatmapData.data}
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

export default HeatmapPanelWrapper;
