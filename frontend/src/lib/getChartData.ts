import { ChartData } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { Widgets } from 'types/api/dashboard/getAll';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

const getChartData = ({ queryData }: GetChartDataProps): ChartData => {
	const response = queryData.data.map(({ query, queryData, legend }) => {
		return queryData.map((e, index) => {
			const { values = [], metric } = e || {};
			const labelNames = getLabelName(
				metric,
				query, //query
				legend || '', // legends
			);

			const dataValue = values?.map((e) => {
				const [first = 0, second = ''] = e || [];
				return {
					first: new Date(parseInt(convertIntoEpoc(first), 10)),
					second: Number(parseFloat(second).toFixed(2)),
				};
			});

			const color = colors[index] || 'red';
			return {
				label: labelNames,
				first: dataValue.map((e) => e.first),
				borderColor: color,
				second: dataValue.map((e) => e.second),
			};
		});
	});

	const allLabels = response
		.map((e) => e.map((e) => e.label))
		.reduce((a, b) => [...a, ...b], []);

	const allColor = response
		.map((e) => e.map((e) => e.borderColor))
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
				borderColor: allColor[index],
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
	queryData: Widgets['queryData'];
}

export default getChartData;
