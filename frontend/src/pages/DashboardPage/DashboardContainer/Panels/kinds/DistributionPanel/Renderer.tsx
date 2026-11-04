import { useCallback, useMemo, useRef } from 'react';
import type { DashboardtypesDistributionPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Distribution from 'lib/visualization/charts/Distribution/Distribution';
import type { DistributionBarClick } from 'lib/visualization/charts/Distribution/types';
import { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getDistributionResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveDistributionPercentiles,
	resolveDistributionStackMode,
	resolveDistributionXScale,
	resolveDistributionYScale,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';
import { enrichDistributionClick } from '../../utils/drilldown/enrichDistributionClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';
import { resolveRequestedBucketKind } from '../HeatmapPanel/prepareData';

import { prepareDistributionData } from './prepareData';

function DistributionPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/DistributionPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();

	const spec = useMemo<DashboardtypesDistributionPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const { buckets, series, queryName } = useMemo(
		() =>
			prepareDistributionData({
				results: getDistributionResults(data.response),
				legendMap: data.legendMap ?? {},
			}),
		[data.response, data.legendMap],
	);

	const xScale = useMemo(
		() =>
			resolveDistributionXScale(
				spec.axes?.x?.scale,
				resolveRequestedBucketKind(data.requestPayload),
			),
		[spec.axes?.x?.scale, data.requestPayload],
	);

	const percentiles = useMemo(
		() => resolveDistributionPercentiles(spec.chartAppearance?.percentiles),
		[spec.chartAppearance?.percentiles],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries),
		[panel.spec.queries],
	);

	const handleBarClick = useCallback(
		(click: DistributionBarClick): void => {
			const payload = enrichDistributionClick({
				click,
				queryName,
				builderQueries,
				timeRange: getPanelTimeRange(data.requestPayload),
			});
			if (payload) {
				onClick?.(payload);
			}
		},
		[onClick, queryName, builderQueries, data.requestPayload],
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

	const hasBars = buckets.length > 0 && series.length > 0;

	return (
		<div
			ref={graphRef}
			data-testid="distribution-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!hasBars && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{hasBars &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
					<Distribution
						key={panelId}
						id={panelId}
						buckets={buckets}
						series={series}
						xScale={xScale}
						yScale={resolveDistributionYScale(spec.axes?.y?.scale)}
						stack={resolveDistributionStackMode(spec.chartAppearance?.stack)}
						xAxisUnit={spec.formatting?.unit}
						decimalPrecision={decimalPrecision}
						customColors={spec.legend?.customColors ?? undefined}
						percentiles={percentiles}
						canPinTooltip
						renderTooltipFooter={renderTooltipFooter}
						onBarClick={enableDrillDown && onClick ? handleBarClick : undefined}
						legendPosition={resolveLegendPosition(spec.legend?.position)}
						isDarkMode={isDarkMode}
						width={containerDimensions.width}
						height={containerDimensions.height}
					/>
				)}
		</div>
	);
}

export default DistributionPanelRenderer;
