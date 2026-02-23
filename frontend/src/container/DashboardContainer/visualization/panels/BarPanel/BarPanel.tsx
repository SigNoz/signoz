import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScrollWidgetIntoView } from 'container/DashboardContainer/visualization/hooks/useScrollWidgetIntoView';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import ContextMenu from 'periscope/components/ContextMenu';
import { useTimezone } from 'providers/Timezone';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import BarChart from '../../charts/BarChart/BarChart';
import ChartManager from '../../components/ChartManager/ChartManager';
import { usePanelContextMenu } from '../../hooks/usePanelContextMenu';
import { prepareBarPanelConfig, prepareBarPanelData } from './utils';

import '../Panel.styles.scss';

function BarPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
	} = props;
	const uPlotRef = useRef<uPlot | null>(null);
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	useScrollWidgetIntoView(widget.id, graphRef);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [queryResponse]);

	const {
		coordinates,
		popoverPosition,
		onClose,
		menuItemsConfig,
		clickHandlerWithContextMenu,
	} = usePanelContextMenu({
		widget,
		queryResponse,
	});

	const config = useMemo(() => {
		return prepareBarPanelConfig({
			widget,
			isDarkMode,
			currentQuery: widget.query,
			onClick: clickHandlerWithContextMenu,
			onDragSelect,
			apiResponse: queryResponse?.data?.payload as MetricRangePayloadProps,
			timezone,
			panelMode,
			minTimeScale: minTimeScale,
			maxTimeScale: maxTimeScale,
		});
	}, [
		widget,
		isDarkMode,
		queryResponse?.data?.payload,
		clickHandlerWithContextMenu,
		onDragSelect,
		minTimeScale,
		maxTimeScale,
		timezone,
		panelMode,
	]);

	const chartData = useMemo(() => {
		if (!queryResponse?.data?.payload) {
			return [];
		}
		return prepareBarPanelData(queryResponse?.data?.payload);
	}, [queryResponse?.data?.payload]);

	const layoutChildren = useMemo(() => {
		if (!isFullViewMode) {
			return null;
		}
		return (
			<ChartManager
				config={config}
				alignedData={chartData}
				yAxisUnit={widget.yAxisUnit}
				onCancel={onToggleModelHandler}
			/>
		);
	}, [
		isFullViewMode,
		config,
		chartData,
		widget.yAxisUnit,
		onToggleModelHandler,
	]);

	const onPlotDestroy = useCallback(() => {
		uPlotRef.current = null;
	}, []);

	const onPlotRef = useCallback((plot: uPlot | null): void => {
		uPlotRef.current = plot;
	}, []);

	return (
		<div className="panel-container" ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<BarChart
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					plotRef={onPlotRef}
					onDestroy={onPlotDestroy}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					timezone={timezone.value}
					data={chartData as uPlot.AlignedData}
					width={containerDimensions.width}
					height={containerDimensions.height}
					layoutChildren={layoutChildren}
					isStackedBarChart={widget.stackedBarChart ?? false}
				>
					<ContextMenu
						coordinates={coordinates}
						popoverPosition={popoverPosition}
						title={menuItemsConfig.header as string}
						items={menuItemsConfig.items}
						onClose={onClose}
					/>
				</BarChart>
			)}
		</div>
	);
}

export default BarPanel;
