import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	DistributionType,
	DrawStyle,
	StackMode,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { createVariableWidthBarsPathBuilder } from 'lib/uPlotV2/paths/variableWidthBars';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { createHatchPattern } from 'lib/uPlotV2/plugins/HeatmapPlugin/paint';
import { toAlphaHex } from 'lib/uPlotV2/utils/fillOpacity';
import uPlot from 'uplot';

import {
	DistributionBarsLayout,
	LOG_Y_BASE,
	thinLabelledSplits,
} from './layout';
import {
	DistributionPercentile,
	formatPercentileBadge,
	formatPercentileValue,
	groupPercentileMarkers,
	layoutMarkerLabels,
	PercentileMarkerHitArea,
	resolveHoveredMarker,
	resolveNearestSeries,
} from './percentiles';
import { DistributionXAxis } from './types';

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
const MARKER_DASH: [number, number] = [3, 3];
const MARKER_FONT_SIZE_PX = 9;
/** Space between a badge's name and its diamond's edges. */
const MARKER_BADGE_PADDING_PX = 2;
const MARKER_BADGE_GAP_PX = 2;
const MARKER_VALUE_FONT_SIZE_PX = 11;
/** How far from a marker line the cursor still hovers it, in CSS pixels. */
const MARKER_HIT_PX = 4;
const MARKER_PILL_PADDING_X_PX = 6;
const MARKER_PILL_PADDING_Y_PX = 3;
const MARKER_PILL_RADIUS_PX = 4;
/** Height of the pill's notch pointing up at the line; also its gap from the axis. */
const MARKER_PILL_POINTER_PX = 4;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function withOpacity(color: string, opacity: number): string {
	return HEX_COLOR.test(color) ? `${color}${toAlphaHex(opacity)}` : color;
}

export function createBoundFormatter(
	unit?: string,
	decimalPrecision?: PrecisionOption,
): (value: number) => string {
	return (value: number): string =>
		getToolTipValue(String(value), unit, decimalPrecision);
}

/** Neutral, so the summed remainder never reads as one more group. */
export function resolveOtherColor(isDarkMode: boolean): string {
	return isDarkMode ? Color.BG_VANILLA_400 : Color.BG_SLATE_50;
}

export function resolveSeriesColor(
	label: string,
	isDarkMode: boolean,
	customColors?: Record<string, string>,
): string {
	return (
		customColors?.[label] ??
		generateColor(
			label,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		)
	);
}

/**
 * `[bucket centres, ...counts per series]`. The series draw from the layout, so the
 * data only feeds uPlot's cursor and tooltip.
 */
export function prepareDistributionChartData(
	xAxis: DistributionXAxis,
	counts: number[][],
): uPlot.AlignedData {
	const centres = xAxis.rows.map(
		(_, index) => (xAxis.edges[index] + xAxis.edges[index + 1]) / 2,
	);
	return [
		centres,
		...counts.map((seriesCounts) =>
			centres.map((_, index) => seriesCounts[index] ?? 0),
		),
	] as unknown as uPlot.AlignedData;
}

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

/** A diamond centred on `(x, y)` with half-diagonals `rx` and `ry`, filled then outlined. */
function drawDiamond(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	fill: string,
	stroke: string,
): void {
	ctx.beginPath();
	ctx.moveTo(x, y - ry);
	ctx.lineTo(x + rx, y);
	ctx.lineTo(x, y + ry);
	ctx.lineTo(x - rx, y);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.stroke();
}

/**
 * Dashed lines across the plot with a diamond badge at each end naming the
 * percentile, one per group on the same spot; badges stack into rows so none overlap. The hovered marker is
 * emphasised and shows its value on the x axis. Returns each marker's hover targets.
 */
