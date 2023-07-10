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
					first: filledDataValues.map((e) => e.first),
					second: filledDataValues.map((e) => e.second),
				};
			}),
	);
	const allLabels = response
		.map((e) => e.map((e) => e.label))
		.reduce((a, b) => [...a, ...b], []);

	const alldata = response
		.map((e) => e.map((e) => e.second))
		.reduce((a, b) => [...a, ...b], []);

	return {
		datasets: alldata.map((e, index) => {
			const datasetBaseConfig = {
				label: allLabels[index],
				borderColor: colors[index % colors.length] || 'red',
				data: e,
				borderWidth: 1.5,
				spanGaps: true,
				animations: false,
				showLine: true,
				pointRadius: 0,
			};

			return createDataset
				? createDataset(e, index, allLabels)
				: datasetBaseConfig;
		}),
		labels: response
			.map((e) => e.map((e) => e.first))
			.reduce((a, b) => [...a, ...b], [])[0],
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
