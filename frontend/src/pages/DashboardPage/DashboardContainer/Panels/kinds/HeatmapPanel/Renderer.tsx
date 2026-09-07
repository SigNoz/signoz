import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesHeatmapPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Heatmap from 'lib/visualization/charts/Heatmap/Heatmap';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import {
	getExecStats,
	getHeatmapResults,
} from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';
import { useTimezone } from 'providers/Timezone';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveHeatmapAxisScale,
	resolveHeatmapColors,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';

import { prepareHeatmapData, resolveHeatmapStep } from './prepareData';

function HeatmapPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	onDragSelect,
}: PanelRendererProps<'signoz/HeatmapPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	const spec = useMemo<DashboardtypesHeatmapPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const { buckets, series, queryName } = useMemo(
		() =>
			prepareHeatmapData({
				results: getHeatmapResults(data.response),
				legendMap: data.legendMap ?? {},
			}),
		[data.response, data.legendMap],
	);

	const step = useMemo(
		() =>
			resolveHeatmapStep({
				series,
				stepInterval: getExecStats(data.response)?.stepIntervals?.[queryName],
			}),
		[series, queryName, data.response],
	);

	// X-scale clamps come from the request that produced the data, so the grid keeps
	// the window it fetched even while a newly zoomed one is in flight.
	const { minTimeScale, maxTimeScale } = useMemo(() => {
		const { startTime, endTime } = getPanelTimeRange(data.requestPayload);
		return { minTimeScale: startTime, maxTimeScale: endTime };
	}, [data.requestPayload]);

	// Stable identity: the chart rebuilds its config (and so the plot) when `colors`
	// changes, so a fresh object per render would recreate it on every render.
	const colors = useMemo(
		() => resolveHeatmapColors(spec.chartAppearance?.colors),
		[spec.chartAppearance?.colors],
	);

	const axisScale = useMemo(
		() => resolveHeatmapAxisScale(spec.axes?.yScale),
		[spec.axes?.yScale],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const legendPosition = useMemo(
		() => resolveLegendPosition(spec.legend?.position),
		[spec.legend?.position],
	);

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => (
			<TooltipFooter
				id={panelId}
				isPinned={isPinned}
				dismiss={dismiss}
				canDrilldown={false}
			/>
		),
		[panelId],
	);

	const hasGrid = buckets.length > 0 && series.length > 0;

	return (
		<div
			ref={graphRef}
			data-testid="heatmap-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!hasGrid && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{hasGrid &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
					<Heatmap
						key={panelId}
						id={panelId}
						buckets={buckets}
						series={series}
						step={step}
						colors={colors}
						axisScale={axisScale}
						yAxisUnit={spec.formatting?.unit}
						decimalPrecision={decimalPrecision}
						legendPosition={legendPosition}
						timezone={timezone}
						isDarkMode={isDarkMode}
						canPinTooltip
						width={containerDimensions.width}
						height={containerDimensions.height}
						minTimeScale={minTimeScale}
						maxTimeScale={maxTimeScale}
						onDragSelect={onDragSelect}
						renderTooltipFooter={renderTooltipFooter}
					/>
				)}
		</div>
	);
}

export default HeatmapPanelRenderer;
