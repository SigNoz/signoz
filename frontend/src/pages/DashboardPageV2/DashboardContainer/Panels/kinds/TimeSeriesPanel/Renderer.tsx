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
	onClick,
	onDragSelect,
	dashboardPreference,
	panelMode,
}: PanelRendererProps<'signoz/TimeSeriesPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// The registry guarantees the kind, so the cast is a boundary narrowing.
	// Memoized so the `?? {}` fallback doesn't produce a fresh object each render.
	const spec = useMemo<DashboardtypesTimeSeriesPanelSpecDTO>(
		() => (panel.spec.plugin.spec ?? {}) as DashboardtypesTimeSeriesPanelSpecDTO,
		[panel.spec.plugin.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries),
		[panel.spec.queries],
	);

	// X-scale clamps come from the request that produced the data, so each panel
	// pins to the window it fetched — matters during drag-zoom transitions before
	// new data arrives. The generated request DTO is structurally the V5 request.
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

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => (
			<TooltipFooter id={panelId} isPinned={isPinned} dismiss={dismiss} />
		),
		[panelId],
	);

	// Keying on sync prefs forces a full chart teardown/re-mount so stale sync
	// settings aren't inherited — the only way to fully reset the uPlot instance.
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
			{flatSeries.length === 0 && <NoData />}
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
