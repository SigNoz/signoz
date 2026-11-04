import { StackMode } from 'lib/uPlotV2/config/types';
import {
	cropHeatmapYAxis,
	resolveHeatmapYAxis,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { HeatmapAxisScale } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import {
	DistributionBarRect,
	DistributionXAxis,
	DistributionXScale,
} from './types';

/** Below this span of positive bounds, auto keeps the axis linear. */
const MIN_LOG_DECADES = 2;

/** Bottom of a log count axis: a bar has to start somewhere above zero. */
export const LOG_Y_BASE = 1;

const SCALE_TO_HEATMAP: Record<
	Exclude<DistributionXScale, DistributionXScale.Ordinal>,
	HeatmapAxisScale
> = {
	[DistributionXScale.Auto]: HeatmapAxisScale.Auto,
	[DistributionXScale.Linear]: HeatmapAxisScale.Linear,
	[DistributionXScale.Log]: HeatmapAxisScale.Log,
	[DistributionXScale.Symlog]: HeatmapAxisScale.Symlog,
};

function spansDecades(bounds: number[], decades: number): boolean {
	const positive = bounds.filter((bound) => bound > 0);
	if (positive.length < 2) {
		return false;
	}
	const ratio = Math.max(...positive) / Math.min(...positive);
	return Math.log10(ratio) >= decades;
}

function resolveAutoScale(bounds: number[]): HeatmapAxisScale {
	const hasNegative = bounds.some((bound) => bound < 0);
	if (!hasNegative && !spansDecades(bounds, MIN_LOG_DECADES)) {
		return HeatmapAxisScale.Linear;
	}
	return HeatmapAxisScale.Auto;
}

/** Row `i` spans `[i, i + 1]`; within it, value interpolates across the row's bounds. */
function toOrdinalAxis(axis: DistributionXAxis): DistributionXAxis {
	const { rows } = axis;
	const edges = rows.map((_, index) => index).concat(rows.length);
	return {
		rows,
		edges,
		splits: rows.slice(0, -1).map((_, index) => index + 1),
		overflowSplit: axis.overflowSplit === null ? null : rows.length,
		toBucketValue: (axisValue: number): number => {
			const index = Math.min(rows.length - 1, Math.max(0, Math.floor(axisValue)));
			const row = rows[index];
			return row.lower + (axisValue - index) * (row.upper - row.lower);
		},
		min: 0,
		max: rows.length,
	};
}

/** N bounds give N + 1 buckets: `≤ first`, the finite ones, and `> last`. */
export function resolveDistributionXAxis(
	buckets: number[],
	scale: DistributionXScale,
): DistributionXAxis {
	if (scale === DistributionXScale.Ordinal) {
		return toOrdinalAxis(resolveHeatmapYAxis(buckets, HeatmapAxisScale.Linear));
	}
	const heatmapScale =
		scale === DistributionXScale.Auto
			? resolveAutoScale(buckets)
			: SCALE_TO_HEATMAP[scale];
	return resolveHeatmapYAxis(buckets, heatmapScale);
}

/** Sum of each bucket across the visible series. */
export function sumVisibleCounts(
	counts: number[][],
	visible: boolean[],
	bucketCount: number,
): number[] {
	const totals = new Array<number>(bucketCount).fill(0);
	counts.forEach((seriesCounts, seriesIndex) => {
		if (!visible[seriesIndex]) {
			return;
		}
		for (let bucket = 0; bucket < bucketCount; bucket += 1) {
			totals[bucket] += seriesCounts[bucket] ?? 0;
		}
	});
	return totals;
}

/** Drops empty buckets past the last occupied one, as the heatmap does. */
export function cropDistributionXAxis(
	axis: DistributionXAxis,
	totals: number[],
): DistributionXAxis {
	return cropHeatmapYAxis(
		axis,
		totals.map((total) => [total]),
	);
}

export interface DistributionBarsLayout {
	/** One list per series, in series order; a hidden series has none. */
	rects: DistributionBarRect[][];
	/** Top of the tallest bar, for the count axis range. */
	yMax: number;
}

/**
 * Every bar, in scale space. `normal` stacks the visible series in each bucket,
 * `percent` stacks their shares of it, `none` splits the bucket width between them.
 */
export function resolveDistributionBars({
	xAxis,
	counts,
	visible,
	stack,
	isLogY,
}: {
	xAxis: DistributionXAxis;
	/** `counts[series][bucket]`. */
	counts: number[][];
	visible: boolean[];
	stack: StackMode;
	isLogY: boolean;
}): DistributionBarsLayout {
	const { rows, edges } = xAxis;
	const rects: DistributionBarRect[][] = counts.map(() => []);
	const visibleSeries = counts
		.map((_, seriesIndex) => seriesIndex)
		.filter((seriesIndex) => visible[seriesIndex]);
	const base = isLogY ? LOG_Y_BASE : 0;
	const totals = sumVisibleCounts(counts, visible, rows.length);
	let yMax = 0;

	rows.forEach((row, bucketIndex) => {
		const x0 = edges[bucketIndex];
		const x1 = edges[bucketIndex + 1];
		const total = totals[bucketIndex];
		let cumulative = 0;

		visibleSeries.forEach((seriesIndex, position) => {
			const count = counts[seriesIndex][bucketIndex] ?? 0;
			if (count <= 0) {
				return;
			}
			const bar = { bucketIndex, hatched: row.isOverflow };

			if (stack === StackMode.None) {
				const width = (x1 - x0) / visibleSeries.length;
				rects[seriesIndex].push({
					...bar,
					x0: x0 + position * width,
					x1: x0 + (position + 1) * width,
					y0: base,
					y1: count,
				});
				yMax = Math.max(yMax, count);
				return;
			}

			const scale = stack === StackMode.Percent ? 100 / total : 1;
			const y0 = cumulative * scale;
			cumulative += count;
			const y1 = cumulative * scale;
			rects[seriesIndex].push({
				...bar,
				x0,
				x1,
				y0: Math.max(y0, base),
				y1,
			});
			yMax = Math.max(yMax, y1);
		});
	});

	return { rects, yMax };
}
