import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { KeyOperationTableHeader } from 'container/MetricsApplication/constant';
import { getQueryBuilderQuerieswithFormula } from 'container/MetricsApplication/MetricsPageQueries/MetricsPageQueriesFactory';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const serviceMetricsQuery = (
	topLevelOperation: [keyof ServiceDataProps, string[]],
): QueryBuilderData => {
	const p99AutoCompleteData: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_latency_bucket',
		type: null,
	};

	const errorRateAutoCompleteData: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_calls_total',
		type: null,
	};

	const operationPrSecondAutoCompleteData: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_calls_total',
		type: null,
	};

	const autocompleteData: BaseAutocompleteData[] = [
		p99AutoCompleteData,
		errorRateAutoCompleteData,
		errorRateAutoCompleteData,
		operationPrSecondAutoCompleteData,
	];

	const p99AdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [topLevelOperation[0].toString()],
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
			value: [...topLevelOperation[1]],
		},
	];

	const errorRateAdditionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [topLevelOperation[0].toString()],
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
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'operation',
				type: 'tag',
			},
			op: 'IN',
			value: ['FindDriverIDs', 'GetDriver'],
		},
	];

	const errorRateAdditionalItemsB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [topLevelOperation[0].toString()],
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
			value: ['FindDriverIDs', 'GetDriver'],
		},
	];

	const operationPrSecondAdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [topLevelOperation[0].toString()],
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
			value: [...topLevelOperation[1]],
		},
	];

	const additionalItems: TagFilterItem[][] = [
		p99AdditionalItems,
		errorRateAdditionalItemsA,
		errorRateAdditionalItemsB,
		operationPrSecondAdditionalItems,
	];

	const aggregateOperators = [
		MetricAggregateOperator.HIST_QUANTILE_99,
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
	];

	const disabled = [false, true, true, false];
	const legends = [
		KeyOperationTableHeader.P99,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.OPERATION_PR_SECOND,
	];

	const expressions = ['B*100/C'];

	const legendFormulas = ['Error Rate'];

	const groupBy: BaseAutocompleteData[] = [
		{
			dataType: 'string',
			isColumn: false,
			key: 'service_name',
			type: 'tag',
		},
	];

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		disabled,
		legends,
		aggregateOperators,
		expressions,
		legendFormulas,
		groupBy,
		dataSource: DataSource.METRICS,
	});
};
