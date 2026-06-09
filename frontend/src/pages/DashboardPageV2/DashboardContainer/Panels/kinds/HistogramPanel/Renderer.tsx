import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Histogram from 'container/DashboardContainer/visualization/charts/Histogram/Histogram';
import TooltipFooter from 'container/DashboardContainer/visualization/panels/components/TooltipFooter';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import { useTimezone } from 'providers/Timezone';
import type uPlot from 'uplot';

import PanelStyles from '../../shared/panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { resolveLegendPosition } from '../../shared/chartAppearanceMappings';
import { getBuilderQueries } from '../../shared/getBuilderQueries';

import { buildHistogramConfig } from './buildConfig';
import { prepareHistogramData } from './prepareData';
import { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

function HistogramPanelRenderer({
	panelId,
	panel,
	data,
	panelMode,
	onClick,
}: PanelRendererProps<'signoz/HistogramPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	// The registry guarantees this Renderer only runs when
	// `panel.spec.plugin.kind === 'signoz/HistogramPanel'`, so the cast is a
	// documented boundary narrowing.
	const spec = useMemo<DashboardtypesHistogramPanelSpecDTO>(
		() =>
			(panel?.spec?.plugin?.spec ?? {}) as DashboardtypesHistogramPanelSpecDTO,
		[panel?.spec?.plugin?.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel?.spec?.queries),
		[panel?.spec?.queries],
	);

	const config = useMemo(
		() =>
			buildHistogramConfig({
				panelId,
				spec,
				builderQueries,
				apiResponse: data,
				isDarkMode,
				timezone,
				panelMode,
			}),
		[panelId, spec, builderQueries, data, isDarkMode, timezone, panelMode],
	);

	const chartData = useMemo(
		() =>
			prepareHistogramData({
				payload: data?.payload,
				bucketWidth: spec.histogramBuckets?.bucketWidth ?? undefined,
				bucketCount: spec.histogramBuckets?.bucketCount ?? undefined,
				mergeAllActiveQueries: spec.histogramBuckets?.mergeAllActiveQueries,
			}),
		[
			data?.payload,
			spec.histogramBuckets?.bucketWidth,
			spec.histogramBuckets?.bucketCount,
			spec.histogramBuckets?.mergeAllActiveQueries,
		],
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

	const isQueriesMerged = spec.histogramBuckets?.mergeAllActiveQueries ?? false;

	const handleChartClick = useCallback(
		(args: ChartClickData) => {
			onClick?.(args);
		},
		[onClick],
	);

	return (
		<div
			ref={graphRef}
			data-testid="histogram-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<Histogram
					key={panelId}
					config={config}
					data={chartData as uPlot.AlignedData}
					legendConfig={{ position: legendPosition }}
					canPinTooltip
					isQueriesMerged={isQueriesMerged}
					width={containerDimensions.width}
					height={containerDimensions.height}
					renderTooltipFooter={renderTooltipFooter}
					onClick={handleChartClick}
				/>
			)}
		</div>
	);
}

export default HistogramPanelRenderer;
