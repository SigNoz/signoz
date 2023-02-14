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
	const itemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];

	return getQueryBuilderQueries({
		metricName,
		groupBy,
		legend,
		itemsA,
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
	const legendFormula = 'Average Duration';
	const legend = '';
	const disabled = true;
	const additionalItemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	const additionalItemsB = additionalItemsA;

	return getQueryBuilderQuerieswithFormula({
		metricNameA,
		metricNameB,
		additionalItemsA,
		additionalItemsB,
		legend,
		disabled,
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
