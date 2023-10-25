import { Dimensions } from 'hooks/useDimensions';
import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';
import getRandomColor, { hexToRgba } from './getRandomColor';

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadV3['data'],
): uPlot.AlignedData => {
	// Extract the list of series
	const seriesList = apiResponse?.result[0]?.series || [];

	// Create an array to hold the uPlot data
	const uPlotData: uPlot.AlignedData = [];

	// Process timestamps only once as they are the same across series
	uPlotData.push(
		new Float64Array(seriesList[0]?.values?.map((v) => v.timestamp)),
	);

	// Process each series
	apiResponse?.result.forEach((series) => {
		const eachResponse =
			series.series
				?.map((s) => s.values?.map((v) => parseFloat(v.value)))
				.flat() || [];

		uPlotData.push(new Float64Array(eachResponse));
	});

	return uPlotData;
};

const getSeries = (
	apiResponse?: MetricRangePayloadV3['data'],
): uPlot.Options['series'] => {
	const seriesList: uPlot.Series[] = [{}];

	apiResponse?.result.forEach(() => {
		// const color = getRandomColor();
		// const fillColor = hexToRgba(color, 0.1);
		seriesList.push({
			stroke: getRandomColor(),
			// fill: hexToRgba('#2F80ED', 0.1),
		});
	});

	return seriesList;
};

export const getUPlotChartOptions = (
	apiResponse?: MetricRangePayloadV3['data'],
	dimensions: Dimensions = { height: 0, width: 0 },
	// eslint-disable-next-line arrow-body-style
): uPlot.Options => {
	// console.log('getUPlotChartOptions');
	return {
		width: dimensions.width,
		height: dimensions.height,
		legend: {
			show: false,
		},
		series: getSeries(apiResponse),
		axes: [{ scale: 'time' }, {}],
	};
};
