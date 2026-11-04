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
import { decimateAxisSplits } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { createHatchPattern } from 'lib/uPlotV2/plugins/HeatmapPlugin/paint';
import { toAlphaHex } from 'lib/uPlotV2/utils/fillOpacity';
import uPlot from 'uplot';

import { DistributionBarsLayout, LOG_Y_BASE } from './layout';
import { DistributionXAxis } from './types';

/** Minimum gap between x tick labels, in CSS pixels. */
const MIN_X_TICK_GAP_PX = 56;
const BAR_GAP_PX = 1;
const BAR_OPACITY = 0.85;
const OVERFLOW_BAR_OPACITY = 0.4;
const OVERFLOW_DASH: [number, number] = [4, 3];
const OVERFLOW_AXIS_LABEL = '∞';
/** Headroom above the tallest bar: a fraction on linear, a factor on log. */
const LINEAR_HEADROOM = 1.1;
const LOG_HEADROOM = 2;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function withOpacity(color: string, opacity: number): string {
	return HEX_COLOR.test(color) ? `${color}${toAlphaHex(opacity)}` : color;
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

function resolveYRange(
	yMax: number,
	isLogY: boolean,
	stack: StackMode,
): [number, number] {
	if (stack === StackMode.Percent) {
		return [0, 100];
	}
	if (isLogY) {
		return [LOG_Y_BASE, Math.max(yMax, LOG_Y_BASE) * LOG_HEADROOM];
	}
	return [0, yMax > 0 ? yMax * LINEAR_HEADROOM : 1];
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
	xAxisUnit,
	decimalPrecision,
}: BuildDistributionConfigArgs): UPlotConfigBuilder {
	const builder = new UPlotConfigBuilder({ id });
	builder.setCursor({ focus: { prox: -1 }, points: { show: false } });

	const formatBound = (value: number): string =>
		getToolTipValue(String(value), xAxisUnit, decimalPrecision);

	builder.addScale({
		scaleKey: 'x',
		time: false,
		auto: false,
		range: (): [number, number] => [xAxis.min, xAxis.max],
	});
	const yRange = resolveYRange(layout.yMax, isLogY, stack);
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

	builder.addAxis({
		scaleKey: 'x',
		side: 2,
		isDarkMode,
		splits: (self): number[] =>
			decimateAxisSplits({
				splits: axisSplits,
				min: xAxis.min,
				max: xAxis.max,
				plotHeight: self.bbox.width / uPlot.pxRatio,
				minGapPx: MIN_X_TICK_GAP_PX,
			}),
		values: (_, splits): string[] =>
			splits.map(
				(split) =>
					splitLabels.get(split) ?? formatBound(xAxis.toBucketValue(split)),
			),
	});
	builder.addAxis({
		scaleKey: 'y',
		side: 3,
		isDarkMode,
		yAxisUnit: stack === StackMode.Percent ? 'percent' : 'short',
	});

	let hatchPattern: CanvasPattern | null | undefined;
	const getHatchPattern = (
		ctx: CanvasRenderingContext2D,
	): CanvasPattern | null => {
		hatchPattern ??= createHatchPattern(ctx, isDarkMode);
		return hatchPattern;
	};

	labels.forEach((label, seriesIndex) => {
		const color = colors[seriesIndex];
		builder.addSeries({
			scaleKey: 'y',
			label,
			drawStyle: DrawStyle.Bar,
			pathBuilder: createVariableWidthBarsPathBuilder({
				getBars: () => layout.rects[seriesIndex] ?? [],
				fill: withOpacity(color, BAR_OPACITY),
				hatchedFill: withOpacity(color, OVERFLOW_BAR_OPACITY),
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

	builder.addHook('draw', (u: uPlot): void =>
		drawOverflowBoundary(u, xAxis, isDarkMode),
	);

	return builder;
}
