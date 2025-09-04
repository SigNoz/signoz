import { SelectProps } from 'antd';
import { useGetMetricUnits } from 'container/MetricsExplorer/Explorer/utils';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import getStep from 'lib/getStep';
import { useMemo } from 'react';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

// toChartInterval converts eval window to chart selection time interval
export const toChartInterval = (evalWindow: string | undefined): Time => {
	switch (evalWindow) {
		case '1m0s':
			return '1m';
		case '5m0s':
			return '5m';
		case '10m0s':
			return '10m';
		case '15m0s':
			return '15m';
		case '30m0s':
			return '30m';
		case '1h0m0s':
			return '1h';
		case '3h0m0s':
			return '3h';
		case '4h0m0s':
			return '4h';
		case '6h0m0s':
			return '6h';
		case '12h0m0s':
			return '12h';
		case '24h0m0s':
			return '1d';
		default:
			return '5m';
	}
};

export const getUpdatedStepInterval = (evalWindow?: string): number => {
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: toChartInterval(evalWindow),
	});
	return getStep({
		start,
		end,
		inputFormat: 'ns',
	});
};

export const getSelectedQueryOptions = (
	queries: Array<
		IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery
	>,
): SelectProps['options'] =>
	queries
		.filter((query) => !query.disabled)
		.map((query) => ({
			label: 'queryName' in query ? query.queryName : query.name,
			value: 'queryName' in query ? query.queryName : query.name,
		}));

export const useGetYAxisUnitFromQuery = (
	query: Query | null,
): string | null => {
	const metricNames = useMemo(() => {
		if (!query) {
			return [];
		}
		return query.builder.queryData.map(
			(query) => query.aggregateAttribute?.key ?? '',
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(query)]);

	const { units } = useGetMetricUnits(
		metricNames,
		query?.builder.queryData[0].dataSource === DataSource.METRICS,
	);

	return useMemo(() => {
		if (!query || units.length === 0) {
			return null;
		}
		const areAllUnitsSame = units.every((unit) => unit === units[0]);
		if (areAllUnitsSame) {
			return units[0];
		}
		return null;
	}, [query, units]);
};