function drawPercentileMarkers(
	u: uPlot,
	markers: DistributionPercentile[][],
	formatBound: (value: number) => string,
	isDarkMode: boolean,
	hovered: number | null,
): PercentileMarkerHitArea[] {
	if (markers.length === 0) {
		return [];
	}
	const { ctx, bbox } = u;
	const { pxRatio } = uPlot;
	const color = isDarkMode ? themeColors.white : themeColors.black;
	const background = isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100;
	const bottom = bbox.top + bbox.height;

	ctx.save();
	ctx.font = `600 ${MARKER_FONT_SIZE_PX * pxRatio}px Inter, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const named = markers.map((group) => {
		const text = formatPercentileBadge(group);
		return { text, width: ctx.measureText(text).width };
	});
	// One square diamond for all, fitting the widest name's box: |dx| + |dy| ≤ r at
	// its corners. Cap height stands in for the text's height.
	const r =
		(Math.max(...named.map(({ width }) => width)) +
			MARKER_FONT_SIZE_PX * pxRatio * 0.7) /
			2 +
		MARKER_BADGE_PADDING_PX * pxRatio;
	const [rx, ry] = [r, r];
	const badges = markers.map((group, index) => ({
		text: named[index].text,
		x: u.valToPos(group[0].axisValue, 'x', true),
	}));
	const rows = layoutMarkerLabels(
		badges.map(({ x }) => ({ x: x - rx, width: 2 * rx })),
		MARKER_BADGE_GAP_PX * pxRatio,
	);
	const rowStep = 2 * ry + MARKER_BADGE_GAP_PX * pxRatio;
	const badgeCentres = (index: number): [number, number] => {
		const offset = ry + rows[index] * rowStep;
		return [bbox.top + offset, bottom - offset];
	};

	const drawMarker = (index: number): void => {
		const { text, x } = badges[index];
		const isHovered = index === hovered;

		ctx.globalAlpha = isHovered ? 1 : 0.55;
		ctx.strokeStyle = color;
		ctx.lineWidth = pxRatio;
		ctx.setLineDash(MARKER_DASH.map((dash) => dash * pxRatio));
		ctx.beginPath();
		ctx.moveTo(x, bbox.top);
		ctx.lineTo(x, bottom);
		ctx.stroke();

		ctx.globalAlpha = 1;
		ctx.setLineDash([]);
		badgeCentres(index).forEach((y) => {
			drawDiamond(ctx, x, y, rx, ry, isHovered ? color : background, color);
			ctx.fillStyle = isHovered ? background : color;
			ctx.fillText(text, x, y);
		});

		if (!isHovered) {
			return;
		}
		// The value sits on the x axis under the line, over the tick labels, in a pill
		// whose notch points up at the line.
		ctx.font = `500 ${MARKER_VALUE_FONT_SIZE_PX * pxRatio}px Inter, sans-serif`;
		const value = formatPercentileValue(markers[index], formatBound);
		const padX = MARKER_PILL_PADDING_X_PX * pxRatio;
		const padY = MARKER_PILL_PADDING_Y_PX * pxRatio;
		const pointer = MARKER_PILL_POINTER_PX * pxRatio;
		const width = ctx.measureText(value).width + 2 * padX;
		const height = MARKER_VALUE_FONT_SIZE_PX * pxRatio + 2 * padY;
		const left = Math.min(Math.max(x - width / 2, 0), ctx.canvas.width - width);
		const top = bottom + 2 * pointer;
		const notchX = Math.min(
			Math.max(x, left + pointer + MARKER_PILL_RADIUS_PX * pxRatio),
			left + width - pointer - MARKER_PILL_RADIUS_PX * pxRatio,
		);
		// A halo in the chart's background hides the tick labels it overlaps.
		ctx.fillStyle = background;
		ctx.fillRect(left - padX, top, width + 2 * padX, height + 2 * padY);
		ctx.fillStyle = isDarkMode ? Color.BG_SLATE_400 : Color.BG_INK_400;
		ctx.beginPath();
		ctx.roundRect(left, top, width, height, MARKER_PILL_RADIUS_PX * pxRatio);
		ctx.moveTo(notchX - pointer, top);
		ctx.lineTo(notchX, top - pointer);
		ctx.lineTo(notchX + pointer, top);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = Color.BG_VANILLA_100;
		ctx.fillText(value, left + width / 2, top + height / 2);
	};

	// The hovered one last, so it draws over its neighbours.
	badges.forEach((_, index) => index !== hovered && drawMarker(index));
	if (hovered !== null && hovered < badges.length) {
		drawMarker(hovered);
	}
	ctx.restore();

	return badges.map(({ x }, index) => {
		const toPlot = (value: number, origin: number): number =>
			(value - origin) / pxRatio;
		return {
			x: toPlot(x, bbox.left),
			badges: badgeCentres(index).map((y) => ({
				left: toPlot(x - rx, bbox.left),
				right: toPlot(x + rx, bbox.left),
				top: toPlot(y - ry, bbox.top),
				bottom: toPlot(y + ry, bbox.top),
			})),
		};
	});
}

export interface BuildDistributionConfigArgs {
	id: string;
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	labels: string[];
	colors: string[];
	visible: boolean[];
	stack: StackMode;
	isLogY: boolean;
	isDarkMode: boolean;
	/** Drawn across the plot, labelled at the top. */
	markers: DistributionPercentile[];
	/** Unit of the bucket bounds; counts take none. */
	xAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}

/** Focused over an empty bucket, which has no nearest group to name. */
const FIRST_SERIES = 0;

export function buildDistributionConfig({
	id,
	xAxis,
	layout,
	labels,
	colors,
	visible,
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
	// From the bounds themselves: inverting a log transform rounds 128 to 127.99….
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
			show: visible[seriesIndex],
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
		// An empty bucket still gets a tooltip, as a bar chart's zero column does.
		const focused =
			bucket === null || marker !== null || hovered !== null
				? hovered
				: FIRST_SERIES;

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
