import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { SpaceAggregation, TimeAggregation } from 'api/v5/v5';
import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export function formatTimestampToReadableDate(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return 'Few seconds ago';

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60)
		return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24)
		return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays === 1) {
		return `Yesterday at ${date
			.getHours()
			.toString()
			.padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
	}
	if (diffInDays < 7) return `${diffInDays} days ago`;

	return date.toLocaleDateString();
}

export function formatNumberToCompactFormat(num: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(num);
}

export function determineIsMonotonic(
	metricType: MetricType,
	temporality?: Temporality,
): boolean {
	if (
		metricType === MetricType.HISTOGRAM ||
		metricType === MetricType.EXPONENTIAL_HISTOGRAM
	) {
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
	metricType: MetricType | undefined,
	filter?: { key: string; value: string },
	groupBy?: string,
): Query {
	let timeAggregation;
	let spaceAggregation;
	let aggregateOperator;
	switch (metricType) {
		case MetricType.SUM:
			timeAggregation = 'rate';
			spaceAggregation = 'sum';
			aggregateOperator = 'rate';
			break;
		case MetricType.GAUGE:
			timeAggregation = 'avg';
			spaceAggregation = 'avg';
			aggregateOperator = 'avg';
			break;
		case MetricType.SUMMARY:
			timeAggregation = 'noop';
			spaceAggregation = 'sum';
			aggregateOperator = 'noop';
			break;
		case MetricType.HISTOGRAM:
		case MetricType.EXPONENTIAL_HISTOGRAM:
			timeAggregation = 'noop';
			spaceAggregation = 'p90';
			aggregateOperator = 'noop';
			break;
		default:
			timeAggregation = 'noop';
			spaceAggregation = 'noop';
			aggregateOperator = 'noop';
			break;
	}

	return {
		...initialQueriesMap[DataSource.METRICS],
		builder: {
			queryData: [
				{
					...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
					aggregateAttribute: {
						key: metricName,
						type: metricType ?? '',
						id: `${metricName}----${metricType}---string--`,
						dataType: DataTypes.String,
					},
					aggregations: [
						{
							metricName,
							timeAggregation: timeAggregation as TimeAggregation,
							spaceAggregation: spaceAggregation as SpaceAggregation,
							reduceTo: 'avg',
							temporality: '',
						},
					],
					aggregateOperator,
					timeAggregation,
					spaceAggregation,
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
					groupBy: groupBy
						? [
								{
									key: groupBy,
									dataType: DataTypes.String,
									type: 'tag',
									id: `${groupBy}--string--tag--false`,
								},
						  ]
						: [],
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
	};
}
