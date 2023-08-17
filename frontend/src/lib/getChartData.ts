import { ChartData, ChartDataset } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { QueryData } from 'types/api/widgets/getQuery';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

const getChartData = ({
	queryData,
	createDataset,
}: GetChartDataProps): ChartData => {
	const uniqueTimeLabels = new Set<number>();
	const allLabels: string[] = [];
	const allData: (number | null)[][] = [];

	const epocCache: Record<number, number> = {};

	function getCachedEpoc(time: number): number {
		if (!epocCache[time]) {
			epocCache[time] = parseInt(convertIntoEpoc(time * 1000), 10);
		}
		return epocCache[time];
	}

	queryData.forEach(
		({ queryData: innerQueryData, query: queryG, legend: legendG }) => {
			innerQueryData.forEach(({ values = [], metric, legend, queryName }) => {
				const labelNames = getLabelName(
					metric,
					queryName || queryG || '',
					legend || legendG || '',
				);
				allLabels.push(labelNames !== 'undefined' ? labelNames : '');

				const dataMap = new Map<number, number | null>();

				values.forEach(([time, second]) => {
					uniqueTimeLabels.add(time);
					dataMap.set(getCachedEpoc(time), parseFloat(second));
				});

				const dataValue: (number | null)[] = Array.from(uniqueTimeLabels).map(
					(time) => dataMap.get(getCachedEpoc(time)) || null,
				);

				allData.push(dataValue);
			});
		},
	);

	const labels = Array.from(uniqueTimeLabels)
		.sort((a, b) => a - b)
		.map(getCachedEpoc)
		.map((ms) => new Date(ms));

	const datasets: ChartDataset[] = allData.map((dataSet, index) => {
		const baseConfig = {
			label: allLabels[index],
			borderColor: colors[index % colors.length] || 'red',
			data: dataSet,
			borderWidth: 1.5,
			spanGaps: true,
			animations: false,
			showLine: true,
			pointRadius: 0,
		};

		return createDataset ? createDataset(dataSet, index, allLabels) : baseConfig;
	});

	return {
		datasets,
		labels,
	};
};

export interface GetChartDataProps {
	queryData: {
		query?: string;
		legend?: string;
		queryData: QueryData[];
	}[];
	createDataset?: (
		element: (number | null)[],
		index: number,
		allLabels: string[],
	) => ChartDataset;
}

export default getChartData;
