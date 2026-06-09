import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesBarChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import TooltipFooter from 'container/DashboardContainer/visualization/panels/components/TooltipFooter';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';
import { useTimezone } from 'providers/Timezone';

import { useGroupByPerQuery } from '../../hooks/useGroupByPerQuery';
import { useTimeScale } from '../../hooks/useTimeScale';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../utils/chartAppearanceMappings';
import { getBuilderQueries } from '../../utils/getBuilderQueries';

import { buildBarChartConfig } from './buildConfig';
import { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

function BarPanelRenderer({
	panelId,
	panel,
	data,
	onClick,
	onDragSelect,
	dashboardPreference,
	panelMode,
}: PanelRendererProps<'signoz/BarChartPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// The registry guarantees this Renderer only runs when
	// `panel.spec.plugin.kind === 'signoz/BarChartPanel'`, so the cast is a
	// documented boundary narrowing. Memoized so the `?? {}` fallback doesn't
	// produce a fresh object on each render.
	const spec = useMemo<DashboardtypesBarChartPanelSpecDTO>(
		() => (panel?.spec?.plugin?.spec ?? {}) as DashboardtypesBarChartPanelSpecDTO,
		[panel?.spec?.plugin?.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel?.spec?.queries),
		[panel?.spec?.queries],
	);

	const { minTimeScale, maxTimeScale } = useTimeScale(data);
	const groupByPerQuery = useGroupByPerQuery(builderQueries);

	const config = useMemo(
		() =>
			buildBarChartConfig({
				panelId,
				spec,
				builderQueries,
				apiResponse: data,
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
			data,
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

	const chartData = useMemo(
		() => (data?.payload ? prepareChartData(data.payload) : []),
		[data?.payload],
	);

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

	// The uPlot key prop is the only way to force a full teardown and re-mount
	// of the chart. Including syncMode/syncFilterMode in the key ensures changes
	// to these preferences trigger a fresh chart instance, preventing stale
	// sync wiring from being inherited.
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
			data-testid="bar-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<BarChart
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
					isStackedBarChart={spec.visualization?.stackedBarChart ?? false}
					renderTooltipFooter={renderTooltipFooter}
					onClick={handleChartClick}
				/>
			)}
		</div>
	);
}

export default BarPanelRenderer;
