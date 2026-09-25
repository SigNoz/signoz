import { useMemo } from 'react';
import {
	getMetricUnits,
	useGetMetrics,
} from 'container/MetricsExplorer/Explorer/utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

interface UseGetYAxisUnitResult {
	yAxisUnit: string | undefined;
	isLoading: boolean;
	isError: boolean;
}

export function getMetricNameFromQueryData(
	queryData: IBuilderQuery,
): string | null {
	if (queryData.dataSource !== DataSource.METRICS) {
		return null;
	}
	if (queryData.aggregateAttribute?.key) {
		return queryData.aggregateAttribute?.key;
	}
	if (queryData.aggregations?.length && queryData.aggregations.length > 0) {
		return (queryData.aggregations?.[0] as MetricAggregation)?.metricName;
	}
	return null;
}

/**
 * Hook to get the y-axis unit for a given metrics-based query.
 * @param selectedQueryName - The name of the query to get the y-axis unit for.
 * @param params.enabled - Active state of the hook.
 * @returns `{ yAxisUnit, isLoading, isError }` The y-axis unit, loading state, and error state
 */
function useGetYAxisUnit(
	selectedQueryName?: string,
	params: {
		enabled?: boolean;
	} = {
		enabled: true,
	},
): UseGetYAxisUnitResult {
	const { stagedQuery } = useQueryBuilder();

	const metricNames: string[] | null = useMemo(() => {
		// If the query type is not QUERY_BUILDER, return null
		if (stagedQuery?.queryType !== EQueryType.QUERY_BUILDER) {
			return null;
		}
		// If the data source is not METRICS, return null
		const dataSource = stagedQuery?.builder?.queryData?.[0]?.dataSource;
		if (dataSource !== DataSource.METRICS) {
			return null;
		}
		const currentMetricNames: string[] = [];
		// If a selected query name is provided, return the metric name for that query only
		if (selectedQueryName) {
			stagedQuery?.builder?.queryData?.forEach((query) => {
				const metricName = getMetricNameFromQueryData(query);
				if (query.queryName === selectedQueryName && metricName) {
					currentMetricNames.push(metricName);
				}
			});
			return currentMetricNames.length ? currentMetricNames : null;
		}
		// Else, return all metric names
		stagedQuery?.builder?.queryData?.forEach((query) => {
			const metricName = getMetricNameFromQueryData(query);
			if (metricName) {
				currentMetricNames.push(metricName);
			}
		});
		return currentMetricNames.length ? currentMetricNames : null;
	}, [
		selectedQueryName,
		stagedQuery?.builder?.queryData,
		stagedQuery?.queryType,
	]);

	const { metrics, isLoading, isError } = useGetMetrics(
		metricNames ?? [],
		!!metricNames && params?.enabled,
	);

	const units = useMemo(() => getMetricUnits(metrics), [metrics]);

	const areAllMetricUnitsSame = useMemo(
		() => units.every((unit) => unit === units[0]),
		[units],
	);

	// Derived, not stored: `useGetMetrics` rebuilds its array on every render, so a
	// state-and-effect version schedules an update after every render — the shape
	// React reports as "Maximum update depth exceeded".
	const yAxisUnit = useMemo(() => {
		// A single shared unit is the only thing a single axis can carry; metrics that
		// disagree, or that carry no unit at all, leave the axis unitless.
		if (units.length === 0 || !areAllMetricUnitsSame) {
			return undefined;
		}
		return units[0] || undefined;
	}, [units, areAllMetricUnitsSame]);

	return { yAxisUnit, isLoading, isError };
}

export default useGetYAxisUnit;
