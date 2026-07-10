import { useRef } from 'react';
import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Histogram from 'container/DashboardContainer/visualization/charts/Histogram/Histogram';
import TooltipFooter from 'container/DashboardContainer/visualization/panels/components/TooltipFooter';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import {
	flattenTimeSeries,
	getTimeSeriesResults,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';
import { useTimezone } from 'providers/Timezone';
import type uPlot from 'uplot';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { resolveLegendPosition } from '../../utils/chartAppearance/resolvers';
import { getBuilderQueries } from '../../utils/getBuilderQueries';

import { buildHistogramConfig } from './utils/buildConfig';
import { prepareHistogramData } from './prepareData';

function HistogramPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	panelMode,
}: PanelRendererProps<'signoz/HistogramPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	const spec: DashboardtypesHistogramPanelSpecDTO = panel.spec.plugin.spec;

	const builderQueries = getBuilderQueries(panel.spec.queries);

	const flatSeries = flattenTimeSeries(
		getTimeSeriesResults(data.response),
		data.legendMap ?? {},
	);

	const config = buildHistogramConfig({
		panelId,
		spec,
		builderQueries,
		series: flatSeries,
		isDarkMode,
		timezone,
		panelMode,
	});

	const chartData = prepareHistogramData({
		series: flatSeries,
		bucketWidth: spec.histogramBuckets?.bucketWidth ?? undefined,
		bucketCount: spec.histogramBuckets?.bucketCount ?? undefined,
		mergeAllActiveQueries: spec.histogramBuckets?.mergeAllActiveQueries,
	});

	const legendPosition = resolveLegendPosition(spec.legend?.position);

	const renderTooltipFooter = ({
		isPinned,
		dismiss,
	}: IRenderTooltipFooterArgs): JSX.Element => (
		<TooltipFooter
			id={panelId}
			isPinned={isPinned}
			dismiss={dismiss}
			canDrilldown={false}
		/>
	);

	const isQueriesMerged = spec.histogramBuckets?.mergeAllActiveQueries ?? false;

	return (
		<div
			ref={graphRef}
			data-testid="histogram-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{flatSeries.length === 0 && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{flatSeries.length > 0 &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
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
					/>
				)}
		</div>
	);
}

export default HistogramPanelRenderer;
