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

	// Process the data first to gather unique labels and data mappings
	const dataMappings: Map<number, number | null>[] = [];
	queryData.forEach(
		({ queryData: innerQueryData, query: queryG, legend: legendG }) => {
			innerQueryData.forEach(({ values = [], metric, legend, queryName }) => {
				const labelNames = getLabelName(
					metric,
					queryName || queryG || '',
					legend || legendG || '',
				);

				allLabels.push(labelNames);

				const dataMap = new Map<number, number | null>();
				values.forEach(([time, second]) => {
					const epocTime = getCachedEpoc(time);
					uniqueTimeLabels.add(epocTime);
					dataMap.set(epocTime, parseFloat(second));
				});

				dataMappings.push(dataMap);
			});
		},
	);

	const sortedEpocTimes = Array.from(uniqueTimeLabels).sort((a, b) => a - b);

	// Process dataMappings to construct allData
	dataMappings.forEach((dataMap) => {
		const dataValue: (number | null)[] = sortedEpocTimes.map(
			(epocTime) => dataMap.get(epocTime) || null,
		);
		allData.push(dataValue);
	});

	const labels = sortedEpocTimes.map((ms) => new Date(ms));

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
