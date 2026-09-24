import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TimeSeries from 'lib/visualization/charts/TimeSeries/TimeSeries';
import ChartManager from 'lib/visualization/components/ChartManager/ChartManager';
import { usePanelContextMenu } from 'container/WidgetCard/Panels/hooks/usePanelContextMenu';
import { PanelWrapperProps } from 'container/WidgetCard/Panels/panelWrapper.types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import {
	IRenderTooltipFooterArgs,
	LegendPosition,
} from 'lib/uPlotV2/components/types';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useTimezone } from 'providers/Timezone';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import { prepareUPlotConfig } from 'container/WidgetCard/Panels/TimeSeriesPanel/utils';
import { PanelMode } from 'lib/visualization/panels/types';

import 'container/WidgetCard/Panels/Panel.styles.scss';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';

function TimeSeriesPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
		groupByPerQuery,
		enableDrillDown = false,
	} = props;
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// These panels never render inside a dashboard, so there is no stored
	// cursor-sync preference to read — only the panel-mode gate applies.
	const syncMode =
		panelMode === PanelMode.DASHBOARD_VIEW
			? DashboardCursorSync.Crosshair
			: DashboardCursorSync.None;

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
		enableDrillDown,
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

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => {
			return (
				<TooltipFooter id={widget.id} isPinned={isPinned} dismiss={dismiss} />
			);
		},
		[],
	);

	return (
		<div className="panel-container" ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<TimeSeries
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					canPinTooltip
					timezone={timezone}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					data={chartData as uPlot.AlignedData}
					groupByPerQuery={groupByPerQuery}
					width={containerDimensions.width}
					height={containerDimensions.height}
					syncMode={syncMode}
					syncFilterMode={SyncTooltipFilterMode.Filtered}
					layoutChildren={layoutChildren}
					renderTooltipFooter={renderTooltipFooter}
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
