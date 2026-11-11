import { DistributionType } from 'lib/uPlotV2/config/types';

import { getScaleTransform } from './scatterRange';
import { type AxisDistribution, ScatterAxisScale } from './types';

const LINEAR_DISTRIBUTION: AxisDistribution = {
	distribution: DistributionType.Linear,
};

/** Orders of magnitude `auto` needs before it considers leaving linear. */
export const AUTO_MIN_DECADES = 2;

/** How many times more axis the middle half of the points must cover for `auto` to leave linear. */
export const AUTO_SPREAD_GAIN = 2;

function getMagnitudeRange(values: number[]): {
	minMagnitude: number;
	maxMagnitude: number;
	hasNonPositive: boolean;
} {
	let minMagnitude = Infinity;
	let maxMagnitude = -Infinity;
	let hasNonPositive = false;
	for (const value of values) {
		if (!Number.isFinite(value)) {
			continue;
		}
		if (value <= 0) {
			hasNonPositive = true;
		}
		if (value !== 0) {
			minMagnitude = Math.min(minMagnitude, Math.abs(value));
			maxMagnitude = Math.max(maxMagnitude, Math.abs(value));
		}
	}
	return { minMagnitude, maxMagnitude, hasNonPositive };
}

/** The linear band ends at the smallest non-zero magnitude so small values still spread. */
function symmetricLogDistribution(minMagnitude: number): AxisDistribution {
	const asinhThreshold = Number.isFinite(minMagnitude)
		? 10 ** Math.floor(Math.log10(minMagnitude))
		: 1;
	return { distribution: DistributionType.SymmetricLog, asinhThreshold };
}

function quantile(sorted: number[], q: number): number {
	const position = (sorted.length - 1) * q;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Share of the axis the middle half of the points covers. */
function middleHalfSpread(
	sorted: number[],
	[min, max]: [number, number],
	distribution: AxisDistribution,
): number {
	const { forward } = getScaleTransform(distribution);
	const span = forward(max) - forward(min);
	return span > 0
		? (forward(quantile(sorted, 0.75)) - forward(quantile(sorted, 0.25))) / span
		: 0;
}

/**
 * Log (symlog with zero or negatives) when it spreads the points out clearly
 * more than linear does; min/max alone would let one outlier decide.
 */
function resolveAutoDistribution(
	values: number[],
	softLimits: number[],
): AxisDistribution {
	const sorted = values
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b);
	if (sorted.length < 2) {
		return LINEAR_DISTRIBUTION;
	}
	const { minMagnitude, maxMagnitude, hasNonPositive } = getMagnitudeRange([
		...sorted,
		...softLimits,
	]);
	if (!(Math.log10(maxMagnitude / minMagnitude) >= AUTO_MIN_DECADES)) {
		return LINEAR_DISTRIBUTION;
	}
	const candidate = hasNonPositive
		? symmetricLogDistribution(minMagnitude)
		: { distribution: DistributionType.Logarithmic };
	const extent: [number, number] = [
		Math.min(sorted[0], ...softLimits),
		Math.max(sorted[sorted.length - 1], ...softLimits),
	];
	const candidateSpread = middleHalfSpread(sorted, extent, candidate);
	const linearSpread = middleHalfSpread(sorted, extent, LINEAR_DISTRIBUTION);
	return candidateSpread > 0 &&
		candidateSpread >= AUTO_SPREAD_GAIN * linearSpread
		? candidate
		: LINEAR_DISTRIBUTION;
}

/** `log` falls back to symlog rather than drop zero or negatives; callers filter first to drop them. */
export function resolveAxisDistribution(
	values: number[],
	scale: ScatterAxisScale = ScatterAxisScale.Auto,
	/** Soft limits and thresholds the axis must reach; only `auto` weighs them. */
	softLimits: Array<number | null | undefined> = [],
): AxisDistribution {
	switch (scale) {
		case ScatterAxisScale.Linear:
			return LINEAR_DISTRIBUTION;
		case ScatterAxisScale.SymLog:
			return symmetricLogDistribution(getMagnitudeRange(values).minMagnitude);
		case ScatterAxisScale.Log: {
			const { minMagnitude, hasNonPositive } = getMagnitudeRange(values);
			return hasNonPositive
				? symmetricLogDistribution(minMagnitude)
				: { distribution: DistributionType.Logarithmic };
		}
		case ScatterAxisScale.Auto:
		default:
			return resolveAutoDistribution(
				values,
				softLimits.filter(
					(limit): limit is number => limit != null && Number.isFinite(limit),
				),
			);
	}
}
