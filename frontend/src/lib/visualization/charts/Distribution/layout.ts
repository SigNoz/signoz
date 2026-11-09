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
