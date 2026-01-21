import { convertValue } from 'lib/getConvertedValue';
import uPlot, { Range, Scale } from 'uplot';

import { DistributionType, ScaleProps, Threshold } from '../config/types';

export function incrRoundDn(num: number, incr: number): number {
	return Math.floor(num / incr) * incr;
}

export function incrRoundUp(num: number, incr: number): number {
	return Math.ceil(num / incr) * incr;
}

export type LogScaleLimits = {
	min: number | null | undefined;
	max: number | null | undefined;
	softMin: number | null | undefined;
	softMax: number | null | undefined;
};

export function normalizeLogScaleLimits(
	distr: DistributionType | undefined,
	logBase: number,
	limits: LogScaleLimits,
): LogScaleLimits {
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

function normalizeLogLimit(
	value: number | null | undefined,
	logBase: number,
	logFn: (v: number) => number,
	roundFn: (v: number) => number,
): number | null | undefined {
	if (value == null || value <= 0) {
		return value == null ? value : null;
	}

	const exp = roundFn(logFn(value));
	return logBase ** exp;
}

export function getDistributionConfig(
	time: ScaleProps['time'],
	distr: DistributionType | undefined,
	logBase: number,
): Partial<Scale> {
	if (time) {
		return {};
	}

	const resolvedLogBase = (logBase ?? 10) === 2 ? 2 : 10;

	return {
		distr: distr === DistributionType.Logarithmic ? 3 : 1,
		log: resolvedLogBase,
	};
}

export function getRangeConfig(
	min: number | null | undefined,
	max: number | null | undefined,
	softMin: number | null | undefined,
	softMax: number | null | undefined,
	padMinBy: number,
	padMaxBy: number,
): {
	rangeConfig: Range.Config;
	hardMinOnly: boolean;
	hardMaxOnly: boolean;
	hasFixedRange: boolean;
} {
	// uPlot's default ranging config for both min & max is {pad: 0.1, hard: null, soft: 0, mode: 3}
	const softMinMode: Range.SoftMode = softMin == null ? 3 : 1;
	const softMaxMode: Range.SoftMode = softMax == null ? 3 : 1;

	const rangeConfig: Range.Config = {
		min: {
			pad: padMinBy,
			hard: min ?? -Infinity,
			soft: softMin || 0,
			mode: softMinMode,
		},
		max: {
			pad: padMaxBy,
			hard: max ?? Infinity,
			soft: softMax || 0,
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

type RangeFunctionParams = {
	rangeConfig: Range.Config;
	hardMinOnly: boolean;
	hardMaxOnly: boolean;
	hasFixedRange: boolean;
	min: number | null | undefined;
	max: number | null | undefined;
};

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

function getLogScaleRange(
	minMax: Range.MinMax,
	params: RangeFunctionParams,
	dataMin: number | null,
	dataMax: number | null,
	logBase: uPlot.Scale['log'] | undefined,
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

function adjustLogRange(
	minMax: Range.MinMax,
	logBase: number,
	logFn: (v: number) => number,
): Range.MinMax {
	let [currentMin, currentMax] = minMax;

	if (currentMin != null && currentMin <= 1) {
		// clamp min
		currentMin = 1;
	} else if (currentMin != null) {
		// snap min to nearest mag below
		const minExp = Math.floor(logFn(currentMin));
		currentMin = logBase ** minExp;
	}

	if (currentMax != null) {
		// snap max to nearest mag above
		const maxExp = Math.ceil(logFn(currentMax));
		currentMax = logBase ** maxExp;

		// inflate max by mag if same
		if (currentMin === currentMax) {
			currentMax *= logBase;
		}
	}

	return [currentMin, currentMax];
}

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

	if (hardMinOnly && min != null) currentMin = min;
	if (hardMaxOnly && max != null) currentMax = max;

	return [currentMin, currentMax];
}

function enforceValidRange(minMax: Range.MinMax, distr: number): Range.MinMax {
	const [currentMin, currentMax] = minMax;

	if (currentMin != null && currentMax != null && currentMin >= currentMax) {
		return [distr === 3 ? 1 : 0, 100];
	}

	return minMax;
}

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
 * Find min and max threshold values after converting to the target unit
 */
export function findMinMaxThresholdValues(
	thresholds: Threshold[],
	yAxisUnit?: string,
): [number | null, number | null] {
	if (!thresholds || thresholds.length === 0) {
		return [null, null];
	}

	let minThresholdValue: number | null = null;
	let maxThresholdValue: number | null = null;

	thresholds.forEach((threshold) => {
		const { thresholdValue, thresholdUnit } = threshold;
		if (thresholdValue === undefined) return;

		const compareValue = convertValue(thresholdValue, thresholdUnit, yAxisUnit);
		if (compareValue === null) return;

		if (minThresholdValue === null || compareValue < minThresholdValue) {
			minThresholdValue = compareValue;
		}
		if (maxThresholdValue === null || compareValue > maxThresholdValue) {
			maxThresholdValue = compareValue;
		}
	});

	return [minThresholdValue, maxThresholdValue];
}

/**
 * Adjust softMin/softMax to include threshold values
 * Thresholds should be visible in the scale, so we expand softMin/softMax to include them
 */
export function adjustSoftLimitsWithThresholds(
	softMin: number | null | undefined,
	softMax: number | null | undefined,
	thresholds: Threshold[] | undefined,
	yAxisUnit: string | undefined,
): {
	softMin: number | null | undefined;
	softMax: number | null | undefined;
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

	// Adjust softMin to include minimum threshold value
	const adjustedSoftMin =
		minThresholdValue !== null
			? softMin !== null && softMin !== undefined
				? Math.min(softMin, minThresholdValue)
				: minThresholdValue
			: softMin;

	// Adjust softMax to include maximum threshold value
	const adjustedSoftMax =
		maxThresholdValue !== null
			? softMax !== null && softMax !== undefined
				? Math.max(softMax, maxThresholdValue)
				: maxThresholdValue
			: softMax;

	return {
		softMin: adjustedSoftMin,
		softMax: adjustedSoftMax,
	};
}
