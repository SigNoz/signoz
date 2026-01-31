import { Color } from '@signozhq/design-tokens';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotDistributionChartOptions } from 'lib/uPlotLib/utils/getUplotDistributionChartOptions';
import _noop from 'lodash-es/noop';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';

import { buildDistributionData } from './distribution';
import { PanelWrapperProps } from './panelWrapper.types';

function DistributionPanelWrapper({
	queryResponse,
	widget,
	setGraphVisibility,
	graphVisibility,
	isFullViewMode,
	onToggleModelHandler,
	onClickHandler,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const lineChartRef = useRef<ToggleGraphProps>();
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const [bucketZoomRange, setBucketZoomRange] = useState<{
		start: number;
		end: number;
	} | null>(null);
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

	const distributionData = useMemo(
		() =>
			buildDistributionData(
				queryResponse.data?.payload.data.result,
				bucketZoomRange,
			),
		[queryResponse.data?.payload.data.result, bucketZoomRange],
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

	const handleBucketZoom = useCallback(
		(startBucket: number, endBucket: number) => {
			setBucketZoomRange({ start: startBucket, end: endBucket });
		},
		[],
	);

	const handleResetZoom = useCallback(() => {
		setBucketZoomRange(null);
	}, []);

	const options: uPlot.Options = useMemo(
		() =>
			getUplotDistributionChartOptions({
				id: widget.id,
				apiResponse: queryResponse.data?.payload,
				dimensions: containerDimensions,
				isDarkMode,
				bucketLabels: distributionData.bucketLabels,
				seriesConfigs: distributionData.series.map((s) => ({
					name: s.name,
					legend: s.legend,
					queryName: s.queryName,
				})),
				customLegendColors: widget.customLegendColors,
				isLogScale: widget.isLogScale,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				onClickHandler: enableDrillDown
					? clickHandlerWithContextMenu
					: onClickHandler ?? _noop,
				onBucketZoom: handleBucketZoom,
				tzDate: (timestamp: number) =>
					uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
			}),
		[
			widget.id,
			widget.customLegendColors,
			widget.isLogScale,
			queryResponse.data?.payload,
			containerDimensions,
			isDarkMode,
			distributionData.bucketLabels,
			distributionData.series,
			graphVisibility,
			setGraphVisibility,
			enableDrillDown,
			clickHandlerWithContextMenu,
			onClickHandler,
			handleBucketZoom,
			timezone.value,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%', position: 'relative' }}>
			{bucketZoomRange && (
				<button
					type="button"
					onClick={handleResetZoom}
					style={{
						position: 'absolute',
						top: '10px',
						right: '10px',
						zIndex: 1000,
						padding: '6px 12px',
						background: isDarkMode ? Color.BG_INK_300 : Color.BG_VANILLA_200,
						color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400,
						border: `1px solid ${
							isDarkMode ? Color.BG_INK_200 : Color.BG_VANILLA_300
						}`,
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '12px',
						fontWeight: 500,
					}}
				>
					Reset Zoom
				</button>
			)}
			<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
				<Uplot options={options} data={distributionData.data} ref={lineChartRef} />
			</div>
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
			{isFullViewMode && setGraphVisibility && (
				<GraphManager
					data={distributionData.data}
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

export default DistributionPanelWrapper;
