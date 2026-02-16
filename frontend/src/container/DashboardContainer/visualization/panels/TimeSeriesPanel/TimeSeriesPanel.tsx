import { useEffect, useMemo, useRef, useState } from 'react';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import ChartManager from 'container/DashboardContainer/visualization/components/ChartManager/ChartManager';
import { usePanelContextMenu } from 'container/DashboardContainer/visualization/hooks/usePanelContextMenu';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import { prepareChartData, prepareUPlotConfig } from '../TimeSeriesPanel/utils';
import { PanelMode } from '../types';

import '../Panel.styles.scss';

function TimeSeriesPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
	} = props;
	const {
		toScrollWidgetId,
		setToScrollWidgetId,
		selectedDashboard,
	} = useDashboard();
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

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

	const chartData = useMemo(() => {
		if (!queryResponse?.data?.payload) {
			return [];
		}
		return prepareChartData(queryResponse?.data?.payload);
	}, [queryResponse?.data?.payload]);

	const config = useMemo(() => {
		return prepareUPlotConfig({
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
		clickHandlerWithContextMenu,
		onDragSelect,
		queryResponse?.data?.payload,
		panelMode,
		minTimeScale,
		maxTimeScale,
		timezone,
	]);

	const crossPanelSync = selectedDashboard?.data?.crossPanelSync ?? 'NONE';

	const cursorSyncMode = useMemo(() => {
		if (panelMode !== PanelMode.DASHBOARD_VIEW) {
			return 'NONE';
		}
		return crossPanelSync;
	}, [panelMode, crossPanelSync]);

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

	return (
		<div className="panel-container" ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<TimeSeries
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					syncMode={cursorSyncMode}
					timezone={timezone.value}
					data={chartData as uPlot.AlignedData}
					width={containerDimensions.width}
					height={containerDimensions.height}
					layoutChildren={layoutChildren}
				>
					<ContextMenu
						coordinates={coordinates}
						popoverPosition={popoverPosition}
						title={menuItemsConfig.header as string}
						items={menuItemsConfig.items}
						onClose={onClose}
					/>
				</TimeSeries>
			)}
		</div>
	);
}

export default TimeSeriesPanel;
