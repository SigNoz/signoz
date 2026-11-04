import { DistributionBarsLayout } from './layout';
import { DistributionXAxis } from './types';

export interface DistributionPercentile {
	/** 0–100, as configured. */
	percentile: number;
	/** The estimate; in overflow, the last finite bound it is known to exceed. */
	value: number;
	/** Where the marker is drawn, in x-scale space. */
	axisValue: number;
	isOverflow: boolean;
}

/**
 * Percentiles of the summed counts, by `histogram_quantile`'s method: find the bucket
 * holding the target rank and interpolate linearly inside it, with the lowest bucket
 * starting at zero. So the values match a time-series panel's percentiles.
 */
export function computeDistributionPercentiles({
	xAxis,
	totals,
	percentiles,
}: {
	xAxis: DistributionXAxis;
	/** Summed visible counts per bucket. */
	totals: number[];
	percentiles: number[];
}): DistributionPercentile[] {
	const { rows, edges } = xAxis;
	const total = totals.reduce((sum, count) => sum + count, 0);
	if (total <= 0 || rows.length === 0) {
		return [];
	}

	return percentiles.flatMap<DistributionPercentile>((percentile) => {
		const rank = (percentile / 100) * total;
		let below = 0;
		for (let index = 0; index < rows.length; index += 1) {
			const count = totals[index] ?? 0;
			if (count > 0 && below + count >= rank) {
				const row = rows[index];
				if (row.isOverflow) {
					return [
						{
							percentile,
							value: row.lower,
							axisValue: edges[index],
							isOverflow: true,
						},
					];
				}
				const fraction = (rank - below) / count;
				const lower = row.isUnderflow ? Math.min(0, row.upper) : row.lower;
				return [
					{
						percentile,
						value: lower + fraction * (row.upper - lower),
						axisValue: edges[index] + fraction * (edges[index + 1] - edges[index]),
						isOverflow: false,
					},
				];
			}
			below += count;
		}
		return [];
	});
}

export function formatPercentileName(percentile: number): string {
	return `p${Number(percentile.toFixed(3))}`;
}

/** `~p99` for an estimate; `p99 > 10 s` where only the overflow bound is known. */
export function formatPercentileMarker(
	marker: DistributionPercentile,
	formatBound: (value: number) => string,
): string {
	const name = formatPercentileName(marker.percentile);
	return marker.isOverflow
		? `${name} > ${formatBound(marker.value)}`
		: `~${name}`;
}

/** The series whose bar is under `(x, y)` in scale space, or `null`. */
export function resolveHoveredSeries(
	layout: DistributionBarsLayout,
	x: number,
	y: number,
): number | null {
	for (let series = 0; series < layout.rects.length; series += 1) {
		const hit = layout.rects[series].some(
			(rect) => x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y <= rect.y1,
		);
		if (hit) {
			return series;
		}
	}
	return null;
}

/**
 * The series the tooltip follows at `(x, y)`: the one under the cursor, else the
 * first with a bar in that bucket, so the tooltip shows anywhere over an occupied
 * bucket. `null` over an empty one.
 */
export function resolveFocusedSeries(
	layout: DistributionBarsLayout,
	hovered: number | null,
	bucket: number | null,
): number | null {
	if (hovered !== null) {
		return hovered;
	}
	if (bucket === null) {
		return null;
	}
	const series = layout.rects.findIndex((rects) =>
		rects.some((rect) => rect.bucketIndex === bucket),
	);
	return series === -1 ? null : series;
}

/**
 * Stacks marker labels into rows so none overlap: each goes in the first row whose
 * last label ends before it starts. Input and output are in the same pixel space.
 */
export function layoutMarkerLabels(
	labels: Array<{ x: number; width: number }>,
	gap: number,
): number[] {
	const rowEnds: number[] = [];
	const order = labels
		.map((label, index) => ({ ...label, index }))
		.sort((a, b) => a.x - b.x);
	const rows = new Array<number>(labels.length).fill(0);

	order.forEach(({ x, width, index }) => {
		let row = rowEnds.findIndex((end) => x >= end + gap);
		if (row === -1) {
			row = rowEnds.length;
			rowEnds.push(0);
		}
		rowEnds[row] = x + width;
		rows[index] = row;
	});

	return rows;
}
