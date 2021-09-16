import { ChartData } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import { Widgets } from 'types/api/dashboard/getAll';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';

const getChartData = ({ queryData, query }: GetChartDataProps): ChartData => {
	const chartData = queryData.data.map((e, index) => {
		const { values = [], metric } = e || {};

		const labelNames = getLabelName(metric, (query[index] || {}).query);

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

	const chartDataSet: ChartData = {
		labels: (chartData[0] || {}).first || '',
		datasets: chartData.map((e) => ({
			label: e.label,
			data: e.second,
			borderColor: e.borderColor,
			pointRadius: 0,
			spanGaps: true,
			animations: false,
		})),
	};

	return chartDataSet;
};

interface GetChartDataProps {
	queryData: Widgets['queryData'];
	query: Widgets['query'];
}

export default getChartData;
