import { useCallback, useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import {
	LegendPosition,
	type TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { createBucketValueFormatter } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { StackMode } from 'lib/uPlotV2/config/types';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import { resolveBoundaryPrecision } from 'lib/visualization/charts/Heatmap/utils';
import { DistributionChartProps } from 'lib/visualization/charts/types';
import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';
import type { LegendLayout } from 'lib/visualization/layout/ChartLayout/ChartLayout';

import { resolveOtherColor } from 'lib/visualization/charts/utils/otherGroup';

import { resolveSeriesColor } from './colors';
import DistributionTooltip from './components/DistributionTooltip/DistributionTooltip';
import { buildDistributionConfig } from './config';
import {
	clampDistributionXAxis,
	cropDistributionXAxis,
	resolveDistributionBars,
	resolveDistributionXAxis,
	sumVisibleCounts,
} from './layout';
import { computeDistributionPercentiles } from './percentiles';
import { groupIntoOther, resolveMaxDrawnGroups } from './topGroups';
import { DistributionYScale } from './types';
import { useDistributionBarClick } from './useDistributionBarClick';

import { prepareDistributionChartData } from './utils';

/** Rough share of the panel width the plot gets, for fitting side-by-side bars. */
const PLOT_SHARE = 0.9;
const PLOT_SHARE_WITH_RIGHT_LEGEND = 0.65;
/** Vertical space the Other notice takes out of the container. */
const NOTICE_HEIGHT = 20;
const NO_PERCENTILES: readonly number[] = Object.freeze([]);

export default function Distribution({
	id,
	buckets,
	series,
	width,
	height,
	isDarkMode,
	xMin,
	xMax,
	yScale = DistributionYScale.Linear,
	stack = StackMode.Normal,
	xAxisUnit,
	decimalPrecision,
	customColors,
	percentiles = NO_PERCENTILES,
	onBarClick,
	showLegend = true,
	legendPosition = LegendPosition.BOTTOM,
	showTooltip = true,
	canPinTooltip = false,
	renderTooltipFooter,
	tooltipPortalRoot,
	layoutChildren,
	'data-testid': testId,
}: DistributionChartProps): JSX.Element {
	const labels = useMemo(() => series.map((entry) => entry.label), [series]);
	const counts = useMemo(() => series.map((entry) => entry.counts), [series]);

	const { visibleKeys, focusedSeriesIndex, onLegendAction } =
		useLegendVisibility({ keys: labels, indexOffset: 1, id });

	const visible = useMemo(
		() => labels.map((label) => visibleKeys.includes(label)),
		[labels, visibleKeys],
	);

	const colors = useMemo(
		() =>
			labels.map((label) => resolveSeriesColor(label, isDarkMode, customColors)),
		[labels, isDarkMode, customColors],
	);

	const { xAxis, totals } = useMemo(() => {
		const fullXAxis = resolveDistributionXAxis(buckets);
		const visibleTotals = sumVisibleCounts(
			counts,
			visible,
			fullXAxis.rows.length,
		);
		// An explicit max may reach past the last occupied bucket; only auto-crop without one.
		const croppedXAxis =
			xMax === undefined
				? cropDistributionXAxis(fullXAxis, visibleTotals)
				: fullXAxis;
		return {
			xAxis: clampDistributionXAxis(croppedXAxis, xMin, xMax),
			totals: visibleTotals,
		};
	}, [buckets, xMin, xMax, counts, visible]);

	// Over the visible groups combined, so a legend toggle moves them without a refetch.
	const markers = useMemo(
		() => computeDistributionPercentiles({ xAxis, totals, percentiles }),
		[xAxis, totals, percentiles],
	);

	const isLogY =
		yScale === DistributionYScale.Log && stack !== StackMode.Percent;

	// The legend lists every group; the plot draws the largest and sums the rest into
	// Other, so a toggle re-ranks without a refetch.
	const drawn = useMemo(
		() =>
			groupIntoOther({
				labels,
				counts,
				colors,
				visible,
				maxGroups: resolveMaxDrawnGroups({
					stack,
					xAxis,
					plotWidth:
						width *
						(legendPosition === LegendPosition.RIGHT
							? PLOT_SHARE_WITH_RIGHT_LEGEND
							: PLOT_SHARE),
				}),
				otherColor: resolveOtherColor(isDarkMode),
			}),
		[
			labels,
			counts,
			colors,
			visible,
			stack,
			xAxis,
			width,
			legendPosition,
			isDarkMode,
		],
	);

	const layout = useMemo(
		() =>
			resolveDistributionBars({
				xAxis,
				counts: drawn.counts,
				stack,
				isLogY,
			}),
		[xAxis, drawn, stack, isLogY],
	);

	const boundaryPrecision = useMemo(
		() =>
			resolveBoundaryPrecision({
				yAxis: xAxis,
				yAxisUnit: xAxisUnit,
				decimalPrecision,
			}),
		[xAxis, xAxisUnit, decimalPrecision],
	);

	const formatBound = useMemo(
		() => createBucketValueFormatter(xAxisUnit, boundaryPrecision),
		[xAxisUnit, boundaryPrecision],
	);

	const config = useMemo(
		() =>
			buildDistributionConfig({
				id,
				xAxis,
				layout,
				labels: drawn.labels,
				colors: drawn.colors,
				stack,
				isLogY,
				isDarkMode,
				markers,
				xAxisUnit,
				decimalPrecision: boundaryPrecision,
			}),
		[
			id,
			xAxis,
			layout,
			drawn,
			stack,
			isLogY,
			isDarkMode,
			markers,
			xAxisUnit,
			boundaryPrecision,
		],
	);

	const otherMembers = useMemo(
		() =>
			drawn.otherSourceIndexes.map((source) => ({
				sourceIndex: source,
				label: series[source].label,
				color: colors[source],
				counts: series[source].counts,
			})),
		[drawn, series, colors],
	);

	const {
		onClick: handleClick,
		shouldPinOnClick,
		onOtherMemberClick,
	} = useDistributionBarClick({
		xAxis,
		layout,
		drawn,
		series,
		colors,
		onBarClick,
	});

	const renderTooltip = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => (
			<DistributionTooltip
				id={id}
				uPlotInstance={args.uPlotInstance}
				isPinned={args.isPinned}
				dismiss={args.dismiss}
				xAxis={xAxis}
				layout={layout}
				labels={drawn.labels}
				colors={drawn.colors}
				counts={drawn.counts}
				otherMembers={otherMembers}
				onOtherMemberClick={onOtherMemberClick}
				formatBound={formatBound}
				renderTooltipFooter={renderTooltipFooter}
			/>
		),
		[
			id,
			xAxis,
			layout,
			drawn,
			otherMembers,
			onOtherMemberClick,
			formatBound,
			renderTooltipFooter,
		],
	);

	const data = useMemo(
		() => prepareDistributionChartData(xAxis, drawn.counts),
		[xAxis, drawn],
	);

	const legendItems = useMemo<LegendItem[]>(
		() =>
			labels.map((label, index) => ({
				seriesIndex: index + 1,
				label,
				color: colors[index],
				show: visible[index],
			})),
		[labels, colors, visible],
	);

	const groupLegend = useCallback(
		({ averageLegendWidth, showSearch }: LegendLayout): React.ReactNode => (
			<Legend
				items={legendItems}
				position={legendPosition}
				averageLegendWidth={averageLegendWidth}
				showSearch={showSearch}
				itemLabel="groups"
				focusedSeriesIndex={focusedSeriesIndex}
				onAction={onLegendAction}
			/>
		),
		[legendItems, legendPosition, focusedSeriesIndex, onLegendAction],
	);

	return (
		<ChartWrapper
			config={config}
			data={data}
			width={width}
			height={
				drawn.otherSourceIndexes.length > 0
					? Math.max(0, height - NOTICE_HEIGHT)
					: height
			}
			legendConfig={{ position: legendPosition }}
			showLegend={showLegend}
			customLegend={groupLegend}
			legendLabels={labels}
			showTooltip={showTooltip}
			canPinTooltip={canPinTooltip}
			decimalPrecision={decimalPrecision}
			customTooltip={renderTooltip}
			onClick={handleClick}
			shouldPinOnClick={shouldPinOnClick}
			contentFooter={
				drawn.otherSourceIndexes.length > 0 && (
					<Typography
						variant="paragraph"
						as="div"
						size="small"
						weight="regular"
						color="secondary"
						textOverflow="wrap"
						paddingX={4}
						paddingY={2}
						testId="distribution-other-notice"
					>
						Showing top {drawn.labels.length - 1} of {drawn.visibleGroupCount} groups;
						the rest are summed into Other.
					</Typography>
				)
			}
			renderTooltipFooter={renderTooltipFooter}
			tooltipPortalRoot={tooltipPortalRoot}
			layoutChildren={layoutChildren}
			data-testid={testId}
		/>
	);
}
