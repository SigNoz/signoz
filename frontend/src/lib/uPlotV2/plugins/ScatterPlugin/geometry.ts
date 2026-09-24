import type uPlot from 'uplot';

import type { Quadtree } from '../../utils/quadtree';
import type { ScatterHit, ScatterPointSize, ScatterSeriesData } from './types';

export interface SizeDomain {
	min: number;
	max: number;
}

/**
 * Extent of the size column across every series, so equal values draw equal
 * discs whichever group they belong to. `null` when nothing carries a size.
 */
export function resolveSizeDomain(data: uPlot.AlignedData): SizeDomain | null {
	let min = Infinity;
	let max = -Infinity;
	for (let seriesIndex = 1; seriesIndex < data.length; seriesIndex++) {
		const sizes = (data[seriesIndex] as unknown as ScatterSeriesData)[2];
		if (!sizes) {
			continue;
		}
		for (const size of sizes) {
			if (size == null || !Number.isFinite(size)) {
				continue;
			}
			min = Math.min(min, size);
			max = Math.max(max, size);
		}
	}
	return min <= max ? { min, max } : null;
}

/**
 * Disc diameter for a size value. Area, not diameter, follows the value: a
 * point worth twice as much should look twice as big.
 */
export function resolvePointDiameter(
	size: number | null | undefined,
	domain: SizeDomain | null,
	pointSize: ScatterPointSize,
): number {
	if (size == null || domain == null || !Number.isFinite(size)) {
		return pointSize.fixed;
	}
	if (domain.max === domain.min) {
		return (pointSize.min + pointSize.max) / 2;
	}
	const t = Math.min(
		1,
		Math.max(0, (size - domain.min) / (domain.max - domain.min)),
	);
	const minArea = pointSize.min ** 2;
	const maxArea = pointSize.max ** 2;
	return Math.sqrt(minArea + (maxArea - minArea) * t);
}

/**
 * Nearest disc under the cursor, or `null`. Overlapping discs resolve to the one
 * whose centre is closest; `tolerance` widens every disc so thin points stay
 * hoverable.
 */
export function resolveHit(
	tree: Quadtree<ScatterHit>,
	cx: number,
	cy: number,
	tolerance: number,
): ScatterHit | null {
	let best: ScatterHit | null = null;
	let bestDistance = Infinity;

	tree.get(
		cx - tolerance,
		cy - tolerance,
		tolerance * 2,
		tolerance * 2,
		(hit) => {
			const left = hit.x - tolerance;
			const top = hit.y - tolerance;
			const right = hit.x + hit.w + tolerance;
			const bottom = hit.y + hit.h + tolerance;
			if (cx < left || cx > right || cy < top || cy > bottom) {
				return;
			}
			const dx = cx - (hit.x + hit.w / 2);
			const dy = cy - (hit.y + hit.h / 2);
			const distance = dx * dx + dy * dy;
			if (distance < bestDistance) {
				best = hit;
				bestDistance = distance;
			}
		},
	);

	return best;
}
