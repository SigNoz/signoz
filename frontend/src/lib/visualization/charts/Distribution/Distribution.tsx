import { useCallback, useMemo, useRef } from 'react';
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
		const full = resolveDistributionXAxis(buckets);
		const visibleTotals = sumVisibleCounts(counts, visible, full.rows.length);
		// An explicit max may reach past the last occupied bucket; only auto-crop without one.
		const fitted =
			xMax === undefined ? cropDistributionXAxis(full, visibleTotals) : full;
		return {
			xAxis: clampDistributionXAxis(fitted, xMin, xMax),
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

	const drawnGroupLabels = useMemo(
		() =>
			drawn.sourceIndexes.map((source) =>
				source === null ? undefined : series[source].groupLabels,
			),
		[drawn, series],
	);

	const otherMembers = useMemo(
		() =>
			drawn.otherSourceIndexes.map((source) => ({
				sourceIndex: source,
				label: series[source].label,
				groupLabels: series[source].groupLabels,
				color: colors[source],
				counts: series[source].counts,
			})),
		[drawn, series, colors],
	);

	const onBarClickRef = useRef(onBarClick);
	onBarClickRef.current = onBarClick;
	const handleOtherMemberClick = useCallback(
		(source: number, coordinates: { x: number; y: number }): void => {
			onBarClickRef.current?.({
				series: series[source],
				color: colors[source],
				coordinates,
			});
		},
		[series, colors],
	);

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
				groupLabels={drawnGroupLabels}
				colors={drawn.colors}
				counts={drawn.counts}
				otherMembers={otherMembers}
				onOtherMemberClick={onBarClick ? handleOtherMemberClick : undefined}
				formatBound={formatBound}
				renderTooltipFooter={renderTooltipFooter}
			/>
		),
		[
			id,
			xAxis,
			layout,
			drawn,
			drawnGroupLabels,
			otherMembers,
			onBarClick,
			handleOtherMemberClick,
			formatBound,
			renderTooltipFooter,
		],
	);

	const handleClick = useDistributionBarClick({
		xAxis,
		layout,
		drawn,
		series,
		onBarClick,
	});

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
