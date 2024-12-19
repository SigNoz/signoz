import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { convertValue } from 'lib/getConvertedValue';
import { isFinite } from 'lodash-es';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

function findMinMaxValues(data: QueryDataV3[]): [number, number] {
	let min = Number.MAX_SAFE_INTEGER;
	let max = Number.MIN_SAFE_INTEGER;
	data?.forEach((entry) => {
		entry.series?.forEach((series) => {
			series.values.forEach((valueObj) => {
				const value = parseFloat(valueObj.value);
				if (isFinite(value)) {
					min = Math.min(min, value);
					max = Math.max(max, value);
				}
			});
		});
	});

	return [min, max];
}

function findMinMaxThresholdValues(
	thresholds: ThresholdProps[],
	yAxisUnit?: string,
): [number, number] {
	let minThresholdValue =
		thresholds[0].thresholdValue || Number.MAX_SAFE_INTEGER;
	let maxThresholdValue =
		thresholds[0].thresholdValue || Number.MIN_SAFE_INTEGER;

	thresholds.forEach((entry) => {
		const { thresholdValue, thresholdUnit } = entry;
		if (thresholdValue === undefined) return;
		const compareValue = convertValue(thresholdValue, thresholdUnit, yAxisUnit);
		if (compareValue === null) return;
		minThresholdValue = Math.min(minThresholdValue, compareValue);
		maxThresholdValue = Math.max(maxThresholdValue, compareValue);
	});

	return [minThresholdValue, maxThresholdValue];
}

function getRange(
	thresholds: ThresholdProps[],
	series: QueryDataV3[],
	yAxisUnit?: string,
): [number, number] {
	const [minThresholdValue, maxThresholdValue] = findMinMaxThresholdValues(
		thresholds,
		yAxisUnit,
	);
	const [minSeriesValue, maxSeriesValue] = findMinMaxValues(series);

	const min = Math.min(minThresholdValue, minSeriesValue);
	let max = Math.max(maxThresholdValue, maxSeriesValue);

	// this is a temp change, we need to figure out a generic way to better handle ranges based on yAxisUnit
	if (yAxisUnit === 'percentunit' && max < 1) {
		max = 1;
	}

	return [min, max];
}

function areAllSeriesEmpty(series: QueryDataV3[]): boolean {
	return series.every((entry) => {
		if (!entry.series) return true;
		return entry.series.every((series) => series.values.length === 0);
	});
}

function configSoftMinMax(
	softMin: number | null,
	softMax: number | null,
): { range: uPlot.Scale.Range } {
	return {
		range: {
			min: {
				soft: softMin !== null ? softMin : undefined,
				mode: 2,
			},
			max: {
				soft: softMax !== null ? softMax : undefined,
				mode: 2,
			},
		},
	};
}

