import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
	fillSpans?: boolean,
): uPlot.AlignedData => {
	const seriesList = apiResponse?.data?.result || [];
	const uPlotData: uPlot.AlignedData = [];

	// sort seriesList
	for (let index = 0; index < seriesList.length; index += 1) {
		seriesList[index]?.values?.sort((a, b) => a[0] - b[0]);
	}

	// timestamp
	uPlotData.push(new Float64Array(seriesList[0]?.values?.map((v) => v[0])));

	const numberOfTimestamps = uPlotData[0].length;

	// for each series, push the values
	seriesList.forEach((series) => {
		const seriesData = series?.values?.map((v) => parseFloat(v[1])) || [];

		// fill rest of the value with zero
		if (seriesData.length < numberOfTimestamps && fillSpans) {
			const diff = numberOfTimestamps - seriesData.length;
			for (let i = 0; i < diff; i += 1) {
				seriesData.push(0);
			}
		}

		uPlotData.push(new Float64Array(seriesData));
	});

	return uPlotData;
};
