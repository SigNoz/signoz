import { StackMode } from 'lib/uPlotV2/config/types';
import {
	cropHeatmapYAxis,
	resolveHeatmapYAxis,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { HeatmapAxisScale } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import { DistributionBarRect, DistributionXAxis } from './types';

/** Bottom of a log count axis: a bar has to start somewhere above zero. */
export const LOG_Y_BASE = 1;

/**
 * N bounds give N + 1 buckets: `≤ first`, the finite ones, and `> last`. Every bucket
 * is equally wide: bucket `i` spans `[i, i + 1]`, and ticks still name the bounds.
 */
export function resolveDistributionXAxis(buckets: number[]): DistributionXAxis {
	const { rows, overflowSplit } = resolveHeatmapYAxis(
		buckets,
		HeatmapAxisScale.Linear,
	);
	const edges = rows.map((_, index) => index).concat(rows.length);
	return {
		rows,
		edges,
		splits: rows.slice(0, -1).map((_, index) => index + 1),
		overflowSplit: overflowSplit === null ? null : rows.length,
		toBucketValue: (axisValue: number): number => {
			const index = Math.min(rows.length - 1, Math.max(0, Math.floor(axisValue)));
			const row = rows[index];
			return row.lower + (axisValue - index) * (row.upper - row.lower);
		},
		min: 0,
		max: rows.length,
	};
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

/**
 * Narrows the axis window to the buckets overlapping `[min, max]`, never below one.
 * A bucket straddling a bound stays whole: cutting it would misstate its count.
 */
export function clampDistributionXAxis(
	axis: DistributionXAxis,
	min?: number,
	max?: number,
): DistributionXAxis {
	const { rows, edges } = axis;
	let first = edges.indexOf(axis.min);
	let last = edges.indexOf(axis.max) - 1;
	while (min !== undefined && first < last && rows[first].upper <= min) {
		first += 1;
	}
	while (max !== undefined && last > first && rows[last].lower >= max) {
		last -= 1;
	}
	return {
		...axis,
		overflowSplit: rows[last].isOverflow ? axis.overflowSplit : null,
		min: edges[first],
		max: edges[last + 1],
	};
}

export interface DistributionBarsLayout {
	/** One list per series, in series order. */
	rects: DistributionBarRect[][];
	/** Top of the tallest bar, for the count axis range. */
	yMax: number;
}

/**
 * Every bar, in scale space. `normal` stacks the series in each bucket, `percent`
 * stacks their shares of it, `none` splits the bucket width between them.
 */
export function resolveDistributionBars({
	xAxis,
	counts,
	stack,
	isLogY,
}: {
	xAxis: DistributionXAxis;
	/** `counts[series][bucket]`. */
	counts: number[][];
	stack: StackMode;
	isLogY: boolean;
}): DistributionBarsLayout {
	const { rows, edges } = xAxis;
	const rects: DistributionBarRect[][] = counts.map(() => []);
	const base = isLogY ? LOG_Y_BASE : 0;
	let yMax = 0;

	rows.forEach((row, bucketIndex) => {
		const x0 = edges[bucketIndex];
		const x1 = edges[bucketIndex + 1];
		const total = counts.reduce(
			(sum, seriesCounts) => sum + (seriesCounts[bucketIndex] ?? 0),
			0,
		);
		let cumulative = 0;

		counts.forEach((seriesCounts, seriesIndex) => {
			const count = seriesCounts[bucketIndex] ?? 0;
			if (count <= 0) {
				return;
			}
			const bar = { bucketIndex, hatched: row.isOverflow };

			if (stack === StackMode.None) {
				// Below the log base a bar would draw downwards from the axis.
				if (count <= base) {
					return;
				}
				const width = (x1 - x0) / counts.length;
				rects[seriesIndex].push({
					...bar,
					x0: x0 + seriesIndex * width,
					x1: x0 + (seriesIndex + 1) * width,
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
			if (y1 <= base) {
				return;
			}
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

/**
 * The group nearest `(x, y)` vertically in `bucket`, as uPlot focuses bar series;
 * side by side, only the sub-bar under `x` competes. `null` over an empty bucket.
 */
export function resolveNearestSeries(
	layout: DistributionBarsLayout,
	bucket: number,
	x: number,
	y: number,
): number | null {
	const candidates = layout.rects.flatMap((rects, series) =>
		rects
			.filter((rect) => rect.bucketIndex === bucket)
			.map((rect) => ({ rect, series })),
	);
	const underX = candidates.filter(({ rect }) => x >= rect.x0 && x < rect.x1);
	let nearest: number | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	(underX.length > 0 ? underX : candidates).forEach(({ rect, series }) => {
		const distance = Math.max(rect.y0 - y, y - rect.y1, 0);
		if (distance < nearestDistance) {
			nearest = series;
			nearestDistance = distance;
		}
	});
	return nearest;
}

/**
 * Indexes of the ticks whose centred labels fit without touching, walking from the
 * right so the `∞` edge survives. Positions and widths share one pixel space.
 */
export function thinLabelledSplits({
	positions,
	widths,
	gap,
}: {
	positions: number[];
	widths: number[];
	gap: number;
}): number[] {
	const kept: number[] = [];
	let leftEdge = Number.POSITIVE_INFINITY;
	for (let index = positions.length - 1; index >= 0; index -= 1) {
		const half = widths[index] / 2;
		if (positions[index] + half + gap <= leftEdge) {
			kept.push(index);
			leftEdge = positions[index] - half;
		}
	}
	return kept.reverse();
}
