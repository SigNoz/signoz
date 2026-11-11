import type uPlot from 'uplot';

import type { Quadtree } from '../../utils/quadtree';
import type { ScatterHit, ScatterPointSize, ScatterSeriesData } from './types';

export interface SizeDomain {
	min: number;
	max: number;
}

/** Size extent across all series, so equal values draw equal discs. */
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
 * Diameter for a size-channel value. Grows the disc's area, not its width,
 * linearly with the value, so a value twice as large reads as twice the ink.
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
 * The disc under the cursor, counting `tolerance` px beyond its edge as a hit.
 * Where discs overlap, the one whose centre is closest wins; `null` if none.
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
			const dx = cx - (hit.x + hit.w / 2);
			const dy = cy - (hit.y + hit.h / 2);
			const distance = dx * dx + dy * dy;
			const reach = hit.w / 2 + tolerance;
			if (distance > reach * reach) {
				return;
			}
			if (distance < bestDistance) {
				best = hit;
				bestDistance = distance;
			}
		},
	);

	return best;
}
