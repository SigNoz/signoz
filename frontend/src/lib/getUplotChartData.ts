import { Dimensions } from 'hooks/useDimensions';
import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { colors } from './getRandomColor';

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadV3['data'],
): uPlot.AlignedData => {
	const seriesList = apiResponse?.result[0]?.series || [];

	const uPlotData: uPlot.AlignedData = [];

	uPlotData.push(
		new Float64Array(seriesList[0]?.values?.map((v) => v.timestamp / 1000)),
	);

	seriesList.forEach((series) => {
		const seriesData = new Float64Array(
			series.values.map((v) => parseFloat(v.value)),
		);

		uPlotData.push(seriesData);
	});

	return uPlotData;
};

const getSeries = (
	apiResponse?: MetricRangePayloadV3['data'],
): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.result[0]?.series || [];

	for (let i = 0; i < seriesList?.length; i += 1) {
		const color = colors[i % colors.length]; // Use modulo to loop through colors if there are more series than colors

		const series: uPlot.Series = {
			// label: `Series ${i + 1}`,
			stroke: color,
			points: {
				size: 2,
			},
		};

		configurations.push(series);
	}

	return configurations;
};

const getGridColor = (isDarkMode: boolean): string => {
	if (isDarkMode) {
		return 'rgba(231,233,237,0.2)';
	}
	return 'rgba(231,233,237,0.8)';
};

interface GetUPlotChartOptions {
	apiResponse?: MetricRangePayloadV3['data'];
	dimensions: Dimensions;
	isDarkMode: boolean;
	onDragSelect: (startTime: number, endTime: number) => void;
}

export const getUPlotChartOptions = ({
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
}: GetUPlotChartOptions): uPlot.Options => ({
	width: dimensions.width,
	height: dimensions.height - 30,
	legend: {
		live: false,
		isolate: true,
		show: false,
	},
	scales: {
		x: {
			time: true,
		},
	},
	hooks: {
		setSelect: [
			(self): void => {
				const selection = self.select;
				if (selection) {
					const startTime = self.posToVal(selection.left, 'x');
					const endTime = self.posToVal(selection.left + selection.width, 'x');

					const diff = endTime - startTime;

					if (diff > 0) {
						onDragSelect(startTime * 1000, endTime * 1000);
					}
				}
			},
		],
	},
	series: getSeries(apiResponse),
	axes: [
		{
			// label: 'Date',
			stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
			grid: {
				stroke: getGridColor(isDarkMode), // Color of the grid lines
				dash: [10, 10], // Dash pattern for grid lines,
				width: 0.3, // Width of the grid lines,
				show: true,
			},
			ticks: {
				stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
				width: 0.3, // Width of the tick lines,
				show: true,
			},
			gap: 5,
		},
		{
			// label: 'Value',
			stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
			grid: {
				stroke: getGridColor(isDarkMode), // Color of the grid lines
				dash: [10, 10], // Dash pattern for grid lines,
				width: 0.3, // Width of the grid lines
			},
			ticks: {
				stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
				width: 0.3, // Width of the tick lines
				show: true,
			},
			gap: 5,
		},
	],
});
