import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import ChartManager from 'container/DashboardContainer/visualization/components/ChartManager/ChartManager';
import TooltipFooter from 'container/DashboardContainer/visualization/panels/components/TooltipFooter';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import {
	flattenTimeSeries,
	getExecStats,
	getTimeSeriesResults,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';
import { prepareAlignedData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/uplotData';
import { useTimezone } from 'providers/Timezone';

import NoData from '../../components/NoData/NoData';
import { useGroupByPerQuery } from '../../hooks/useGroupByPerQuery';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';
import { stepClickTimeRange } from '../../utils/drilldown/chartClickTimeRange';
import { enrichChartClick } from '../../utils/drilldown/enrichChartClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';

import { buildTimeSeriesConfig } from './utils/buildConfig';
import { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

function TimeSeriesPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	onDragSelect,
	dashboardPreference,
	panelMode,
	onCloseStandaloneView,
	enableDrillDown,
}: PanelRendererProps<'signoz/TimeSeriesPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	const spec = useMemo<DashboardtypesTimeSeriesPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries),
		[panel.spec.queries],
	);

	// X-scale clamps come from the request that produced the data, so each panel
	// pins to the window it fetched — matters during drag-zoom transitions before
	// new data arrives.
	const { minTimeScale, maxTimeScale } = useMemo(() => {
		const { startTime, endTime } = getPanelTimeRange(data.requestPayload);
		return { minTimeScale: startTime, maxTimeScale: endTime };
	}, [data.requestPayload]);

	const groupByPerQuery = useGroupByPerQuery(builderQueries);

	const flatSeries = useMemo(
		() =>
			flattenTimeSeries(getTimeSeriesResults(data.response), data.legendMap ?? {}),
		[data.response, data.legendMap],
	);

	const config = useMemo(
		() =>
			buildTimeSeriesConfig({
				panelId,
				spec,
				builderQueries,
				series: flatSeries,
				stepIntervals: getExecStats(data.response)?.stepIntervals,
				isDarkMode,
				timezone,
				panelMode,
				minTimeScale,
				maxTimeScale,
				onDragSelect,
			}),
		[
			panelId,
			spec,
			builderQueries,
			flatSeries,
			data.response,
			isDarkMode,
			timezone,
			panelMode,
			minTimeScale,
			maxTimeScale,
			onDragSelect,
			// TooltipPlugin mutates `config` for cursor sync; rebuild on syncMode change
			// so a fresh instance doesn't inherit stale sync settings (e.g. "No Sync").
			dashboardPreference?.syncMode,
		],
	);

	const chartData = useMemo(() => prepareAlignedData(flatSeries), [flatSeries]);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const legendPosition = useMemo(() => {
		return resolveLegendPosition(spec.legend?.position);
	}, [spec.legend?.position]);

	// The standalone View modal shows V1's graph-manager legend below the chart:
	// Filter Series + per-series show/hide + Save. Series visibility auto-persists to
	// localStorage (STANDALONE_VIEW selection prefs), keyed by panelId.
	const layoutChildren = useMemo(
		() =>
			panelMode === PanelMode.STANDALONE_VIEW ? (
				<div className={PanelStyles.chartManagerContainer}>
					<ChartManager
						config={config}
						alignedData={chartData}
						yAxisUnit={spec.formatting?.unit}
						decimalPrecision={decimalPrecision}
						onCancel={onCloseStandaloneView}
					/>
				</div>
			) : null,
		[
			panelMode,
			config,
			chartData,
			spec.formatting?.unit,
			decimalPrecision,
			onCloseStandaloneView,
		],
	);

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => (
			<TooltipFooter
				id={panelId}
				isPinned={isPinned}
				canDrilldown={!!enableDrillDown}
				dismiss={dismiss}
			/>
		),
		[panelId, enableDrillDown],
	);

	// Keying on sync prefs forces a full chart teardown/re-mount so stale sync
	// settings aren't inherited — the only way to fully reset the uPlot instance.
	const key = `${dashboardPreference?.syncMode}-${dashboardPreference?.syncFilterMode}`;

	const handleChartClick = useCallback(
		(args: ChartClickData): void => {
			if (!onClick) {
				return;
			}
			const payload = enrichChartClick({
				clickData: args,
				series: flatSeries,
				builderQueries,
			});
			if (!payload) {
				return;
			}
			const timeRange = stepClickTimeRange({
				clickedDataTimestamp: args.clickedDataTimestamp,
				queryName: payload.context.queryName,
				builderQueries,
				stepInterval: getExecStats(data.response)?.stepIntervals?.[
					payload.context.queryName
				],
			});
			onClick({ ...payload, context: { ...payload.context, timeRange } });
		},
		[onClick, flatSeries, builderQueries, data.response],
	);

	return (
		<div
			ref={graphRef}
			data-testid="time-series-renderer"
			className={PanelStyles.panelContainer}
		>
			{flatSeries.length === 0 && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{flatSeries.length > 0 &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
					<TimeSeries
						key={key}
						config={config}
						data={chartData}
						legendConfig={{ position: legendPosition }}
						layoutChildren={layoutChildren}
						groupByPerQuery={groupByPerQuery}
						canPinTooltip
						timezone={timezone}
						yAxisUnit={spec.formatting?.unit}
						decimalPrecision={decimalPrecision}
						width={containerDimensions.width}
						height={containerDimensions.height}
						syncMode={dashboardPreference?.syncMode}
						syncFilterMode={dashboardPreference?.syncFilterMode}
						renderTooltipFooter={renderTooltipFooter}
						onClick={enableDrillDown ? handleChartClick : undefined}
					/>
				)}
		</div>
	);
}

export default TimeSeriesPanelRenderer;
