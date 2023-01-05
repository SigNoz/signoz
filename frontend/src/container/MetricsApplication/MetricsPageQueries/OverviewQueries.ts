import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import {
	getQueryBuilderQueriesOperation,
	getQueryBuilderQueriesOperationWithFormula,
} from './MetricsPageQueriesFactory';

export const operationPerSec = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricName = 'signoz_latency_count';
	const legend = 'Operations';
	return getQueryBuilderQueriesOperation({
		servicename,
		legend,
		tagFilterItems,
		metricName,
		topLevelOperations,
	});
};

export const errorPercentage = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricNameA = 'signoz_calls_total';
	const metricNameB = 'signoz_calls_total';
	const additionalItems = {
		id: '',
		key: 'status_code',
		op: 'IN',
		value: ['STATUS_CODE_ERROR'],
	};

	const legendFormula = 'Error Percentage';
	const legend = legendFormula;
	const expression = 'A*100/B';
	const disabled = true;
	return getQueryBuilderQueriesOperationWithFormula({
		metricNameA,
		metricNameB,
		additionalItems,
		servicename,
		legend,
		disabled,
		tagFilterItems,
		expression,
		legendFormula,
		topLevelOperations,
	});
};

export interface OperationPerSecProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[];
	topLevelOperations: string[];
}
