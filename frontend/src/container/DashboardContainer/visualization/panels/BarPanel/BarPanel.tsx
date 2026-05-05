import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import {
	IRenderTooltipFooterArgs,
	LegendPosition,
} from 'lib/uPlotV2/components/types';
import ContextMenu from 'periscope/components/ContextMenu';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { useTimezone } from 'providers/Timezone';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import BarChart from '../../charts/BarChart/BarChart';
import ChartManager from '../../components/ChartManager/ChartManager';
import { usePanelContextMenu } from '../../hooks/usePanelContextMenu';
import { prepareBarPanelConfig, prepareBarPanelData } from './utils';

import '../Panel.styles.scss';
import TooltipFooter from '../components/TooltipFooter';

function BarPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
		groupByPerQuery,
	} = props;
	const uPlotRef = useRef<uPlot | null>(null);
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	const dashboardId = useDashboardStore((s) => s.dashboardData?.id);
	const [syncMode] = useDashboardCursorSyncMode(dashboardId, panelMode);
	const [syncFilterMode] = useSyncTooltipFilterMode(dashboardId);

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
			apiResponse: queryResponse?.data?.payload,
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
		// `config` gets mutated by TooltipPlugin (config.setCursor for cursor sync).
		// Rebuild it on syncMode changes so the new chart instance starts from a
		// clean config — otherwise switching to "No Sync" would inherit stale sync
		// settings from the previous mode.
		syncMode,
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

	const onPlotDestroy = useCallback(() => {
		uPlotRef.current = null;
	}, []);

	const onPlotRef = useCallback((plot: uPlot | null): void => {
		uPlotRef.current = plot;
	}, []);

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
				<BarChart
					key={`${syncMode}-${syncFilterMode}`}
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					canPinTooltip
					plotRef={onPlotRef}
					onDestroy={onPlotDestroy}
					data={chartData as uPlot.AlignedData}
					width={containerDimensions.width}
					height={containerDimensions.height}
					layoutChildren={layoutChildren}
					groupByPerQuery={groupByPerQuery}
					isStackedBarChart={widget.stackedBarChart ?? false}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					timezone={timezone}
					syncMode={syncMode}
					syncFilterMode={syncFilterMode}
					renderTooltipFooter={renderTooltipFooter}
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
