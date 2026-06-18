import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import TooltipFooter from 'container/DashboardContainer/visualization/panels/components/TooltipFooter';
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
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { getTimeRangeFromQueryRangeRequest } from 'utils/getTimeRange';

import NoData from '../../components/NoData/NoData';
import { useGroupByPerQuery } from '../../hooks/useGroupByPerQuery';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';
import { getBuilderQueries } from '../../utils/getBuilderQueries';

import { buildTimeSeriesConfig } from './utils/buildConfig';
import { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

function TimeSeriesPanelRenderer({
	panelId,
	panel,
	data,
	refetch,
	onClick,
	onDragSelect,
	dashboardPreference,
	panelMode,
}: PanelRendererProps<'signoz/TimeSeriesPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// `panel` is narrowed to this kind by PanelRendererProps, so `spec` is this
	// kind's exact spec DTO — no cast needed.
	const spec = useMemo<DashboardtypesTimeSeriesPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries),
		[panel.spec.queries],
	);

	// X-scale clamps come from the request that produced the data, so each
	// panel pins to the window it actually fetched — important during
	// drag-zoom transitions when the time picker has moved but new data
	// hasn't arrived yet. Falls back to the global picker inside the helper.
	// The generated request DTO is structurally the hand-written V5 request;
	// the cast is the documented boundary.
	const { minTimeScale, maxTimeScale } = useMemo(() => {
		const { startTime, endTime } = getTimeRangeFromQueryRangeRequest(
			data.requestPayload as unknown as QueryRangeRequestV5 | undefined,
		);
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
			// `config` gets mutated by TooltipPlugin (config.setCursor for cursor sync).
			// Rebuild it on syncMode changes so the new chart instance starts from a
			// clean config — otherwise switching to "No Sync" would inherit stale sync
			// settings from the previous mode.
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

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => (
			<TooltipFooter id={panelId} isPinned={isPinned} dismiss={dismiss} />
		),
		[panelId],
	);

	/**
	 * The uPlot key prop is the only way to force a full teardown and re-mount
	 * of the chart. By including the syncMode and syncFilterMode in the key,
	 * we ensure that changes to these preferences trigger a fresh chart instance,
	 * preventing stale sync settings from being inherited.
	 */
	const key = `${dashboardPreference?.syncMode}-${dashboardPreference?.syncFilterMode}`;

	const handleChartClick = useCallback(
		(args: ChartClickData) => {
			onClick?.(args);
		},
		[onClick],
	);

	return (
		<div
			ref={graphRef}
			data-testid="time-series-renderer"
			className={PanelStyles.panelContainer}
		>
			{flatSeries.length === 0 && <NoData onRetry={refetch} />}
			{flatSeries.length > 0 &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
					<TimeSeries
						key={key}
						config={config}
						data={chartData}
						legendConfig={{ position: legendPosition }}
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
						onClick={handleChartClick}
					/>
				)}
		</div>
	);
}

export default TimeSeriesPanelRenderer;
