import { ChartData, ChartDataset, ChartDatasetProperties } from 'chart.js';
import dayjs from 'dayjs';
import { colors } from 'lib/getRandomColor';
import { TraceReducer } from 'types/reducer/trace';

function transposeArray(array: number[][], arrayLength: number) {
	const newArray: number[][] = [];
	for (let i = 0; i < array.length; i++) {
		newArray.push([]);
	}

	for (let i = 0; i < array.length; i++) {
		for (let j = 0; j < arrayLength; j++) {
			newArray[j]?.push(array[i][j]);
		}
	}

	return newArray;
}

export const getChartData = (
	data: TraceReducer['spansGraph']['payload'],
): ChartData<'line'> => {
	const allDataPoints = data.items;

	const chartDataset: ChartDatasetProperties<'line', number[]> = {
		data: [],
		type: 'line',
	};

	const chartLabels: ChartData<'line'>['labels'] = [];

	Object.keys(allDataPoints).forEach((timestamp) => {
		const key = allDataPoints[timestamp];
		if (key.value) {
			chartDataset.data.push(key.value);
			const date = dayjs(key.timestamp / 1000000);
			chartLabels.push(date.toDate().getTime());
		}
	});

	return {
		datasets: [
			{
				...chartDataset,
				borderWidth: 1.5,
				spanGaps: true,
				borderColor: colors[0] || 'red',
				showLine: true,
				pointRadius: 0,
			},
		],
		labels: chartLabels,
	};
};

export const getChartDataforGroupBy = (
	props: TraceReducer['spansGraph']['payload'],
): ChartData => {
	const items = props.items;

	const chartData: ChartData = {
		datasets: [],
		labels: [],
	};

	let max = 0;

	const allGroupBy = Object.keys(items).map((e) => items[e].groupBy);

	Object.keys(allGroupBy).map((e) => {
		const length = Object.keys(allGroupBy[e]).length;

		if (length >= max) {
			max = length;
		}
	});

	const numberOfGraphs = max;

	const spansGraph: number[][] = [];

	const names: string[] = [];

	// number of data points
	Object.keys(items).forEach((item) => {
		const spanData = items[item];
		const date = dayjs(Number(item) / 1000000)
			.toDate()
			.getTime();

		chartData.labels?.push(date);

		const groupBy = spanData.groupBy;
		const preData: number[] = [];

		if (groupBy) {
			Object.keys(groupBy).forEach((key) => {
				const value = groupBy[key];
				preData.push(value);
				names.push(key);
			});

			spansGraph.push(preData);
		}
	});

	const updatedName = [...new Set(names)];

	transposeArray(spansGraph, numberOfGraphs).forEach((values, index) => {
		chartData.datasets.push({
			data: values.map((e) => e || 0),
			borderWidth: 1.5,
			spanGaps: true,
			borderColor: colors[index] || 'red',
			showLine: true,
			pointRadius: 0,
			label: updatedName[index],
		});
	});

	return chartData;
};
