import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { convertValue } from 'lib/getConvertedValue';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

function findMinMaxValues(data: QueryDataV3[]): [number, number] {
	let min = 0;
	let max = 0;
	data?.forEach((entry) => {
		entry.series?.forEach((series) => {
			series.values.forEach((valueObj) => {
				const value = parseFloat(valueObj.value);
				if (!value) return;
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
	let minThresholdValue = 0;
	let maxThresholdValue = 0;

	thresholds.forEach((entry) => {
		const { thresholdValue, thresholdUnit } = entry;
		if (thresholdValue === undefined) return;
		minThresholdValue = Math.min(
			minThresholdValue,
			convertValue(thresholdValue, thresholdUnit, yAxisUnit) || 0,
		);
		maxThresholdValue = Math.max(
			maxThresholdValue,
			convertValue(thresholdValue, thresholdUnit, yAxisUnit) || 0,
		);
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
	if (!thresholds || !series) return { auto: true };

	if (areAllSeriesEmpty(series)) return { auto: true };

	const [min, max] = getRange(thresholds, series, yAxisUnit);
	return { auto: false, range: [min, max] };
};
