import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const operationPerSec = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): IOverviewQueries => {
	const metricName = 'signoz_latency_count';
	const legend = 'Operations';
	const itemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: 'operation',
			op: 'IN',
			value: topLevelOperations,
		},
		...tagFilterItems,
	];

	return getQueryBuilderQueries({
		metricName,
		legend,
		itemsA,
	});
};

export const errorPercentage = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): IOverviewQueries => {
	const metricNameA = 'signoz_calls_total';
	const metricNameB = 'signoz_calls_total';
	const additionalItemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: 'operation',
			op: 'IN',
			value: topLevelOperations,
		},
		{
			id: '',
			key: 'status_code',
			op: 'IN',
			value: ['STATUS_CODE_ERROR'],
		},
		...tagFilterItems,
	];

	const additionalItemsB = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: 'operation',
			op: 'IN',
			value: topLevelOperations,
		},
		...tagFilterItems,
	];

	const legendFormula = 'Error Percentage';
	const legend = legendFormula;
	const expression = 'A*100/B';
	const disabled = true;
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

export interface OperationPerSecProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[];
	topLevelOperations: string[];
}

interface IOverviewQueries {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
}
