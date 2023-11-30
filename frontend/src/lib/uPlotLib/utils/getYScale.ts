import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { convertValue } from 'lib/getConvertedValue';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

function findMinMaxValues(data: QueryDataV3[]): [number, number] {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	data?.forEach((entry) => {
		entry.series?.forEach((series) => {
			series.values.forEach((valueObj) => {
				const value = parseFloat(valueObj.value);
				min = Math.min(min, value);
				max = Math.max(max, value);
			});
		});
	});

	return [min, max];
}

function findMinMaxThresholdValues(
	thresholds: ThresholdProps[],
	yAxisUnit: string | undefined,
): [number, number] {
	let minThresholdValue = Number.POSITIVE_INFINITY;
	let maxThresholdValue = Number.NEGATIVE_INFINITY;

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
	yAxisUnit: string | undefined,
): [number, number] {
	const [minThresholdValue, maxThresholdValue] = findMinMaxThresholdValues(
		thresholds,
		yAxisUnit,
	);
	const [minSeriesValue, maxSeriesValue] = findMinMaxValues(series);

	const min = Math.min(minThresholdValue, minSeriesValue);
	const max = Math.max(maxThresholdValue, maxSeriesValue);

	return [min, max];
}

export const getYScale = (
	thresholds: ThresholdProps[] | undefined,
	series: QueryDataV3[] | undefined,
	yAxisUnit: string | undefined,
): {
	auto: boolean;
	range?: [number, number];
} => {
	if (!thresholds || !series) return { auto: true };

	const [min, max] = getRange(thresholds, series, yAxisUnit);

	return { auto: false, range: [min, max] };
};
