/**
 * Scale utilities for uPlot Y-axis configuration.
 * Handles linear/log distribution, range computation (with padding and soft/hard limits),
 * log-scale snapping, and threshold-aware soft limits.
 */

import uPlot, { Range, Scale } from 'uplot';

import { DistributionType, ScaleProps } from '../config/types';
import { Threshold } from '../hooks/types';
import { findMinMaxThresholdValues } from './threshold';
import { LogScaleLimits, RangeFunctionParams } from './types';

/**
 * Rounds a number down to the nearest multiple of incr.
 * Used for linear scale min so the axis starts on a clean tick.
 */
export function incrRoundDn(num: number, incr: number): number {
	return Math.floor(num / incr) * incr;
}

/**
 * Rounds a number up to the nearest multiple of incr.
 * Used for linear scale max so the axis ends on a clean tick.
 */
export function incrRoundUp(num: number, incr: number): number {
	return Math.ceil(num / incr) * incr;
}

/**
 * Snaps min/max/softMin/softMax to valid log-scale values (powers of logBase).
 * Only applies when distribution is logarithmic; otherwise returns limits unchanged.
 * Ensures axis bounds align to log "magnitude" for readable tick labels.
 */
export function normalizeLogScaleLimits({
	distr,
	logBase,
	limits,
}: {
	distr?: DistributionType;
	logBase: number;
	limits: LogScaleLimits;
}): LogScaleLimits {
	if (distr !== DistributionType.Logarithmic) {
		return limits;
	}

	const logFn = logBase === 2 ? Math.log2 : Math.log10;

	return {
		min: normalizeLogLimit(limits.min, logBase, logFn, Math.floor),
		max: normalizeLogLimit(limits.max, logBase, logFn, Math.ceil),
		softMin: normalizeLogLimit(limits.softMin, logBase, logFn, Math.floor),
		softMax: normalizeLogLimit(limits.softMax, logBase, logFn, Math.ceil),
	};
}

/**
 * Converts a single limit value to the nearest valid log-scale value.
 * Rounds the log(value) with roundFn, then returns logBase^exp.
 * Values <= 0 or null are returned as-is (log scale requires positive values).
 */
function normalizeLogLimit(
	value: number | null,
	logBase: number,
	logFn: (v: number) => number,
	roundFn: (v: number) => number,
): number | null {
	if (value == null || value <= 0) {
		return value;
	}

	const exp = roundFn(logFn(value));
	return logBase ** exp;
}

/**
 * Returns uPlot scale distribution options for the Y axis.
 * Time (X) scale gets no distr/log; Y scale gets distr 1 (linear) or 3 (log) and log base 2 or 10.
 */
export function getDistributionConfig({
	time,
	distr,
	logBase,
}: {
	time: ScaleProps['time'];
	distr?: DistributionType;
	logBase?: number;
}): Partial<Scale> {
	if (time) {
		return {};
	}

	const resolvedLogBase = (logBase ?? 10) === 2 ? 2 : 10;

	return {
		distr: distr === DistributionType.Logarithmic ? 3 : 1,
		log: resolvedLogBase,
	};
}

/**
 * Builds uPlot range config and flags for the range function.
 * - rangeConfig: pad, hard, soft, mode for min and max (used by uPlot.rangeNum / rangeLog).
 * - hardMinOnly / hardMaxOnly: true when only a hard limit is set (no soft), so range uses that bound.
 * - hasFixedRange: true when both min and max are hard-only (fully fixed axis).
 */
export function getRangeConfig(
	min: number | null,
	max: number | null,
	softMin: number | null,
	softMax: number | null,
	padMinBy: number,
	padMaxBy: number,
): {
	rangeConfig: Range.Config;
	hardMinOnly: boolean;
	hardMaxOnly: boolean;
	hasFixedRange: boolean;
} {
	// uPlot: mode 3 = auto pad from data; mode 1 = respect soft limit
	const softMinMode: Range.SoftMode = softMin == null ? 3 : 1;
	const softMaxMode: Range.SoftMode = softMax == null ? 3 : 1;

	const rangeConfig: Range.Config = {
		min: {
			pad: padMinBy,
			hard: min ?? -Infinity,
			soft: softMin !== null ? softMin : undefined,
			mode: softMinMode,
		},
		max: {
			pad: padMaxBy,
			hard: max ?? Infinity,
			soft: softMax !== null ? softMax : undefined,
			mode: softMaxMode,
		},
	};

	const hardMinOnly = softMin == null && min != null;
	const hardMaxOnly = softMax == null && max != null;
	const hasFixedRange = hardMinOnly && hardMaxOnly;

	return {
		rangeConfig,
		hardMinOnly,
		hardMaxOnly,
		hasFixedRange,
	};
}

