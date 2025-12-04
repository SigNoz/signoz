import { useGetMetricUnits } from 'container/MetricsExplorer/Explorer/utils';
import { useEffect, useMemo, useState } from 'react';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { useQueryBuilder } from './queryBuilder/useQueryBuilder';

interface UseGetYAxisUnitResult {
	yAxisUnit: string | undefined;
	isLoading: boolean;
	isError: boolean;
}

function useGetYAxisUnit(selectedQueryName?: string): UseGetYAxisUnitResult {
	const { currentQuery } = useQueryBuilder();
	const [yAxisUnit, setYAxisUnit] = useState<string | undefined>();

	const metricNames: string[] | null = useMemo(() => {
		if (currentQuery?.queryType !== EQueryType.QUERY_BUILDER) {
			return null;
		}
		const dataSource = currentQuery?.builder?.queryData?.[0]?.dataSource;
		if (dataSource !== DataSource.METRICS) {
			return null;
		}
		// If a selected query name is provided, return the metric name for that query only
		if (selectedQueryName) {
			return [
				currentQuery?.builder?.queryData?.find(
					(query) => query.queryName === selectedQueryName,
				)?.aggregateAttribute?.key ?? '',
			];
		}
		return currentQuery?.builder?.queryData?.map(
			(query) => query.aggregateAttribute?.key ?? '',
		);
	}, [
		selectedQueryName,
		currentQuery?.builder?.queryData,
		currentQuery?.queryType,
	]);

	const { units, isLoading, isError } = useGetMetricUnits(
		metricNames ?? [],
		!!metricNames,
	);

	const areAllMetricUnitsSame = useMemo(
		() => units.every((unit) => unit === units[0]),
		[units],
	);

	useEffect(() => {
		if (units.length === 0) {
			setYAxisUnit(undefined);
		} else if (units.length === 1 && units[0] !== '') {
			setYAxisUnit(units[0]);
		} else if (areAllMetricUnitsSame) {
			if (units[0] !== '') {
				setYAxisUnit(units[0]);
			} else {
				setYAxisUnit(undefined);
			}
		} else if (units.length > 1 && !areAllMetricUnitsSame) {
			setYAxisUnit(undefined);
		}
	}, [units, areAllMetricUnitsSame]);

	return { yAxisUnit, isLoading, isError };
}

export default useGetYAxisUnit;
