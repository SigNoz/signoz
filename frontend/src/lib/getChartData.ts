import { ChartData } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { Widgets } from 'types/api/dashboard/getAll';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

const getChartData = ({ queryData }: GetChartDataProps): ChartData => {
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
		({ queryData, query: queryG, legend: legendG }) => {
			return queryData.map((e) => {
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
					const data = dataValue.find((e1) => {
						return e1.first.getTime() === td1.getTime();
					});
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
			});
		},
	);
	const allLabels = response
		.map((e) => e.map((e) => e.label))
		.reduce((a, b) => [...a, ...b], []);

	const alldata = response
		.map((e) => e.map((e) => e.second))
		.reduce((a, b) => [...a, ...b], []);

	return {
		datasets: alldata.map((e, index) => {
			return {
				data: e,
				label: allLabels[index],
				borderWidth: 1.5,
				spanGaps: true,
				animations: false,
				borderColor: colors[index % colors.length] || 'red',
				showLine: true,
				pointRadius: 0,
			};
		}),
		labels: response
			.map((e) => e.map((e) => e.first))
			.reduce((a, b) => [...a, ...b], [])[0],
	};
};

interface GetChartDataProps {
	queryData: Widgets['queryData']['data'][];
}

export default getChartData;
