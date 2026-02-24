import { convertValue } from 'lib/getConvertedValue';

import { Threshold } from '../hooks/types';

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
		if (thresholdValue === undefined) {
			return;
		}

		const compareValue = convertValue(thresholdValue, thresholdUnit, yAxisUnit);
		if (compareValue === null) {
			return;
		}

		if (minThresholdValue === null || compareValue < minThresholdValue) {
			minThresholdValue = compareValue;
		}
		if (maxThresholdValue === null || compareValue > maxThresholdValue) {
			maxThresholdValue = compareValue;
		}
	});

	return [minThresholdValue, maxThresholdValue];
}
