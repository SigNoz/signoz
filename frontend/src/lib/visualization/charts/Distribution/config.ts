import { PrecisionOption } from 'components/Graph/types';
import {
	DistributionType,
	DrawStyle,
	StackMode,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { createVariableWidthBarsPathBuilder } from 'lib/uPlotV2/paths/variableWidthBars';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { createHatchPattern } from 'lib/uPlotV2/plugins/HeatmapPlugin/paint';
import uPlot from 'uplot';

import { withOpacity } from './colors';
import {
	drawPercentileMarkers,
	MARKER_HIT_PX,
	PercentileMarkerHitArea,
	resolveHoveredMarker,
} from './drawPercentileMarkers';
import {
	DistributionBarsLayout,
	LOG_Y_BASE,
	resolveNearestSeries,
	thinLabelledSplits,
} from './layout';
import { DistributionPercentile, groupPercentileMarkers } from './percentiles';
import { DistributionXAxis } from './types';
import { createBoundFormatter } from './utils';

/** Minimum space between two x tick labels, in CSS pixels. */
const X_LABEL_GAP_PX = 12;
const BAR_GAP_PX = 1;
const BAR_OPACITY = 0.85;
const OVERFLOW_BAR_OPACITY = 0.4;
/** Every group but the hovered one fades to this. */
const DIMMED_BAR_OPACITY = 0.25;
const DIMMED_OVERFLOW_BAR_OPACITY = 0.12;
const OVERFLOW_AXIS_LABEL = '∞';
/** Headroom above the tallest bar: a fraction on linear, a factor on log. Marker
 *  labels sit at the top of the plot, so they take more. */
const LINEAR_HEADROOM = 1.1;
const LINEAR_HEADROOM_WITH_MARKERS = 1.3;
const LOG_HEADROOM = 2;
const LOG_HEADROOM_WITH_MARKERS = 6;

function resolveYRange({
	yMax,
	isLogY,
	stack,
	hasMarkers,
}: {
	yMax: number;
	isLogY: boolean;
	stack: StackMode;
	hasMarkers: boolean;
}): [number, number] {
	if (stack === StackMode.Percent) {
		return [0, hasMarkers ? 100 * LINEAR_HEADROOM_WITH_MARKERS : 100];
	}
	if (isLogY) {
		const headroom = hasMarkers ? LOG_HEADROOM_WITH_MARKERS : LOG_HEADROOM;
		return [LOG_Y_BASE, Math.max(yMax, LOG_Y_BASE) * headroom];
	}
	const headroom = hasMarkers ? LINEAR_HEADROOM_WITH_MARKERS : LINEAR_HEADROOM;
	return [0, yMax > 0 ? yMax * headroom : 1];
}

export interface BuildDistributionConfigArgs {
	id: string;
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	labels: string[];
	colors: string[];
	stack: StackMode;
	isLogY: boolean;
	isDarkMode: boolean;
	/** Drawn across the plot, labelled at the top. */
	markers: DistributionPercentile[];
	/** Unit of the bucket bounds; counts take none. */
	xAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}

export function buildDistributionConfig({
	id,
	xAxis,
	layout,
	labels,
	colors,
	stack,
	isLogY,
	isDarkMode,
	markers,
	xAxisUnit,
	decimalPrecision,
}: BuildDistributionConfigArgs): UPlotConfigBuilder {
	const builder = new UPlotConfigBuilder({ id });
	// uPlot's focus picks the series nearest in value, meaningless for stacked bars; the
	// setCursor hook focuses the one under the cursor itself. Alpha 1 leaves the
	// dimming to the bar fills.
	builder.setFocus({ alpha: 1 });
	builder.setCursor({ focus: { prox: -1 }, points: { show: false } });

	const formatBound = createBoundFormatter(xAxisUnit, decimalPrecision);

	builder.addScale({
		scaleKey: 'x',
		time: false,
		auto: false,
		range: (): [number, number] => [xAxis.min, xAxis.max],
	});
	const yRange = resolveYRange({
		yMax: layout.yMax,
		isLogY,
		stack,
		hasMarkers: markers.length > 0,
	});
	builder.addScale({
		scaleKey: 'y',
		time: false,
		auto: false,
		distribution: isLogY ? DistributionType.Logarithmic : DistributionType.Linear,
		range: (): [number, number] => yRange,
	});

	const axisSplits =
		xAxis.overflowSplit === null
			? xAxis.splits
			: [...xAxis.splits, xAxis.overflowSplit];
	const splitLabels = new Map<number, string>();
	xAxis.splits.forEach((split, index) => {
		splitLabels.set(split, formatBound(xAxis.rows[index].upper));
	});
	if (xAxis.overflowSplit !== null) {
		splitLabels.set(xAxis.overflowSplit, OVERFLOW_AXIS_LABEL);
	}

	const labelOf = (split: number): string =>
		splitLabels.get(split) ?? formatBound(xAxis.toBucketValue(split));

	builder.addAxis({
		scaleKey: 'x',
		side: 2,
		isDarkMode,
		// Thinned by each label's own width: bound labels run from `5 s` to
		// `16.67 mins`, so no fixed spacing keeps them apart.
		splits: (self, axisIdx): number[] => {
			const visible = axisSplits.filter(
				(split) => split >= xAxis.min && split <= xAxis.max,
			);
			const font = self.axes[axisIdx]?.font?.[0];
			if (font) {
				self.ctx.font = font;
			}
			const kept = thinLabelledSplits({
				positions: visible.map((split) => self.valToPos(split, 'x')),
				widths: visible.map(
					(split) => self.ctx.measureText(labelOf(split)).width / uPlot.pxRatio,
				),
				gap: X_LABEL_GAP_PX,
			});
			return kept.map((index) => visible[index]);
		},
		values: (_, splits): string[] => splits.map(labelOf),
	});
	builder.addAxis({
		scaleKey: 'y',
		side: 3,
		isDarkMode,
		yAxisUnit: stack === StackMode.Percent ? 'percent' : 'short',
		// The marker headroom runs a share axis past 100%, which labels nothing real.
		...(stack === StackMode.Percent && {
			filter: (_self: uPlot, splits: number[]): Array<number | null> =>
				splits.map((split) => (split <= 100 ? split : null)),
		}),
	});

	let hatchPattern: CanvasPattern | null | undefined;
	const getHatchPattern = (
		ctx: CanvasRenderingContext2D,
	): CanvasPattern | null => {
		hatchPattern ??= createHatchPattern(ctx, isDarkMode);
		return hatchPattern;
	};

	// Read by every series' fill on each draw; a change redraws the paths.
	const hover: {
		series: number | null;
		focused: number | null;
		marker: number | null;
	} = { series: null, focused: null, marker: null };
	const plotMarkers = groupPercentileMarkers(
		markers.filter(
			({ axisValue }) => axisValue >= xAxis.min && axisValue <= xAxis.max,
		),
	);
	let markerHitAreas: PercentileMarkerHitArea[] = [];
	const isDimmed = (seriesIndex: number): boolean =>
		hover.series !== null && hover.series !== seriesIndex;

	labels.forEach((label, seriesIndex) => {
		const color = colors[seriesIndex];
		builder.addSeries({
			scaleKey: 'y',
			label,
			drawStyle: DrawStyle.Bar,
			pathBuilder: createVariableWidthBarsPathBuilder({
				getBars: () => layout.rects[seriesIndex] ?? [],
				fill: () =>
					withOpacity(
						color,
						isDimmed(seriesIndex) ? DIMMED_BAR_OPACITY : BAR_OPACITY,
					),
				hatchedFill: () =>
					withOpacity(
						color,
						isDimmed(seriesIndex)
							? DIMMED_OVERFLOW_BAR_OPACITY
							: OVERFLOW_BAR_OPACITY,
					),
				getHatchPattern,
				gapPx: BAR_GAP_PX,
			}),
			lineColor: color,
			lineWidth: 0,
			colorMapping: {},
			isDarkMode,
			showPoints: false,
			spanGaps: false,
		});
	});

	builder.addHook('draw', (u: uPlot): void => {
		markerHitAreas = drawPercentileMarkers(
			u,
			plotMarkers,
			formatBound,
			isDarkMode,
			hover.marker,
		);
	});

	// Registered as a hook, not a plugin, so it runs before TooltipPlugin's: the tooltip
	// only shows for a focused series, and must find it focused when it positions.
	builder.addHook('setCursor', (u: uPlot): void => {
		const { left = -1, top = -1 } = u.cursor;
		const isOnPlot = left >= 0 && top >= 0;
		const x = isOnPlot ? u.posToVal(left, 'x') : Number.NaN;
		const bucket = isOnPlot ? resolveRowIndex(xAxis.edges, x) : null;
		const marker = isOnPlot
			? resolveHoveredMarker(markerHitAreas, left, top, MARKER_HIT_PX)
			: null;
		// Over a marker, the bars neither dim nor show their tooltip.
		const hovered =
			bucket === null || marker !== null
				? null
				: resolveNearestSeries(layout, bucket, x, u.posToVal(top, 'y'));
		// An empty bucket still gets a tooltip, as a bar chart's zero column does; with no
		// nearest group to name, the first stands in.
		const isEmptyBucket = bucket !== null && marker === null && hovered === null;
		const focused = isEmptyBucket && labels.length > 0 ? 0 : hovered;

		if (focused !== hover.focused) {
			hover.focused = focused;
			u.setSeries(focused === null ? null : focused + 1, { focus: true });
		}
		if (marker !== hover.marker) {
			// The crosshair would cut through the marker's badges.
			u.root
				.querySelectorAll<HTMLElement>('.u-cursor-x, .u-cursor-y')
				.forEach((line) => {
					line.style.visibility = marker === null ? '' : 'hidden';
				});
		}
		if (hovered !== hover.series || marker !== hover.marker) {
			hover.series = hovered;
			hover.marker = marker;
			u.redraw(true, false);
		}
	});

	return builder;
}