/**
 * Initial [min, max] for the range pipeline. Returns null when we have no data and no fixed range
 * (so the caller can bail and return [dataMin, dataMax] unchanged).
 */
function getInitialMinMax(
	dataMin: number | null,
	dataMax: number | null,
	hasFixedRange: boolean,
): Range.MinMax | null {
	if (!hasFixedRange && dataMin == null && dataMax == null) {
		return null;
	}

	return [dataMin, dataMax];
}

/**
 * Computes the linear-scale range using uPlot.rangeNum.
 * Uses hard min/max when hardMinOnly/hardMaxOnly; otherwise uses data min/max. Applies padding via rangeConfig.
 */
function getLinearScaleRange(
	minMax: Range.MinMax,
	params: RangeFunctionParams,
	dataMin: number | null,
	dataMax: number | null,
): Range.MinMax {
	const { rangeConfig, hardMinOnly, hardMaxOnly, min, max } = params;
	const resolvedMin = hardMinOnly ? min : dataMin;
	const resolvedMax = hardMaxOnly ? max : dataMax;

	if (resolvedMin == null || resolvedMax == null) {
		return minMax;
	}

	return uPlot.rangeNum(resolvedMin, resolvedMax, rangeConfig);
}

/**
 * Computes the log-scale range using uPlot.rangeLog.
 * Resolves min/max from params or data, then delegates to uPlot's log range helper.
 */
function getLogScaleRange(
	minMax: Range.MinMax,
	params: RangeFunctionParams,
	dataMin: number | null,
	dataMax: number | null,
	logBase?: uPlot.Scale['log'],
): Range.MinMax {
	const { min, max } = params;
	const resolvedMin = min ?? dataMin;
	const resolvedMax = max ?? dataMax;

	if (resolvedMin == null || resolvedMax == null) {
		return minMax;
	}

	return uPlot.rangeLog(
		resolvedMin,
		resolvedMax,
		(logBase ?? 10) as 2 | 10,
		true,
	);
}

/**
 * Snaps linear scale min down and max up to whole numbers so axis bounds are clean.
 */
function roundLinearRange(minMax: Range.MinMax): Range.MinMax {
	const [currentMin, currentMax] = minMax;
	let roundedMin = currentMin;
	let roundedMax = currentMax;

	if (roundedMin != null) {
		roundedMin = incrRoundDn(roundedMin, 1);
	}

	if (roundedMax != null) {
		roundedMax = incrRoundUp(roundedMax, 1);
	}

	return [roundedMin, roundedMax];
}

/**
 * Snaps log-scale [min, max] to exact powers of logBase (nearest magnitude below/above).
 * If min and max would be equal after snapping, max is increased by one magnitude so the range is valid.
 */
function adjustLogRange(
	minMax: Range.MinMax,
	logBase: number,
	logFn: (v: number) => number,
): Range.MinMax {
	let [currentMin, currentMax] = minMax;

	if (currentMin != null) {
		const minExp = Math.floor(logFn(currentMin));
		currentMin = logBase ** minExp;
	}

	if (currentMax != null) {
		const maxExp = Math.ceil(logFn(currentMax));
		currentMax = logBase ** maxExp;

		if (currentMin === currentMax) {
			currentMax *= logBase;
		}
	}

	return [currentMin, currentMax];
}

/**
 * For linear scales (distr === 1), clamps the computed range to the configured hard min/max when
 * hardMinOnly/hardMaxOnly are set. No-op for log scales.
 */
function applyHardLimits(
	minMax: Range.MinMax,
	params: RangeFunctionParams,
	distr: number,
): Range.MinMax {
	let [currentMin, currentMax] = minMax;

	if (distr !== 1) {
		return [currentMin, currentMax];
	}

	const { hardMinOnly, hardMaxOnly, min, max } = params;

	if (hardMinOnly && min != null) {
		currentMin = min;
	}
	if (hardMaxOnly && max != null) {
		currentMax = max;
	}

	return [currentMin, currentMax];
}

