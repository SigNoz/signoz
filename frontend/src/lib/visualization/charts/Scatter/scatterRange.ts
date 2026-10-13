import { DistributionType } from 'lib/uPlotV2/config/types';
import { DEFAULT_ASINH_THRESHOLD } from 'lib/uPlotV2/utils/scale';
import uPlot from 'uplot';

import type { AxisDistribution } from './utils';

interface ScaleTransform {
	forward: (value: number) => number;
	inverse: (position: number) => number;
}

export function getScaleTransform({
	distribution,
	asinhThreshold = DEFAULT_ASINH_THRESHOLD,
}: AxisDistribution): ScaleTransform {
	switch (distribution) {
		case DistributionType.Logarithmic:
			return {
				forward: (value): number => Math.log10(value),
				inverse: (position): number => 10 ** position,
			};
		case DistributionType.SymmetricLog:
			return {
				forward: (value): number => Math.asinh(value / asinhThreshold),
				inverse: (position): number => Math.sinh(position) * asinhThreshold,
			};
		default:
			return {
				forward: (value): number => value,
				inverse: (position): number => position,
			};
	}
}

/** In transformed units. */
const SINGLE_VALUE_HALF_SPAN = 0.5;

/** The data's extent stretched to the soft limits; null with neither. */
function resolveExtent(
	dataMin: number | null,
	dataMax: number | null,
	softMin: number | null | undefined,
	softMax: number | null | undefined,
): [number, number] | null {
	const lows = [dataMin, softMin].filter(
		(value): value is number => value != null && Number.isFinite(value),
	);
	const highs = [dataMax, softMax].filter(
		(value): value is number => value != null && Number.isFinite(value),
	);
	return lows.length > 0 && highs.length > 0
		? [Math.min(...lows), Math.max(...highs)]
		: null;
}

export interface ScatterRangeOptions extends AxisDistribution {
	dimension: 'x' | 'y';
	/** CSS pixels kept clear at each end so the largest dot draws whole. */
	marginPx: number;
	softMin?: number | null;
	softMax?: number | null;
}

/** Data extent padded by `marginPx` so edge dots draw whole; log stays unsnapped (snapping after the margin can add an empty decade). */
export function createScatterRange({
	dimension,
	marginPx,
	softMin,
	softMax,
	...distribution
}: ScatterRangeOptions): uPlot.Scale.Range {
	const transform = getScaleTransform(distribution);
	const isLog = distribution.distribution === DistributionType.Logarithmic;

	// A log scale cannot place a soft limit at or below zero.
	const usableSoftMin = isLog && (softMin ?? 0) <= 0 ? null : softMin;

	return (u, dataMin, dataMax): uPlot.Range.MinMax => {
		const extent = resolveExtent(dataMin, dataMax, usableSoftMin, softMax);
		if (!extent) {
			return isLog ? [1, 10] : [0, 1];
		}

		let start = transform.forward(extent[0]);
		let end = transform.forward(extent[1]);
		if (start === end) {
			start -= SINGLE_VALUE_HALF_SPAN;
			end += SINGLE_VALUE_HALF_SPAN;
		}

		const plotPx =
			(dimension === 'x' ? u.bbox.width : u.bbox.height) / uPlot.pxRatio;
		if (plotPx > 2 * marginPx) {
			const pad = ((end - start) * marginPx) / (plotPx - 2 * marginPx);
			start -= pad;
			end += pad;
		}

		return [transform.inverse(start), transform.inverse(end)];
	};
}
