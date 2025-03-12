import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export function formatTimestampToReadableDate(timestamp: string): string {
	const date = new Date(timestamp);
	// Extracting date components
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
	const year = String(date.getFullYear()).slice(-2); // Get last two digits of year

	// Extracting time components
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');

	return `${day}.${month}.${year} ⎯ ${hours}:${minutes}:${seconds}`;
}

export function formatNumberToCompactFormat(num: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(num);
}

export function determineIsMonotonic(
	metricType: MetricType,
	temporality: Temporality,
): boolean {
	if (metricType === MetricType.HISTOGRAM) {
		return true;
	}
	if (metricType === MetricType.GAUGE || metricType === MetricType.SUMMARY) {
		return false;
	}
	if (metricType === MetricType.SUM) {
		return temporality === Temporality.CUMULATIVE;
	}
	return false;
}

export function getMetricDetailsQuery(
	metricName: string,
	filter?: { key: string; value: string },
): Query {
	return {
		...initialQueriesMap[DataSource.METRICS],
		builder: {
			queryData: [
				{
					...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
					aggregateAttribute: {
						key: metricName,
						type: DataTypes.String,
						id: `${metricName}----string--`,
					},
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					filters: {
						op: 'AND',
						items: filter
							? [
									{
										op: '=',
										id: filter.key,
										value: filter.value,
										key: {
											key: filter.key,
											type: DataTypes.String,
										},
									},
							  ]
							: [],
					},
				},
			],
			queryFormulas: [],
		},
	};
}
