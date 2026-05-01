import { useEffect, useMemo, useRef, useState } from 'react';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import ChartManager from 'container/DashboardContainer/visualization/components/ChartManager/ChartManager';
import { usePanelContextMenu } from 'container/DashboardContainer/visualization/hooks/usePanelContextMenu';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { useTimezone } from 'providers/Timezone';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';
import get from 'lodash/get';

import { prepareChartData, prepareUPlotConfig } from '../TimeSeriesPanel/utils';

import '../Panel.styles.scss';
import { PanelMode } from '../types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

function TimeSeriesPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
	} = props;
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	const dashboardId = useDashboardStore((s) => s.dashboardData?.id);
	const [syncMode] = useDashboardCursorSyncMode(dashboardId);

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
			apiResponse: queryResponse?.data?.payload,
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
		// `config` gets mutated by TooltipPlugin (config.setCursor for cursor sync).
		// Rebuild it on syncMode changes so the new chart instance starts from a
		// clean config — otherwise switching to "No Sync" would inherit stale sync
		// settings from the previous mode.
		syncMode,
	]);

	const layoutChildren = useMemo(() => {
		if (!isFullViewMode) {
			return null;
		}
		return (
			<ChartManager
				config={config}
				alignedData={chartData}
				yAxisUnit={widget.yAxisUnit}
				decimalPrecision={widget.decimalPrecision}
				onCancel={onToggleModelHandler}
			/>
		);
	}, [
		isFullViewMode,
		config,
		chartData,
		widget.yAxisUnit,
		onToggleModelHandler,
		widget.decimalPrecision,
	]);

	const groupBy = useMemo(() => {
		return get(widget, 'query.builder.queryData[0].groupBy', []);
	}, [widget.query]);

	const cursorSyncMode = useMemo(() => {
		if (panelMode !== PanelMode.DASHBOARD_VIEW) {
			return DashboardCursorSync.None;
		}
		return syncMode;
	}, [syncMode, panelMode]);

	return (
		<div className="panel-container" ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<TimeSeries
					key={cursorSyncMode}
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					canPinTooltip
					timezone={timezone}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					data={chartData as uPlot.AlignedData}
					groupBy={groupBy}
					width={containerDimensions.width}
					height={containerDimensions.height}
					syncMode={cursorSyncMode}
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
