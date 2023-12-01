import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

function getXAxisTimestamps(seriesList: QueryData[]): number[] {
	const timestamps = new Set();

	seriesList.forEach((series: { values: [number, string][] }) => {
		series.values.forEach((value) => {
			timestamps.add(value[0]);
		});
	});

	const timestampsArr: number[] | unknown[] = Array.from(timestamps) || [];
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return timestampsArr.sort((a, b) => a - b);
}

function fillMissingXAxisTimestamps(
	timestampArr: number[],
	data: any[],
	fillSpans: boolean,
): any {
	// Generate a set of all timestamps in the range
	const allTimestampsSet = new Set(timestampArr);
	const processedData = JSON.parse(JSON.stringify(data));

	// Fill missing timestamps with null values
	processedData.forEach((entry: { values: (number | null)[][] }) => {
		const existingTimestamps = new Set(entry.values.map((value) => value[0]));

		const missingTimestamps = Array.from(allTimestampsSet).filter(
			(timestamp) => !existingTimestamps.has(timestamp),
		);

		missingTimestamps.forEach((timestamp) => {
			const value = fillSpans ? 0 : null;

			entry.values.push([timestamp, value]);
		});

		entry.values.forEach((v) => {
			if (Number.isNaN(v[1])) {
				const replaceValue = fillSpans ? 0 : null;
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

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
	fillSpans?: boolean,
): any[] => {
	const seriesList = apiResponse?.data?.result || [];
	const timestampArr = getXAxisTimestamps(seriesList);
	const yAxisValuesArr = fillMissingXAxisTimestamps(
		timestampArr,
		seriesList,
		fillSpans || false,
	);

	return [timestampArr, ...yAxisValuesArr];
};
