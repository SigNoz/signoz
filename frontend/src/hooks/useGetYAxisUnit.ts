import { useEffect, useMemo, useState } from 'react';
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
	const [yAxisUnit, setYAxisUnit] = useState<string | undefined>();

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

	useEffect(() => {
		// If there are no metrics, set the y-axis unit to undefined
		if (units.length === 0) {
			setYAxisUnit(undefined);
			// If there is one metric and it has a non-empty unit, set the y-axis unit to it
		} else if (units.length === 1 && units[0] !== '') {
			setYAxisUnit(units[0]);
			// If all metrics have the same non-empty unit, set the y-axis unit to it
		} else if (areAllMetricUnitsSame) {
			if (units[0] !== '') {
				setYAxisUnit(units[0]);
			} else {
				setYAxisUnit(undefined);
			}
			// If there is more than one metric and they have different units, set the y-axis unit to undefined
		} else if (units.length > 1 && !areAllMetricUnitsSame) {
			setYAxisUnit(undefined);
			// If there is one metric and it has an empty unit, set the y-axis unit to undefined
		} else if (units.length === 1 && units[0] === '') {
			setYAxisUnit(undefined);
		}
	}, [units, areAllMetricUnitsSame]);

	return { yAxisUnit, isLoading, isError };
}

export default useGetYAxisUnit;
