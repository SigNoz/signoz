import { useGetMultipleMetrics } from 'hooks/metricsExplorer/useGetMultipleMetrics';
import { MetricMetadata } from 'types/api/metricsExplorer/v2/getMetricMetadata';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

/**
 * Split a query with multiple queryData to multiple distinct queries, each with a single queryData.
 * @param query - The query to split
 * @param units - The units of the metrics, can be undefined if the metric has no unit
 * @returns The split queries
 */
export const splitQueryIntoOneChartPerQuery = (
	query: Query,
	units: (string | undefined)[],
): Query[] => {
	const queries: Query[] = [];

	query.builder.queryData.forEach((currentQuery, index) => {
		const newQuery = {
			...query,
			id: uuid(),
			builder: {
				...query.builder,
				queryData: [currentQuery],
				queryFormulas: [],
			},
			unit: units[index],
		};
		queries.push(newQuery);
	});

	query.builder.queryFormulas.forEach((currentFormula) => {
		const newQuery = {
			...query,
			id: uuid(),
			builder: {
				...query.builder,
				queryFormulas: [currentFormula],
				queryData: query.builder.queryData.map((currentQuery) => ({
					...currentQuery,
					disabled: true,
				})),
			},
		};
		queries.push(newQuery);
	});

	return queries;
};

/**
 * Hook to get data for multiple metrics with a synchronous loading and error state
 * @param metricNames - The names of the metrics to get
 * @param isEnabled - Whether the hook is enabled
 * @returns The loading state, the metrics data, and the error state
 */
export function useGetMetrics(
	metricNames: string[],
	isEnabled = true,
): {
	isLoading: boolean;
	isError: boolean;
	metrics: (MetricMetadata | undefined)[];
} {
	const metricsData = useGetMultipleMetrics(metricNames, {
		enabled: metricNames.length > 0 && isEnabled,
	});
	return {
		isLoading: metricsData.some((metric) => metric.isLoading),
		metrics: metricsData
			.map((metric) => metric.data?.data)
			.map((data) => data?.data),
		isError: metricsData.some((metric) => metric.isError),
	};
}
