import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

// eslint-disable-next-line sonarjs/cognitive-complexity
function fillMissingTimestamps(
	sortedTimestamps: number[],
	subsetArray: any[],
	fillSpans: boolean | undefined,
): any[] {
	const filledArray = [];

	let subsetIndex = 0;
	// eslint-disable-next-line no-restricted-syntax
	for (const timestamp of sortedTimestamps) {
		if (
			subsetIndex < subsetArray.length &&
			timestamp === subsetArray[subsetIndex][0]
		) {
			// Timestamp is present in subsetArray
			const seriesPointData = subsetArray[subsetIndex];

			if (
				seriesPointData &&
				Array.isArray(seriesPointData) &&
				seriesPointData.length > 0 &&
				seriesPointData[1] !== 'NaN'
			) {
				filledArray.push(subsetArray[subsetIndex]);
			} else {
				const value = fillSpans ? 0 : null;
				filledArray.push([seriesPointData[0], value]);
			}

			subsetIndex += 1;
		} else {
			// Timestamp is missing in subsetArray, fill with [timestamp, 0]
			const value = fillSpans ? 0 : null;
			filledArray.push([timestamp, value]);
		}
	}

	return filledArray;
}

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
	fillSpans?: boolean,
): any[] => {
	const seriesList = apiResponse?.data?.result || [];
	const uPlotData = [];

	// this helps us identify the series with the max number of values and helps define the x axis - timestamps
	const xSeries = seriesList.reduce(
		(maxObj, currentObj) =>
			currentObj.values.length > maxObj.values.length ? currentObj : maxObj,
		seriesList[0],
	);

	// sort seriesList
	for (let index = 0; index < seriesList.length; index += 1) {
		seriesList[index]?.values?.sort((a, b) => a[0] - b[0]);
	}

	const timestampArr = xSeries?.values?.map((v) => v[0]);

	// timestamp
	uPlotData.push(timestampArr);

	// for each series, push the values
	seriesList.forEach((series) => {
		const updatedSeries = fillMissingTimestamps(
			timestampArr,
			series?.values || [],
			fillSpans,
		);

		const seriesData =
			updatedSeries?.map((v) => {
				if (v[1] === null) {
					return v[1];
				}
				return parseFloat(v[1]);
			}) || [];

		uPlotData.push(seriesData);
	});

	return uPlotData;
};
