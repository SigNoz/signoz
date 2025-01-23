import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { cloneDeep, isUndefined } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import { generateColor } from './generateColor';

function getXAxisTimestamps(seriesList: QueryData[]): number[] {
	const timestamps = new Set();

	seriesList.forEach((series: { values?: [number, string][] }) => {
		if (series?.values) {
			series.values.forEach((value) => {
				timestamps.add(value[0]);
			});
		}
	});

	const timestampsArr: number[] | unknown[] = Array.from(timestamps) || [];
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return timestampsArr.sort((a, b) => a - b);
}

function fillMissingXAxisTimestamps(timestampArr: number[], data: any[]): any {
	// Generate a set of all timestamps in the range
	const allTimestampsSet = new Set(timestampArr);
	const processedData = cloneDeep(data);

	// Fill missing timestamps with null values
	processedData.forEach((entry: { values: (number | null)[][] }) => {
		const existingTimestamps = new Set(entry.values.map((value) => value[0]));

		const missingTimestamps = Array.from(allTimestampsSet).filter(
			(timestamp) => !existingTimestamps.has(timestamp),
		);

		missingTimestamps.forEach((timestamp) => {
			const value = null;

			entry.values.push([timestamp, value]);
		});

		entry.values.forEach((v) => {
			if (Number.isNaN(v[1])) {
				const replaceValue = null;
				// eslint-disable-next-line no-param-reassign
				v[1] = replaceValue;
			} else if (v[1] !== null) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				// eslint-disable-next-line no-param-reassign
				v[1] = parseFloat(v[1]);
			}
		});

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		entry.values.sort((a, b) => a[0] - b[0]);
	});

	return processedData.map((entry: { values: [number, string][] }) =>
		entry.values.map((value) => value[1]),
	);
}

function getStackedSeries(val: any): any {
	const series = cloneDeep(val) || [];

	for (let i = series.length - 2; i >= 0; i--) {
		for (let j = 0; j < series[i].length; j++) {
			series[i][j] += series[i + 1][j];
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
		const {
			series,
			predictedSeries,
			upperBoundSeries,
			lowerBoundSeries,
			queryName,
			legend,
		} = anomalyDetectionData[queryIndex];

		for (let index = 0; index < series?.length; index++) {
			const label = getLabelName(
				series[index].labels,
				queryName || '', // query
				legend || '',
			);

			const objKey =
				anomalyDetectionData.length > 1 ? `${queryName}-${label}` : label;

			processedData[objKey] = {
				data: [
					series[index].values.map((v: { timestamp: number }) => v.timestamp / 1000),
					series[index].values.map((v: { value: number }) => v.value),
					predictedSeries[index].values.map((v: { value: number }) => v.value),
					upperBoundSeries[index].values.map((v: { value: number }) => v.value),
					lowerBoundSeries[index].values.map((v: { value: number }) => v.value),
				],
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
): Record<
	string,
	{
		[x: string]: any;
		data: number[][];
		color: string;
	}
> => {
	const anomalyDetectionData = apiResponse?.data?.newResult?.data?.result;
	return processAnomalyDetectionData(anomalyDetectionData, isDarkMode);
};
