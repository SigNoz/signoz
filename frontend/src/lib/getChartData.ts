import { ChartData, ChartDataset } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { QueryData } from 'types/api/widgets/getQuery';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

export const limit = 30;

const getChartData = ({
	queryData,
	createDataset,
	isWarningLimit = false,
}: GetChartDataProps): {
	data: ChartData;
	isWarning: boolean;
	// eslint-disable-next-line sonarjs/cognitive-complexity
} => {
	const uniqueTimeLabels = new Set<number>();
	queryData.forEach((data) => {
		data.queryData.forEach((query) => {
			query.values.forEach((value) => {
				uniqueTimeLabels.add(value[0]);
			});
		});
	});

	const labels = Array.from(uniqueTimeLabels).sort((a, b) => a - b);

	const response = queryData.map(
		({ queryData, query: queryG, legend: legendG }) =>
			queryData.map((e) => {
				const { values = [], metric, legend, queryName } = e || {};
				const labelNames = getLabelName(
					metric,
					queryName || queryG || '', // query
					legend || legendG || '',
				);
				const dataValue = values?.map((e) => {
					const [first = 0, second = ''] = e || [];
					return {
						first: new Date(parseInt(convertIntoEpoc(first * 1000), 10)), // converting in ms
						second: Number(parseFloat(second)),
					};
				});
				// Fill the missing data with null
				const filledDataValues = Array.from(labels).map((e) => {
					const td1 = new Date(parseInt(convertIntoEpoc(e * 1000), 10));
					const data = dataValue.find((e1) => e1.first.getTime() === td1.getTime());
					return (
						data || {
							first: new Date(parseInt(convertIntoEpoc(e * 1000), 10)),
							second: null,
						}
					);
				});

				return {
					label: labelNames !== 'undefined' ? labelNames : '',
					first: filledDataValues.map((e) => e.first || 0),
					second: filledDataValues.map((e) => e.second || 0),
				};
			}),
	);

	const modifiedData = response
		.flat()
		.sort((a, b) => {
			const len = Math.min(a.second.length, b.second.length); // min length of both array

			for (let i = 0; i < len; i += 1) {
				const avearageOfArray = (arr: number[]): number =>
					arr.reduce((a, b) => a + b, 0) / arr.length;

				const diff = avearageOfArray(a.second) - avearageOfArray(b.second); // calculating the difference

				if (diff !== 0) return diff;
			}

			return a.second.length - b.second.length;
		})
		.reverse();

	const updatedSortedData = isWarningLimit
		? modifiedData.slice(0, limit)
		: modifiedData;

	const allLabels = modifiedData.map((e) => e.label);

	const updatedDataSet = updatedSortedData.map((e, index) => {
		const label = allLabels[index];

		const datasetBaseConfig = {
			index,
			label,
			borderColor: colors[index % colors.length] || 'red',
			data: e.second,
			borderWidth: 1.5,
			spanGaps: true,
			animations: false,
			showLine: true,
			pointRadius: 0,
		};

		return createDataset
			? createDataset(e.second, index, allLabels)
			: datasetBaseConfig;
	});

	const updatedLabels = modifiedData.map((e) => e.first).flat();

	const updatedData = {
		datasets: updatedDataSet,
		labels: updatedLabels,
	};

	return {
		data: updatedData,
		isWarning: isWarningLimit && (allLabels?.length || 0) > limit,
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
	isWarningLimit?: boolean;
}

export default getChartData;
