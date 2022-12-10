import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const databaseCallsRPS = ({
	servicename,
	legend,
	tagFilterItems,
}: DatabaseCallsRPSProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricName = 'signoz_db_latency_count';
	const groupBy = ['db_system'];

	return getQueryBuilderQueries({
		metricName,
		legend,
		groupBy,
		servicename,
		tagFilterItems,
	});
};

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DatabaseCallProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricNameA = 'signoz_db_latency_sum';
	const metricNameB = 'signoz_db_latency_count';
	const expression = 'A/B';
	const legendFormula = '';
	const legend = '';
	const disabled = true;

	return getQueryBuilderQuerieswithFormula({
		servicename,
		legend,
		disabled,
		tagFilterItems,
		metricNameA,
		metricNameB,
		expression,
		legendFormula,
	});
};

interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: '{{db_system}}';
}

interface DatabaseCallProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[] | [];
}
