import { ChartData, ChartDataset } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { QueryData } from 'types/api/widgets/getQuery';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

const getChartData = ({
	queryData,
	createDataset,
	isWarningLimit = false,
}: GetChartDataProps): {
	data: ChartData;
	isWarning: boolean;
	// eslint-disable-next-line sonarjs/cognitive-complexity
} => {
	const limit = process.env.FRONTEND_CHART_LIMIT
		? +process.env.FRONTEND_CHART_LIMIT
		: 20;

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
	const allLabels = response
		.map((e) => e.map((e) => e.label))
		.reduce((a, b) => [...a, ...b], []);

	const alldata = response
		.flat()
		.map((e) => e.second)
		.sort((a, b) => {
			const len = Math.min(a.length, b.length); // min length of both array

			for (let i = 0; i < len; i += 1) {
				const diff = (a[i] || 0) - (b[i] || 0); // calculating the difference
				if (diff !== 0) return diff;
			}

			return a.length - b.length;
		})
		.reverse();

	const updatedSortedData = isWarningLimit ? alldata.slice(0, limit) : alldata;

	const updatedDataSet = updatedSortedData.map((e, index) => {
		const datasetBaseConfig = {
			index,
			label: allLabels[index],
			borderColor: colors[index % colors.length] || 'red',
			data: e,
			borderWidth: 1.5,
			spanGaps: true,
			animations: false,
			showLine: true,
			pointRadius: 0,
		};

		return createDataset ? createDataset(e, index, allLabels) : datasetBaseConfig;
	});

	const updatedLabels = response
		.map((e) => e.map((e) => e.first))
		.reduce((a, b) => [...a, ...b], [])[0];

	const updatedData = {
		datasets: updatedDataSet,
		labels: updatedLabels,
	};

	return {
		data: updatedData,
		isWarning: isWarningLimit && (updatedDataSet?.length || 0) > limit,
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
