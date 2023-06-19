import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const operationPerSec = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): QueryBuilderData => {
	const metricName: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_latency_count',
		type: null,
	};
	const legend = 'Operations';

	const itemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'operation',
				type: 'tag',
			},
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
}: OperationPerSecProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_calls_total',
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_calls_total',
		type: null,
	};
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'operation',
				type: 'tag',
			},
			op: 'IN',
			value: topLevelOperations,
		},
		{
			id: '',
			key: {
				dataType: 'int64',
				isColumn: false,
				key: 'status_code',
				type: 'tag',
			},
			op: 'IN',
			value: ['STATUS_CODE_ERROR'],
		},
		...tagFilterItems,
	];

	const additionalItemsB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'operation',
				type: 'tag',
			},
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
	tagFilterItems: TagFilterItem[];
	topLevelOperations: string[];
}
