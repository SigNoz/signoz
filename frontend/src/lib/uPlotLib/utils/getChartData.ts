import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
): uPlot.AlignedData => {
	const seriesList = apiResponse?.data?.result || [];
	const uPlotData: uPlot.AlignedData = [];

	// sort seriesList
	for (let index = 0; index < seriesList.length; index += 1) {
		seriesList[index]?.values?.sort((a, b) => a[0] - b[0]);
	}

	// timestamp
	uPlotData.push(new Float64Array(seriesList[0]?.values?.map((v) => v[0])));

	// for each series, push the values
	seriesList.forEach((series) => {
		const seriesData = series?.values?.map((v) => parseFloat(v[1])) || [];

		uPlotData.push(new Float64Array(seriesData));
	});

	return uPlotData;
};