export const getYAxisScale = ({
	thresholds,
	series,
	yAxisUnit,
	softMin,
	softMax,
}: // eslint-disable-next-line sonarjs/cognitive-complexity
GetYAxisScale): { auto?: boolean; range?: uPlot.Scale.Range } => {
	// Situation: thresholds and series data is absent
	if (
		(!thresholds || thresholds.length === 0) &&
		(!series || areAllSeriesEmpty(series))
	) {
		// Situation: softMin is not null or softMax is null
		if (softMin !== null && softMax === null) {
			return configSoftMinMax(softMin, softMin + 100);
		}

		// Situation: softMin is null softMax is not null
		if (softMin === null && softMax !== null) {
			return configSoftMinMax(softMax - 100, softMax);
		}

		// Situation: softMin is not null and softMax is not null
		if (softMin !== null && softMax !== null) {
			return configSoftMinMax(softMin, softMax);
		}

		// Situation: softMin and softMax are null and no threshold and no series data
		return { auto: true };
	}

	// Situation: thresholds are absent
	if (!thresholds || thresholds.length === 0) {
		if (softMax === softMin) {
			return { auto: true };
		}

		// Situation: No thresholds data but series data is present
		if (series && !areAllSeriesEmpty(series)) {
			// Situation: softMin and softMax are null
			if (softMin === null && softMax === null) {
				return { auto: true };
			}

			// Situation: either softMin or softMax is not null
			let [min, max] = findMinMaxValues(series);

			if (softMin !== null) {
				// Compare with softMin if it is not null
				min = Math.min(min, softMin);
			}

			if (softMax !== null) {
				// Compare with softMax if it is not null
				max = Math.max(max, softMax);
			}

			if (min === max) {
				// Min and Max value can be same if the value is same for all the series
				return { auto: true };
			}

			return { auto: false, range: [min, max] };
		}

		// Situation: No thresholds data and series data is absent but either soft min and soft max is present
		if (softMin !== null && softMax === null) {
			return configSoftMinMax(softMin, softMin + 100);
		}

		if (softMin === null && softMax !== null) {
			return configSoftMinMax(softMax - 100, softMax);
		}

		if (softMin !== null && softMax !== null) {
			return configSoftMinMax(softMin, softMax);
		}

		return { auto: true };
	}

	if (!series || areAllSeriesEmpty(series)) {
		// series data is absent but threshold is present
		if (thresholds.length > 0) {
			// Situation: thresholds are present and series data is absent
			let [min, max] = findMinMaxThresholdValues(thresholds, yAxisUnit);

			if (softMin !== null) {
				// Compare with softMin if it is not null
				min = Math.min(min, softMin);
			}

			if (softMax !== null) {
				// Compare with softMax if it is not null
				max = Math.max(max, softMax);
			}

			if (min === max) {
				// Min and Max value can be same if the value is same for all the series
				return { auto: true };
			}

			return { auto: false, range: [min, max] };
		}

		// Situation: softMin or softMax is not null
		if (softMin !== null && softMax === null) {
			return configSoftMinMax(softMin, softMin + 100);
		}

		if (softMin === null && softMax !== null) {
			return configSoftMinMax(softMax - 100, softMax);
		}

		if (softMin !== null && softMax !== null) {
			return configSoftMinMax(softMin, softMax);
		}

		return { auto: true };
	}

	// Situation: thresholds and series data are present
	let [min, max] = getRange(thresholds, series, yAxisUnit);

	if (softMin !== null) {
		// Compare with softMin if it is not null
		min = Math.min(min, softMin);
	}

	if (softMax !== null) {
		// Compare with softMax if it is not null
		max = Math.max(max, softMax);
	}

	if (min === max) {
		// Min and Max value can be same if the value is same for all the series
		return { auto: true };
	}

	return { auto: false, range: [min, max] };
};

function adjustMinMax(
	min: number,
	max: number,
): {
	adjustedMin: number;
	adjustedMax: number;
} {
	// Ensure min and max are valid
	if (min === -Infinity && max === Infinity) {
		return { adjustedMin: -Infinity, adjustedMax: Infinity };
	}

	const range = max - min;
	const adjustment = range * 0.1;

	let adjustedMin: number;
	let adjustedMax: number;

	// Handle the case for -Infinity
	if (min === -Infinity) {
		adjustedMin = -Infinity;
	} else if (min === 0) {
		adjustedMin = min - adjustment; // Special case for when min is 0
	} else if (min < 0) {
		// For negative min, add 10% of the range to bring closer to zero
		adjustedMin = min - range * 0.1;
	} else {
		// For positive min, subtract 10% from min itself
		adjustedMin = min - min * 0.1;
	}

	// Handle the case for Infinity
	if (max === Infinity) {
		adjustedMax = Infinity;
	} else {
		adjustedMax = max * 1.1; // Regular case for finite max
	}

	return { adjustedMin, adjustedMax };
}

function getMinMax(data: any): { minValue: number; maxValue: number } {
	// Exclude the first array
	const arrays = data.slice(1);

	// Flatten the array and convert all elements to float
	const flattened = arrays.flat().map(Number);

	// Get min and max, with fallback of 0 for min
	const minValue = flattened.length ? Math.min(...flattened) : 0;
	const maxValue = Math.max(...flattened);

	const { adjustedMin, adjustedMax } = adjustMinMax(minValue, maxValue);

	return { minValue: adjustedMin, maxValue: adjustedMax };
}

export const getYAxisScaleForAnomalyDetection = ({
	seriesData,
	selectedSeries,
	initialData,
}: {
	seriesData: any;
	selectedSeries: string | null;
	initialData: any;
	yAxisUnit?: string;
}): { auto?: boolean; range?: uPlot.Scale.Range } => {
	if (!selectedSeries && !initialData) {
		return { auto: true };
	}

	const selectedSeriesData = selectedSeries
		? seriesData[selectedSeries]?.data
		: initialData;

	const { minValue, maxValue } = getMinMax(selectedSeriesData);

	return { auto: false, range: [minValue, maxValue] };
};

export type GetYAxisScale = {
	thresholds?: ThresholdProps[];
	series?: QueryDataV3[];
	yAxisUnit?: string;
	softMin: number | null;
	softMax: number | null;
};