/**
 * If the range is invalid (min >= max), returns a safe default: [1, 100] for log (distr 3), [0, 100] for linear.
 */
function enforceValidRange(minMax: Range.MinMax, distr: number): Range.MinMax {
	const [currentMin, currentMax] = minMax;

	if (currentMin != null && currentMax != null && currentMin >= currentMax) {
		return [distr === 3 ? 1 : 0, 100];
	}

	return minMax;
}

/**
 * Creates the uPlot range function for a scale. Called by uPlot with (u, dataMin, dataMax, scaleKey).
 * Pipeline: initial min/max -> linear or log range (with padding) -> rounding/snapping -> hard limits -> valid range.
 */
export function createRangeFunction(
	params: RangeFunctionParams,
): Range.Function {
	return (
		u: uPlot,
		dataMin: number | null,
		dataMax: number | null,
		scaleKey: string,
	): Range.MinMax => {
		const scale = u.scales[scaleKey];

		const initialMinMax = getInitialMinMax(
			dataMin,
			dataMax,
			params.hasFixedRange,
		);
		if (!initialMinMax) {
			return [dataMin, dataMax];
		}

		let minMax: Range.MinMax = initialMinMax;

		const logBase = scale.log;

		if (scale.distr === 1) {
			minMax = getLinearScaleRange(minMax, params, dataMin, dataMax);
			minMax = roundLinearRange(minMax);
		} else if (scale.distr === 3) {
			minMax = getLogScaleRange(minMax, params, dataMin, dataMax, logBase);
			const logFn = scale.log === 2 ? Math.log2 : Math.log10;
			minMax = adjustLogRange(minMax, (logBase ?? 10) as number, logFn);
		}

		minMax = applyHardLimits(minMax, params, scale.distr ?? 1);

		return enforceValidRange(minMax, scale.distr ?? 1);
	};
}

/**
 * Expands softMin/softMax so that all threshold lines fall within the soft range and stay visible.
 * Converts threshold values to yAxisUnit, then takes the min/max; softMin is lowered (or set) to
 * include the smallest threshold, softMax is raised (or set) to include the largest.
 */
export function adjustSoftLimitsWithThresholds(
	softMin: number | null,
	softMax: number | null,
	thresholds?: Threshold[],
	yAxisUnit?: string,
): {
	softMin: number | null;
	softMax: number | null;
} {
	if (!thresholds || thresholds.length === 0) {
		return { softMin, softMax };
	}

	const [minThresholdValue, maxThresholdValue] = findMinMaxThresholdValues(
		thresholds,
		yAxisUnit,
	);

	if (minThresholdValue === null && maxThresholdValue === null) {
		return { softMin, softMax };
	}

	const adjustedSoftMin =
		minThresholdValue !== null
			? softMin !== null
				? Math.min(softMin, minThresholdValue)
				: minThresholdValue
			: softMin;

	const adjustedSoftMax =
		maxThresholdValue !== null
			? softMax !== null
				? Math.max(softMax, maxThresholdValue)
				: maxThresholdValue
			: softMax;

	return {
		softMin: adjustedSoftMin,
		softMax: adjustedSoftMax,
	};
}

/**
 * Returns fallback time bounds (min/max) as Unix timestamps in seconds when no
 * data range is available. Uses the last 24 hours: from one day ago to now.
 */
export function getFallbackMinMaxTimeStamp(): {
	fallbackMin: number;
	fallbackMax: number;
} {
	const currentDate = new Date();
	// Get the Unix timestamp (milliseconds since January 1, 1970)
	const currentTime = currentDate.getTime();
	const currentUnixTimestamp = Math.floor(currentTime / 1000);

	// Calculate the date and time one day ago
	const oneDayAgoUnixTimestamp = Math.floor(
		(currentDate.getTime() - 86400000) / 1000,
	); // 86400000 milliseconds in a day

	return {
		fallbackMin: oneDayAgoUnixTimestamp,
		fallbackMax: currentUnixTimestamp,
	};
}
