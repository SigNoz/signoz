import { useCallback, useMemo, useRef } from 'react';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import DistributionTooltip from 'lib/uPlotV2/components/Tooltip/components/DistributionTooltip/DistributionTooltip';
import {
	LegendPosition,
	type TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { StackMode } from 'lib/uPlotV2/config/types';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { resolveBoundaryPrecision } from 'lib/visualization/charts/Heatmap/utils';
import { DistributionChartProps } from 'lib/visualization/charts/types';
import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';
import type { LegendLayout } from 'lib/visualization/layout/ChartLayout/ChartLayout';

import {
	clampDistributionXAxis,
	cropDistributionXAxis,
	resolveDistributionBars,
	resolveDistributionXAxis,
	sumVisibleCounts,
} from './layout';
import {
	computeDistributionPercentiles,
	resolveNearestSeries,
} from './percentiles';
import {
	groupIntoOther,
	resolveClickedGroup,
	resolveMaxDrawnGroups,
} from './topGroups';
import { DistributionYScale } from './types';

import styles from './Distribution.module.scss';
import {
	buildDistributionConfig,
	createBoundFormatter,
	resolveOtherColor,
	prepareDistributionChartData,
	resolveSeriesColor,
} from './utils';

/** Rough share of the panel width the plot gets, for fitting side-by-side bars. */
const PLOT_SHARE = 0.9;
const PLOT_SHARE_WITH_RIGHT_LEGEND = 0.65;
/** Vertical space the Other notice takes out of the container. */
const NOTICE_HEIGHT = 20;

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
	percentiles = [],
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
	const drawnVisible = useMemo(() => drawn.labels.map(() => true), [drawn]);

	const layout = useMemo(
		() =>
			resolveDistributionBars({
				xAxis,
				counts: drawn.counts,
				visible: drawnVisible,
				stack,
				isLogY,
			}),
		[xAxis, drawn, drawnVisible, stack, isLogY],
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
		() => createBoundFormatter(xAxisUnit, boundaryPrecision),
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
				visible: drawnVisible,
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
			drawnVisible,
			stack,
			isLogY,
			isDarkMode,
			markers,
			xAxisUnit,
			boundaryPrecision,
		],
	);

	const renderTooltip = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => (
			<DistributionTooltip
				uPlotInstance={args.uPlotInstance}
				isPinned={args.isPinned}
				dismiss={args.dismiss}
				xAxis={xAxis}
				layout={layout}
				labels={drawn.labels}
				colors={drawn.colors}
				counts={drawn.counts}
				visible={drawnVisible}
				markers={markers}
				formatBound={formatBound}
				renderTooltipFooter={renderTooltipFooter}
			/>
		),
		[
			xAxis,
			layout,
			drawn,
			drawnVisible,
			markers,
			formatBound,
			renderTooltipFooter,
		],
	);

	const onBarClickRef = useRef(onBarClick);
	onBarClickRef.current = onBarClick;

	const handleClick = useCallback(
		({
			xValue,
			yValue,
			absoluteMouseX,
			absoluteMouseY,
		}: ChartClickData): void => {
			const bucket = resolveRowIndex(xAxis.edges, xValue);
			const clicked = resolveClickedGroup(
				drawn,
				bucket === null
					? null
					: resolveNearestSeries(layout, bucket, xValue, yValue),
				series,
			);
			if (clicked) {
				onBarClickRef.current?.({
					...clicked,
					coordinates: { x: absoluteMouseX, y: absoluteMouseY },
				});
			}
		},
		[xAxis, layout, drawn, series],
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
				drawn.otherGroupCount > 0 ? Math.max(0, height - NOTICE_HEIGHT) : height
			}
			legendConfig={{ position: legendPosition }}
			showLegend={showLegend}
			customLegend={groupLegend}
			legendLabels={labels}
			showTooltip={showTooltip}
			canPinTooltip={canPinTooltip}
			decimalPrecision={decimalPrecision}
			customTooltip={renderTooltip}
			onClick={onBarClick ? handleClick : undefined}
			contentFooter={
				drawn.otherGroupCount > 0 && (
					<div className={styles.notice} data-testid="distribution-other-notice">
						Showing top {drawn.labels.length - 1} of {drawn.visibleGroupCount} groups;
						the rest are summed into Other.
					</div>
				)
			}
			renderTooltipFooter={renderTooltipFooter}
			tooltipPortalRoot={tooltipPortalRoot}
			layoutChildren={layoutChildren}
			data-testid={testId}
		/>
	);
}
