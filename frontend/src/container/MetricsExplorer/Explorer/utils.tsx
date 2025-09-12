import { MetricDetails } from 'api/metricsExplorer/getMetricDetails';
import { useGetMultipleMetrics } from 'hooks/metricsExplorer/useGetMultipleMetrics';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const splitQueryIntoOneChartPerQuery = (query: Query): Query[] => {
	const queries: Query[] = [];

	query.builder.queryData.forEach((currentQuery) => {
		const newQuery = {
			...query,
			id: uuid(),
			builder: {
				...query.builder,
				queryData: [currentQuery],
				queryFormulas: [],
			},
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

export function useGetMetricUnits(
	metricNames: string[],
	isEnabled = true,
): {
	isLoading: boolean;
	units: string[];
	isError: boolean;
	metrics: (MetricDetails | undefined)[];
} {
	const metricsData = useGetMultipleMetrics(metricNames, {
		enabled: metricNames.length > 0 && isEnabled,
	});
	return {
		isLoading: metricsData.some((metric) => metric.isLoading),
		units: metricsData.map(
			(metric) => metric.data?.payload?.data?.metadata?.unit ?? '',
		),
		metrics: metricsData.map((metric) => metric.data?.payload?.data),
		isError: metricsData.some((metric) => metric.isError),
	};
}
