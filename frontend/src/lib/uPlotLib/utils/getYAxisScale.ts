import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { convertValue } from 'lib/getConvertedValue';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

function findMinMaxValues(data: QueryDataV3[]): [number, number] {
	let min = Number.MAX_SAFE_INTEGER;
	let max = Number.MIN_SAFE_INTEGER;
	data?.forEach((entry) => {
		entry.series?.forEach((series) => {
			series.values.forEach((valueObj) => {
				const value = parseFloat(valueObj.value);
				if (Number.isNaN(value)) return;
				min = Math.min(min, value);
				max = Math.max(max, value);
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

export const getYAxisScale = (
	thresholds?: ThresholdProps[],
	series?: QueryDataV3[],
	yAxisUnit?: string,
): {
	auto: boolean;
	range?: [number, number];
} => {
	if (!thresholds || !series || thresholds.length === 0) return { auto: true };

	if (areAllSeriesEmpty(series)) return { auto: true };

	const [min, max] = getRange(thresholds, series, yAxisUnit);

	// Min and Max value can be same if the value is same for all the series
	if (min === max) {
		return { auto: true };
	}
	return { auto: false, range: [min, max] };
};
