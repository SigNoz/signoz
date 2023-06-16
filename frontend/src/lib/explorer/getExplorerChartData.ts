import { ChartData } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { QueryData } from 'types/api/widgets/getQuery';

import { colors } from '../getRandomColor';

export const getExplorerChartData = (
	queryData: QueryData[],
): ChartData<'bar'> => {
	const uniqueTimeLabels = new Set<number>();

	const sortedData = [...queryData].sort((a, b) => {
		if (a.queryName < b.queryName) return -1;
		if (a.queryName > b.queryName) return 1;
		return 0;
	});

	const modifiedData: { label: string }[] = sortedData.map((result) => {
		const { metric, queryName, legend } = result;
		result.values.forEach((value) => {
			uniqueTimeLabels.add(value[0] * 1000);
		});

		return {
			label: getLabelName(metric, queryName || '', legend || ''),
		};
	});

	const labels = Array.from(uniqueTimeLabels)
		.sort((a, b) => a - b)
		.map((value) => new Date(value));

	const allLabels = modifiedData.map((e) => e.label);

	const data: ChartData<'bar'> = {
		labels,
		datasets: queryData.map((result, index) => ({
			label: allLabels[index],
			data: result.values.map((item) => parseFloat(item[1])),
			backgroundColor: colors[index % colors.length] || 'red',
			borderColor: colors[index % colors.length] || 'red',
		})),
	};

	return data;
};
