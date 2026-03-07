import { UpdateMetricMetadataMutationBody } from 'api/generated/services/metrics';
import { MetricsexplorertypesMetricMetadataDTO } from 'api/generated/services/sigNoz.schemas';
import { mapMetricUnitToUniversalUnit } from 'components/YAxisUnitSelector/utils';
import { useGetMultipleMetrics } from 'hooks/metricsExplorer/useGetMultipleMetrics';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { determineIsMonotonic } from '../MetricDetails/utils';

/**
 * Split a query with multiple queryData to multiple distinct queries, each with a single queryData.
 * @param query - The query to split
 * @param units - The units of the metrics, can be undefined if the metric has no unit
 * @returns The split queries
 */
export const splitQueryIntoOneChartPerQuery = (
	query: Query,
	metricNames: string[],
	units: (string | undefined)[],
): Query[] => {
	const queries: Query[] = [];

	query.builder.queryData.forEach((currentQuery) => {
		if (currentQuery.aggregateAttribute?.key) {
			const metricIndex = metricNames.indexOf(
				currentQuery.aggregateAttribute?.key,
			);
			const unit = metricIndex >= 0 ? units[metricIndex] : undefined;
			const newQuery = {
				...query,
				id: uuid(),
				builder: {
					...query.builder,
					queryData: [currentQuery],
					queryFormulas: [],
				},
				unit,
			};
			queries.push(newQuery);
		}
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
	metrics: (MetricsexplorertypesMetricMetadataDTO | undefined)[];
} {
	const metricsData = useGetMultipleMetrics(metricNames, {
		enabled: metricNames.length > 0 && isEnabled,
	});
	return {
		isLoading: metricsData.some((metric) => metric.isLoading),
		metrics: metricsData.map((metric) => metric.data?.data),
		isError: metricsData.some((metric) => metric.isError),
	};
}

/**
 * To get the units of the metrics in the universal unit standard.
 * If the unit is not known to the universal unit mapper, it will return the unit as is.
 * @param metrics - The metrics to get the units for
 * @returns The units of the metrics, can be undefined if the metric has no unit
 */
export function getMetricUnits(
	metrics: (MetricsexplorertypesMetricMetadataDTO | undefined)[],
): (string | undefined)[] {
	return metrics
		.map((metric) => metric?.unit)
		.map((unit) => mapMetricUnitToUniversalUnit(unit) || undefined);
}

export function buildUpdateMetricYAxisUnitPayload(
	metricName: string,
	metric: MetricsexplorertypesMetricMetadataDTO,
	yAxisUnit: string,
): UpdateMetricMetadataMutationBody {
	return {
		metricName,
		type: metric.type,
		description: metric.description,
		unit: yAxisUnit || '',
		temporality: metric.temporality,
		isMonotonic: determineIsMonotonic(metric?.type, metric?.temporality),
	};
}
