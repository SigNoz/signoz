import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { isUndefined } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import { normalizePlotValue } from './dataUtils';
import { generateColor } from './generateColor';

function getXAxisTimestamps(seriesList: QueryData[]): number[] {
	const timestamps = new Set<number>();

	seriesList.forEach((series: { values?: [number, string][] }) => {
		if (series?.values) {
			series.values.forEach((value) => {
				timestamps.add(value[0]);
			});
		}
	});

	const timestampsArr = Array.from(timestamps);
	timestampsArr.sort((a, b) => a - b);

	return timestampsArr;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function fillMissingXAxisTimestamps(
	timestampArr: number[],
	data: Array<{ values?: [number, string][] }>,
): (number | null)[][] {
	// Generate a set of all timestamps in the range
	const allTimestampsSet = new Set(timestampArr);
	const result: (number | null)[][] = [];

	// Process each series entry
	for (let i = 0; i < data.length; i++) {
		const entry = data[i];
		if (!entry?.values) {
			result.push([]);
		} else {
			// Build Set of existing timestamps directly (avoid intermediate array)
			const existingTimestamps = new Set<number>();
			const valuesMap = new Map<number, number | null>();

			for (let j = 0; j < entry.values.length; j++) {
				const [timestamp, value] = entry.values[j];
				existingTimestamps.add(timestamp);
				valuesMap.set(timestamp, normalizePlotValue(value));
			}

			// Find missing timestamps by iterating Set directly (avoid Array.from + filter)
			const missingTimestamps: number[] = [];
			const allTimestampsArray = Array.from(allTimestampsSet);
			for (let k = 0; k < allTimestampsArray.length; k++) {
				const timestamp = allTimestampsArray[k];
				if (!existingTimestamps.has(timestamp)) {
					missingTimestamps.push(timestamp);
				}
			}

			// Add missing timestamps to map
			for (let j = 0; j < missingTimestamps.length; j++) {
				valuesMap.set(missingTimestamps[j], null);
			}

			// Build sorted array of values
			const sortedTimestamps = Array.from(valuesMap.keys()).sort((a, b) => a - b);
			const yValues = sortedTimestamps.map((timestamp) => {
				const value = valuesMap.get(timestamp);
				return value !== undefined ? value : null;
			});
			result.push(yValues);
		}
	}

	return result;
}

function getStackedSeries(val: (number | null)[][]): (number | null)[][] {
	const series = val ? val.map((row: (number | null)[]) => [...row]) : [];

	for (let i = series.length - 2; i >= 0; i--) {
		for (let j = 0; j < series[i].length; j++) {
			series[i][j] = (series[i][j] || 0) + (series[i + 1][j] || 0);
		}
	}

	return series;
}

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
	fillSpans?: boolean,
	stackedBarChart?: boolean,
	hiddenGraph?: {
		[key: string]: boolean;
	},
): any[] => {
	const seriesList = apiResponse?.data?.result || [];
	const timestampArr = getXAxisTimestamps(seriesList);
	const yAxisValuesArr = fillMissingXAxisTimestamps(timestampArr, seriesList);

	return [
		timestampArr,
		...(stackedBarChart && isUndefined(hiddenGraph)
			? getStackedSeries(yAxisValuesArr)
			: yAxisValuesArr),
	];
};

const processAnomalyDetectionData = (
	anomalyDetectionData: any,
	isDarkMode: boolean,
): Record<string, { data: number[][]; color: string }> => {
	if (!anomalyDetectionData) {
		return {};
	}

	const processedData: Record<
		string,
		{ data: number[][]; color: string; legendLabel: string }
	> = {};

	for (
		let queryIndex = 0;
		queryIndex < anomalyDetectionData.length;
		queryIndex++
	) {
		const queryData = anomalyDetectionData[queryIndex];
		const {
			series,
			predictedSeries,
			upperBoundSeries,
			lowerBoundSeries,
			queryName,
			legend,
		} = queryData;

		for (let index = 0; index < series?.length; index++) {
			const label = getLabelName(
				series[index].labels,
				queryName || '', // query
				legend || '',
			);

			const objKey =
				anomalyDetectionData.length > 1 ? `${queryName}-${label}` : label;

			// Single iteration instead of 5 separate map operations
			const { values: seriesValues } = series[index];
			const { values: predictedValues } = predictedSeries[index];
			const { values: upperBoundValues } = upperBoundSeries[index];
			const { values: lowerBoundValues } = lowerBoundSeries[index];
			// eslint-disable-next-line prefer-destructuring
			const length = seriesValues.length;

			const timestamps: number[] = new Array(length);
			const values: number[] = new Array(length);
			const predicted: number[] = new Array(length);
			const upperBound: number[] = new Array(length);
			const lowerBound: number[] = new Array(length);

			for (let i = 0; i < length; i++) {
				timestamps[i] = seriesValues[i].timestamp / 1000;
				values[i] = seriesValues[i].value;
				predicted[i] = predictedValues[i].value;
				upperBound[i] = upperBoundValues[i].value;
				lowerBound[i] = lowerBoundValues[i].value;
			}

			processedData[objKey] = {
				data: [timestamps, values, predicted, upperBound, lowerBound],
				color: generateColor(
					objKey,
					isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
				),
				legendLabel: label,
			};
		}
	}

	return processedData;
};

export const getUplotChartDataForAnomalyDetection = (
	apiResponse: MetricRangePayloadProps,
	isDarkMode: boolean,
): Record<string, { [x: string]: any; data: number[][]; color: string }> => {
	const anomalyDetectionData = apiResponse?.data?.newResult?.data?.result;
	return processAnomalyDetectionData(anomalyDetectionData, isDarkMode);
};
