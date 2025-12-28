import {
	getMetricUnits,
	useGetMetrics,
} from 'container/MetricsExplorer/Explorer/utils';
import { useEffect, useMemo, useState } from 'react';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

interface UseGetYAxisUnitResult {
	yAxisUnit: string | undefined;
	isLoading: boolean;
	isError: boolean;
}

/**
 * Hook to get the y-axis unit for a given metrics-based query.
 * @param selectedQueryName
 * @returns `{ yAxisUnit, isLoading, isError }` The y-axis unit, loading state, and error state
 */
function useGetYAxisUnit(selectedQueryName?: string): UseGetYAxisUnitResult {
	const { currentQuery } = useQueryBuilder();
	const [yAxisUnit, setYAxisUnit] = useState<string | undefined>();

	const metricNames: string[] | null = useMemo(() => {
		// If the query type is not QUERY_BUILDER, return null
		if (currentQuery?.queryType !== EQueryType.QUERY_BUILDER) {
			return null;
		}
		// If the data source is not METRICS, return null
		const dataSource = currentQuery?.builder?.queryData?.[0]?.dataSource;
		if (dataSource !== DataSource.METRICS) {
			return null;
		}
		const currentMetricNames: string[] = [];
		// If a selected query name is provided, return the metric name for that query only
		if (selectedQueryName) {
			currentQuery?.builder?.queryData?.forEach((query) => {
				if (
					query.queryName === selectedQueryName &&
					query.aggregateAttribute?.key
				) {
					currentMetricNames.push(query.aggregateAttribute?.key);
				}
			});
			return currentMetricNames.length ? currentMetricNames : null;
		}
		// Else, return all metric names
		currentQuery?.builder?.queryData?.forEach((query) => {
			if (query.aggregateAttribute?.key) {
				currentMetricNames.push(query.aggregateAttribute?.key);
			}
		});
		return currentMetricNames.length ? currentMetricNames : null;
	}, [
		selectedQueryName,
		currentQuery?.builder?.queryData,
		currentQuery?.queryType,
	]);

	const { metrics, isLoading, isError } = useGetMetrics(
		metricNames ?? [],
		!!metricNames,
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
