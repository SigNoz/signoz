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
	formatPercentileMarker,
	layoutMarkerLabels,
	resolveFocusedSeries,
	resolveHoveredSeries,
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
const OVERFLOW_DASH: [number, number] = [4, 3];
const OVERFLOW_AXIS_LABEL = '∞';
/** Headroom above the tallest bar: a fraction on linear, a factor on log. Marker
 *  labels sit at the top of the plot, so they take more. */
const LINEAR_HEADROOM = 1.1;
const LINEAR_HEADROOM_WITH_MARKERS = 1.3;
const LOG_HEADROOM = 2;
const LOG_HEADROOM_WITH_MARKERS = 6;
const MARKER_DASH: [number, number] = [3, 3];
const MARKER_FONT_SIZE_PX = 10;
const MARKER_LABEL_ROW_PX = 13;
const MARKER_LABEL_GAP_PX = 6;
const MARKER_LABEL_OFFSET_PX = 3;
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

/** Dashed lines across the plot, labels stacked in rows at the top so none overlap. */
function drawPercentileMarkers(
	u: uPlot,
	markers: DistributionPercentile[],
	formatBound: (value: number) => string,
	isDarkMode: boolean,
): void {
	if (markers.length === 0) {
		return;
	}
	const { ctx, bbox } = u;
	const { pxRatio } = uPlot;
	const color = isDarkMode ? themeColors.white : themeColors.black;

	ctx.save();
	ctx.font = `500 ${MARKER_FONT_SIZE_PX * pxRatio}px Inter, sans-serif`;
	ctx.textBaseline = 'top';

	const labels = markers.map((marker) => {
		const text = formatPercentileMarker(marker, formatBound);
		const x = u.valToPos(marker.axisValue, 'x', true);
		return { text, x, width: ctx.measureText(text).width };
	});
	const rows = layoutMarkerLabels(
		labels.map(({ x, width }) => ({
			x: x + MARKER_LABEL_OFFSET_PX * pxRatio,
			width,
		})),
		MARKER_LABEL_GAP_PX * pxRatio,
	);

	labels.forEach(({ text, x }, index) => {
		ctx.globalAlpha = 0.55;
		ctx.strokeStyle = color;
		ctx.lineWidth = pxRatio;
		ctx.setLineDash(MARKER_DASH.map((dash) => dash * pxRatio));
		ctx.beginPath();
		ctx.moveTo(x, bbox.top);
		ctx.lineTo(x, bbox.top + bbox.height);
		ctx.stroke();

		ctx.globalAlpha = 0.85;
		ctx.fillStyle = color;
		ctx.fillText(
			text,
			x + MARKER_LABEL_OFFSET_PX * pxRatio,
			bbox.top + rows[index] * MARKER_LABEL_ROW_PX * pxRatio,
		);
	});
	ctx.restore();
}

function drawOverflowBoundary(
	u: uPlot,
	xAxis: DistributionXAxis,
	isDarkMode: boolean,
): void {
	if (xAxis.overflowSplit === null || xAxis.edges.length < 3) {
		return;
	}
	const x = u.valToPos(xAxis.edges[xAxis.edges.length - 2], 'x', true);
	const { ctx, bbox } = u;
	ctx.save();
	ctx.strokeStyle = isDarkMode ? themeColors.white : themeColors.black;
	ctx.globalAlpha = 0.35;
	ctx.lineWidth = uPlot.pxRatio;
	ctx.setLineDash(OVERFLOW_DASH.map((dash) => dash * uPlot.pxRatio));
	ctx.beginPath();
	ctx.moveTo(x, bbox.top);
	ctx.lineTo(x, bbox.top + bbox.height);
	ctx.stroke();
	ctx.restore();
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
			const visible = axisSplits.filter((split) => split <= xAxis.max);
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
	const hover: { series: number | null; focused: number | null } = {
		series: null,
		focused: null,
	};
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
		drawOverflowBoundary(u, xAxis, isDarkMode);
		drawPercentileMarkers(u, markers, formatBound, isDarkMode);
	});

	// Registered as a hook, not a plugin, so it runs before TooltipPlugin's: the tooltip
	// only shows for a focused series, and must find it focused when it positions.
	builder.addHook('setCursor', (u: uPlot): void => {
		const { left = -1, top = -1 } = u.cursor;
		const isOnPlot = left >= 0 && top >= 0;
		const x = isOnPlot ? u.posToVal(left, 'x') : Number.NaN;
		const hovered = isOnPlot
			? resolveHoveredSeries(layout, x, u.posToVal(top, 'y'))
			: null;
		const focused = isOnPlot
			? resolveFocusedSeries(layout, hovered, resolveRowIndex(xAxis.edges, x))
			: null;

		if (focused !== hover.focused) {
			hover.focused = focused;
			u.setSeries(focused === null ? null : focused + 1, { focus: true });
		}
		if (hovered !== hover.series) {
			hover.series = hovered;
			u.redraw(true, false);
		}
	});

	return builder;
}
