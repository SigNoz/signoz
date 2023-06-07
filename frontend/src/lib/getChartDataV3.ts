import { ChartData } from 'chart.js';
import getLabelName from 'lib/getLabelName';
import isEmpty from 'lodash-es/isEmpty';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import convertIntoEpoc from './covertIntoEpoc';
import { colors } from './getRandomColor';
import { mapQueryDataToApi } from './newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';

const getChartDataV3 = (
	queryResponse: QueryDataV3[],
	currentQuery: Query,
): ChartData => {
	let legendMap: Record<string, string> = {};

	const { queryData: data, queryFormulas } = currentQuery.builder;
	const currentQueryData = mapQueryDataToApi(data, 'queryName');
	const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

	legendMap = {
		...currentQueryData.newLegendMap,
		...currentFormulas.newLegendMap,
	};

	const uniqueTimeLabels = new Set<number>();

	queryResponse.forEach(({ series }) => {
		series.forEach(({ values }) => {
			values.forEach(({ timestamp }) => {
				uniqueTimeLabels.add(timestamp / 1000);
			});
		});
	});

	const labels = Array.from(uniqueTimeLabels).sort((a, b) => a - b);

	const transformedResponse = queryResponse.map(({ series, queryName }) =>
		series.map(({ labels: serieLabels, values }) => {
			const seriesLabels = { ...serieLabels };

			let legend = legendMap[queryName]; // Adds the legend if it is already defined by the user.
			// If metric names is an empty object
			if (isEmpty(seriesLabels)) {
				// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
				if (!legend) {
					legend = queryName;
				}
				// If name of the query and the legend if inserted is same then add the same to the metrics object.
				if (queryName === legend) {
					seriesLabels[queryName] = queryName;
				}
			}

			const labelNames = getLabelName(
				seriesLabels,
				queryName || '', // query
				legend || '',
			);

			const dataValue = values.map(({ timestamp, value }) => ({
				first: new Date(parseInt(convertIntoEpoc(timestamp), 10)), // converting in ms
				second: Number(parseFloat(value)),
			}));

			const filledDataValues = labels.map((e) => {
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

	const allLabels = transformedResponse
		.map((e) => e.map((e) => e.label))
		.reduce((a, b) => [...a, ...b], []);

	const allData = transformedResponse
		.map((e) => e.map((e) => e.second))
		.reduce((a, b) => [...a, ...b], []);

	return {
		datasets: allData.map((e, index) => ({
			data: e,
			label: allLabels[index],
			borderWidth: 1.5,
			spanGaps: true,
			animations: false,
			borderColor: colors[index % colors.length] || 'red',
			showLine: true,
			pointRadius: 0,
		})),
		labels: transformedResponse
			.map((e) => e.map((e) => e.first))
			.reduce((a, b) => [...a, ...b], [])[0],
	};
};

export default getChartDataV3;
